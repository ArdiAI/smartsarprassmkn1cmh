import { useEffect, useState, useCallback } from 'react';
import {
  Search, CheckCircle2, XCircle, Loader2, Package, Calendar, User, Mail, Phone, FileText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getWorkflowSteps, type WorkflowStep } from '../../lib/workflow';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string | null;
  item_name: string | null;
  quantity: number;
  status: string;
  current_status_label: string | null;
  workflow_template_id: string | null;
  current_step: number | null;
  assigned_approver_name: string | null;
  assigned_approver_role: string | null;
  created_at: string;
  updated_at: string | null;
}

interface Borrowing {
  id: string;
  inventory_id: string | null;
  facility_id: string | null;
  borrower_name: string | null;
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrowed_units: number | null;
  borrow_date: string | null;
  return_date: string | null;
  actual_return_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  item_type: string | null;
  purpose: string | null;
  admin_notes: string | null;
  start_time: string | null;
  end_time: string | null;
  document_url: string | null;
  document_name: string | null;
  approved_by: string | null;
  approver_position: string | null;
  approved_at: string | null;
  workflow_template_id: string | null;
  current_step: number | null;
  current_status_label: string | null;
  borrowing_items: BorrowingItem[];
}

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'returned'];

export default function BorrowingsAdminPage() {
  const { hasPermission, adminProfile } = useAuth();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actingId, setActingId] = useState<string | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [stepCache, setStepCache] = useState<Record<string, WorkflowStep[]>>({});

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('borrowings')
      .select('*, borrowing_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data peminjaman', 'error');
      setBorrowings([]);
    } else {
      setBorrowings((data ?? []) as unknown as Borrowing[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  useEffect(() => {
    if (!adminProfile) return;
    (async () => {
      const { data } = await supabase
        .from('admin_user_roles')
        .select('role_id')
        .eq('admin_user_id', adminProfile.id);
      setUserRoleIds(((data ?? []) as unknown as { role_id: string }[]).map((r) => r.role_id));
    })();
  }, [adminProfile]);

  useEffect(() => {
    const templateIds = [...new Set(borrowings.map((b) => b.workflow_template_id).filter(Boolean))] as string[];
    templateIds.forEach(async (tid) => {
      if (!stepCache[tid]) {
        const steps = await getWorkflowSteps(tid);
        setStepCache((prev) => ({ ...prev, [tid]: steps }));
      }
    });
  }, [borrowings, stepCache]);

  const canApproveBorrowing = (b: Borrowing): boolean => {
    if (b.status !== 'pending') return false;
    if (!b.workflow_template_id || b.current_step == null) return true; // no workflow → any approver
    const steps = stepCache[b.workflow_template_id];
    if (!steps || steps.length === 0) return true;
    const currentStep = steps.find((s) => s.step_order === b.current_step);
    if (!currentStep || !currentStep.role_id) return true;
    return userRoleIds.includes(currentStep.role_id);
  };

  const hasUserAlreadyActed = (b: Borrowing): boolean => {
    if (!b.borrowing_items || b.borrowing_items.length === 0) return false;
    if (!b.workflow_template_id || b.current_step == null) return false;
    return b.borrowing_items.some(
      (item) => item.current_step === b.current_step && item.status !== 'pending',
    );
  };

  const handleApprove = async (b: Borrowing) => {
    setActingId(b.id);
    try {
      const steps = b.workflow_template_id ? stepCache[b.workflow_template_id] ?? [] : [];
      const currentStep = b.current_step != null ? steps.find((s) => s.step_order === b.current_step) : null;
      const nextStep = currentStep ? steps.find((s) => s.step_order === (currentStep.step_order + 1)) : null;
      const isFinalStep = !nextStep;
      const newStatus = isFinalStep ? 'approved' : 'pending';
      const newStep = nextStep ? nextStep.step_order : b.current_step;
      const newStatusLabel = nextStep ? nextStep.step_label : 'Disetujui';

      const { error: borrowErr } = await supabase
        .from('borrowings')
        .update({
          status: newStatus,
          current_step: newStep,
          current_status_label: newStatusLabel,
          approved_by: adminProfile?.name ?? null,
          approver_position: adminProfile?.role ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', b.id);

      if (borrowErr) throw borrowErr;

      if (b.borrowing_items && b.borrowing_items.length > 0) {
        const updates = b.borrowing_items.map((item) =>
          supabase
            .from('borrowing_items')
            .update({
              status: isFinalStep ? 'approved' : 'pending',
              current_step: newStep,
              current_status_label: newStatusLabel,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id),
        );
        await Promise.all(updates);
      }

      showToast('Peminjaman disetujui', 'success');
      await fetchBorrowings();
    } catch (e: any) {
      showToast('Gagal menyetujui peminjaman: ' + (e?.message ?? ''), 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (b: Borrowing) => {
    setActingId(b.id);
    try {
      const { error: borrowErr } = await supabase
        .from('borrowings')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
          approved_by: adminProfile?.name ?? null,
          approver_position: adminProfile?.role ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', b.id);

      if (borrowErr) throw borrowErr;

      if (b.borrowing_items && b.borrowing_items.length > 0) {
        await Promise.all(
          b.borrowing_items.map((item) =>
            supabase
              .from('borrowing_items')
              .update({ status: 'rejected', current_status_label: 'Ditolak', updated_at: new Date().toISOString() })
              .eq('id', item.id),
          ),
        );
      }

      showToast('Peminjaman ditolak', 'info');
      await fetchBorrowings();
    } catch (e: any) {
      showToast('Gagal menolak peminjaman: ' + (e?.message ?? ''), 'error');
    } finally {
      setActingId(null);
    }
  };

  const filtered = borrowings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const inName = b.borrower_name?.toLowerCase().includes(q) ?? false;
      const inPurpose = b.purpose?.toLowerCase().includes(q) ?? false;
      const inClass = b.borrower_class?.toLowerCase().includes(q) ?? false;
      if (!inName && !inPurpose && !inClass) return false;
    }
    return true;
  });

  const statusBadge = (s: string) => {
    switch (s) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'returned': return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kelola Peminjaman</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Setujui atau tolak permintaan peminjaman barang dan fasilitas.</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Cari nama, kelas, atau keperluan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                  statusFilter === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {s === 'all' ? 'Semua' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada peminjaman" description="Belum ada data peminjaman yang sesuai filter." />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const canApprove = canApproveBorrowing(b) && !hasUserAlreadyActed(b);
            const showApprove = canApprove && hasPermission('borrowings', 'approve');
            const showReject = canApprove && hasPermission('borrowings', 'reject');
            return (
              <div key={b.id} className="card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {b.purpose ?? b.borrower_name ?? 'Peminjaman'}
                      </h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(b.status)}`}>
                        {b.current_status_label ?? b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <span>{b.borrower_name ?? '-'}</span>
                        {b.borrower_class && <span className="text-slate-400">• {b.borrower_class}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{b.borrower_email ?? '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{b.borrower_phone ?? '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{b.borrow_date ?? '-'} → {b.return_date ?? '-'}</span>
                      </div>
                    </div>

                    {b.borrowing_items && b.borrowing_items.length > 0 && (
                      <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                          <Package className="h-3.5 w-3.5" /> Item Dipinjam
                        </p>
                        <div className="space-y-1">
                          {b.borrowing_items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700 dark:text-slate-200">
                                {item.item_name ?? item.item_type ?? '-'} (×{item.quantity})
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(item.status)}`}>
                                {item.current_status_label ?? item.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {b.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Catatan:</span> {b.notes}
                      </p>
                    )}
                    {b.document_name && (
                      <a
                        href={b.document_url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        <FileText className="h-4 w-4" /> {b.document_name}
                      </a>
                    )}
                    {b.approved_by && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Disetujui oleh: {b.approved_by} ({b.approver_position ?? '-'}) • {b.approved_at ? new Date(b.approved_at).toLocaleString('id-ID') : '-'}
                      </p>
                    )}
                  </div>

                  {(showApprove || showReject) && (
                    <div className="flex gap-2 lg:flex-col">
                      {showApprove && (
                        <button
                          onClick={() => handleApprove(b)}
                          disabled={actingId === b.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {actingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Setujui
                        </button>
                      )}
                      {showReject && (
                        <button
                          onClick={() => handleReject(b)}
                          disabled={actingId === b.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {actingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Tolak
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

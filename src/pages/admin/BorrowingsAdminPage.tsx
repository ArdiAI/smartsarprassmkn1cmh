import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardList,
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import EmptyState from '../../components/EmptyState';
import type { WorkflowStep } from '../../lib/workflow';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string;
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
  borrower_name: string;
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrowed_units: number | null;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: string;
  notes: string | null;
  item_type: string;
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

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'returned', 'borrowed'];

export default function BorrowingsAdminPage() {
  const { hasPermission, adminProfile } = useAuth();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [workflowStepsCache, setWorkflowStepsCache] = useState<Record<string, WorkflowStep[]>>({});

  const fetchUserRoleIds = useCallback(async () => {
    if (!adminProfile?.id) return;
    const { data } = await supabase
      .from('admin_user_roles')
      .select('role_id')
      .eq('admin_user_id', adminProfile.id);
    setUserRoleIds((data ?? []).map((r: any) => r.role_id));
  }, [adminProfile?.id]);

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('borrowings')
      .select('*, borrowing_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data peminjaman', 'error');
      setLoading(false);
      return;
    }
    setBorrowings((data as unknown as Borrowing[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBorrowings();
    fetchUserRoleIds();
  }, [fetchBorrowings, fetchUserRoleIds]);

  // Fetch workflow steps for all unique workflow_template_ids
  useEffect(() => {
    (async () => {
      const templateIds = Array.from(
        new Set(borrowings.map((b) => b.workflow_template_id).filter(Boolean) as string[])
      );
      const cache: Record<string, WorkflowStep[]> = { ...workflowStepsCache };
      for (const tid of templateIds) {
        if (cache[tid]) continue;
        const { data } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('workflow_template_id', tid)
          .order('step_order', { ascending: true });
        cache[tid] = (data as unknown as WorkflowStep[]) ?? [];
      }
      setWorkflowStepsCache(cache);
    })();
  }, [borrowings]);

  function canApprove(b: Borrowing): boolean {
    if (!b.workflow_template_id || b.current_step == null) return false;
    if (b.status !== 'pending') return false;
    const steps = workflowStepsCache[b.workflow_template_id];
    if (!steps) return false;
    const currentStep = steps.find((s) => s.step_order === b.current_step);
    if (!currentStep?.role_id) return false;
    if (!userRoleIds.includes(currentStep.role_id)) return false;
    // Check if user already acted on current step
    const itemsAtCurrentStep = b.borrowing_items.filter(
      (it) => it.current_step === b.current_step
    );
    if (itemsAtCurrentStep.length > 0 && itemsAtCurrentStep.every((it) => it.status !== 'pending')) {
      return false;
    }
    return true;
  }

  async function handleApprove(b: Borrowing) {
    if (!adminProfile) return;
    setActionLoading(b.id);
    try {
      const steps = b.workflow_template_id ? workflowStepsCache[b.workflow_template_id] : [];
      const currentStepIndex = steps.findIndex((s) => s.step_order === b.current_step);
      const isLastStep = currentStepIndex === steps.length - 1;
      const nextStep = !isLastStep && currentStepIndex >= 0 ? steps[currentStepIndex + 1] : null;

      const newStatus = isLastStep ? 'approved' : 'pending';
      const newStep = nextStep?.step_order ?? b.current_step;
      const newLabel = nextStep?.step_label ?? 'Disetujui';

      const { error: borrowErr } = await supabase
        .from('borrowings')
        .update({
          status: newStatus,
          current_step: newStep,
          current_status_label: newLabel,
          approved_by: adminProfile.id,
          approver_position: adminProfile.role,
          approved_at: new Date().toISOString(),
        })
        .eq('id', b.id);

      if (borrowErr) throw borrowErr;

      // Update borrowing_items
      await supabase
        .from('borrowing_items')
        .update({
          status: newStatus,
          current_status_label: newLabel,
          current_step: newStep,
          updated_at: new Date().toISOString(),
        })
        .eq('borrowing_id', b.id);

      showToast('Peminjaman disetujui', 'success');
      await fetchBorrowings();
    } catch {
      showToast('Gagal menyetujui peminjaman', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(b: Borrowing) {
    setActionLoading(b.id);
    try {
      const { error: borrowErr } = await supabase
        .from('borrowings')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
        })
        .eq('id', b.id);

      if (borrowErr) throw borrowErr;

      await supabase
        .from('borrowing_items')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
          updated_at: new Date().toISOString(),
        })
        .eq('borrowing_id', b.id);

      showToast('Peminjaman ditolak', 'warning');
      await fetchBorrowings();
    } catch {
      showToast('Gagal menolak peminjaman', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = useMemo(() => {
    return borrowings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.borrower_name?.toLowerCase().includes(q) ||
          b.borrower_email?.toLowerCase().includes(q) ||
          b.purpose?.toLowerCase().includes(q) ||
          b.item_type?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [borrowings, search, statusFilter]);

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      returned: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
      borrowed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    };
    return map[status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Peminjaman</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola dan setujui permintaan peminjaman barang dan fasilitas.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Cari nama, email, tujuan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Semua Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8 text-slate-400" />}
          title="Tidak ada peminjaman"
          description="Belum ada data peminjaman yang cocok dengan filter."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const showApprove = hasPermission('borrowings', 'approve') && canApprove(b);
            const showReject = hasPermission('borrowings', 'reject') && canApprove(b);
            return (
              <div key={b.id} className="card">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {b.borrower_name}
                      </h3>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusBadge(b.status))}>
                        {b.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {b.purpose ?? b.item_type ?? 'Peminjaman'}
                    </p>
                  </div>
                  {b.current_status_label && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Langkah Saat Ini</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{b.current_status_label}</p>
                    </div>
                  )}
                </div>

                {/* Info grid */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>{b.borrow_date} → {b.return_date}</span>
                  </div>
                  {b.borrower_email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{b.borrower_email}</span>
                    </div>
                  )}
                  {b.borrower_phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span>{b.borrower_phone}</span>
                    </div>
                  )}
                  {b.borrower_class && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <User className="h-4 w-4 text-slate-400" />
                      <span>{b.borrower_class}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                {b.borrowing_items.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Item:</p>
                    <div className="flex flex-wrap gap-2">
                      {b.borrowing_items.map((it) => (
                        <span
                          key={it.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {it.item_name ?? it.item_type}
                          <span className="text-slate-400">×{it.quantity}</span>
                          <span className={cn('rounded px-1.5 py-0.5', statusBadge(it.status))}>
                            {it.status}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {b.notes && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <span className="font-medium">Catatan: </span>{b.notes}
                  </div>
                )}

                {/* Document */}
                {b.document_url && (
                  <div className="mt-3">
                    <a
                      href={b.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
                    >
                      <FileText className="h-4 w-4" />
                      {b.document_name ?? 'Lampiran'}
                    </a>
                  </div>
                )}

                {/* Approver info */}
                {b.approved_by && b.approved_at && (
                  <div className="mt-3 text-xs text-slate-400">
                    Disetujui pada {new Date(b.approved_at).toLocaleDateString('id-ID')}
                    {b.approver_position ? ` oleh ${b.approver_position}` : ''}
                  </div>
                )}

                {/* Actions */}
                {(showApprove || showReject) && (
                  <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {showApprove && (
                      <button
                        onClick={() => handleApprove(b)}
                        disabled={actionLoading === b.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {actionLoading === b.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Setujui
                      </button>
                    )}
                    {showReject && (
                      <button
                        onClick={() => handleReject(b)}
                        disabled={actionLoading === b.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === b.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Tolak
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import { cn } from '../../utils/cn';
import type { WorkflowStep } from '../../lib/workflow';

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
  facility_id: string | null;
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

const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected', 'returned'];

export default function BorrowingsAdminPage() {
  const { hasPermission, adminProfile } = useAuth();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [stepCache, setStepCache] = useState<Record<string, WorkflowStep[]>>({});

  const fetchUserRoleIds = useCallback(async () => {
    if (!adminProfile) return;
    const { data } = await supabase
      .from('admin_user_roles')
      .select('role_id')
      .eq('admin_user_id', adminProfile.id);
    setUserRoleIds((data ?? []).map((r: any) => r.role_id as string));
  }, [adminProfile]);

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
      setBorrowings((data as unknown as Borrowing[]) ?? []);
    }
    setLoading(false);
  }, []);

  const fetchStepsFor = useCallback(async (templateId: string) => {
    if (stepCache[templateId]) return;
    const { data } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_template_id', templateId)
      .order('step_order', { ascending: true });
    const steps = (data as unknown as WorkflowStep[]) ?? [];
    setStepCache((prev) => ({ ...prev, [templateId]: steps }));
  }, []);

  useEffect(() => {
    fetchBorrowings();
    fetchUserRoleIds();
  }, [fetchBorrowings, fetchUserRoleIds]);

  useEffect(() => {
    borrowings.forEach((b) => {
      if (b.workflow_template_id) fetchStepsFor(b.workflow_template_id);
    });
  }, [borrowings, fetchStepsFor]);

  const getCanApprove = (b: Borrowing): { canApprove: boolean; hasActed: boolean; currentStep: WorkflowStep | undefined } => {
    if (!b.workflow_template_id || b.current_step == null) {
      return { canApprove: false, hasActed: false, currentStep: undefined };
    }
    const steps = stepCache[b.workflow_template_id] ?? [];
    const currentStep = steps.find((s) => s.step_order === b.current_step);
    if (!currentStep || !currentStep.role_id) {
      return { canApprove: false, hasActed: false, currentStep };
    }
    const canApprove =
      userRoleIds.includes(currentStep.role_id) && b.status === 'pending';
    // Check if user already acted on the current step
    const stepItems = b.borrowing_items.filter(
      (it) => it.current_step === b.current_step,
    );
    const hasActed = stepItems.length > 0 && stepItems.every((it) => it.status !== 'pending');
    return { canApprove, hasActed, currentStep };
  };

  const handleApprove = async (b: Borrowing) => {
    if (!adminProfile) return;
    setActionLoading(b.id);
    try {
      const steps = stepCache[b.workflow_template_id ?? ''] ?? [];
      const currentStep = steps.find((s) => s.step_order === b.current_step);
      const nextStep = steps.find((s) => s.step_order === (b.current_step ?? 0) + 1);
      const isFinalStep = !nextStep;

      const newStatus = isFinalStep ? 'approved' : 'pending';
      const newStep = isFinalStep ? b.current_step : nextStep?.step_order ?? b.current_step;
      const newLabel = isFinalStep ? 'Disetujui' : (nextStep?.step_label ?? 'Menunggu Persetujuan');

      const { error: bErr } = await supabase
        .from('borrowings')
        .update({
          status: newStatus,
          current_step: newStep,
          current_status_label: newLabel,
          approved_by: isFinalStep ? adminProfile.id : b.approved_by,
          approver_position: isFinalStep ? adminProfile.role : b.approver_position,
          approved_at: isFinalStep ? new Date().toISOString() : b.approved_at,
        })
        .eq('id', b.id);

      if (bErr) throw bErr;

      // Update borrowing_items for current step
      const stepItems = b.borrowing_items.filter((it) => it.current_step === b.current_step);
      for (const item of stepItems) {
        await supabase
          .from('borrowing_items')
          .update({
            status: isFinalStep ? 'approved' : 'approved',
            current_status_label: newLabel,
            current_step: newStep,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }

      showToast(isFinalStep ? 'Peminjaman disetujui' : 'Persetujuan berhasil, lanjut ke tahap berikutnya', 'success');
      await fetchBorrowings();
    } catch (e: any) {
      showToast('Gagal menyetujui: ' + (e?.message ?? 'error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (b: Borrowing) => {
    if (!adminProfile) return;
    setActionLoading(b.id);
    try {
      const { error: bErr } = await supabase
        .from('borrowings')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
          approved_by: adminProfile.id,
          approver_position: adminProfile.role,
          approved_at: new Date().toISOString(),
        })
        .eq('id', b.id);
      if (bErr) throw bErr;

      for (const item of b.borrowing_items) {
        await supabase
          .from('borrowing_items')
          .update({
            status: 'rejected',
            current_status_label: 'Ditolak',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }

      showToast('Peminjaman ditolak', 'info');
      await fetchBorrowings();
    } catch (e: any) {
      showToast('Gagal menolak: ' + (e?.message ?? 'error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = borrowings.filter((b) => {
    const matchSearch =
      !search ||
      b.borrower_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      b.borrower_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Peminjaman</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola dan setujui permintaan peminjaman barang dan fasilitas.
        </p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari nama, email, atau keperluan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Semua Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada peminjaman" description="Belum ada data peminjaman yang sesuai filter." />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const { canApprove, hasActed, currentStep } = getCanApprove(b);
            const showApprove = canApprove && !hasActed && hasPermission('borrowings', 'approve');
            const showReject = canApprove && !hasActed && hasPermission('borrowings', 'reject');
            return (
              <div key={b.id} className="card">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {b.borrower_name ?? 'Tanpa nama'}
                      </h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {b.purpose ?? b.item_type ?? 'Peminjaman'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {new Date(b.created_at).toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Info grid */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem icon={User} label="Peminjam" value={b.borrower_name ?? '-'} />
                  <InfoItem icon={Mail} label="Email" value={b.borrower_email ?? '-'} />
                  <InfoItem icon={Phone} label="Telepon" value={b.borrower_phone ?? '-'} />
                  <InfoItem icon={Calendar} label="Tanggal Pinjam" value={b.borrow_date ?? '-'} />
                  <InfoItem icon={Calendar} label="Tanggal Kembali" value={b.return_date ?? '-'} />
                  <InfoItem icon={Clock} label="Waktu" value={`${b.start_time ?? '-'} - ${b.end_time ?? '-'}`} />
                  <InfoItem icon={FileText} label="Tipe" value={b.item_type ?? '-'} />
                  <InfoItem icon={User} label="Kelas/Unit" value={b.borrower_class ?? '-'} />
                </div>

                {/* Items */}
                {b.borrowing_items.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Item:</p>
                    <div className="flex flex-wrap gap-2">
                      {b.borrowing_items.map((it) => (
                        <span
                          key={it.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {it.item_name ?? it.item_type ?? 'Item'} ×{it.quantity}
                          <span className={cn(
                            'rounded px-1.5 py-0.5 text-[10px]',
                            it.status === 'approved' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                            it.status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                            it.status === 'rejected' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                          )}>
                            {it.status}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workflow progress */}
                {b.workflow_template_id && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Workflow:</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {b.current_status_label ?? b.status}
                      </span>
                      {currentStep && (
                        <span className="text-xs text-slate-400">
                          (Step {b.current_step}: {currentStep.step_label})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {b.notes && (
                  <div className="mt-3 rounded-lg border border-slate-100 p-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    <span className="font-medium">Catatan: </span>{b.notes}
                  </div>
                )}

                {/* Actions */}
                {(showApprove || showReject) && (
                  <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {showApprove && (
                      <button
                        onClick={() => handleApprove(b)}
                        disabled={actionLoading === b.id}
                        className="btn-primary"
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
                        className="btn-danger"
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    returned: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  };
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', styles[status] ?? styles.pending)}>
      {status}
    </span>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

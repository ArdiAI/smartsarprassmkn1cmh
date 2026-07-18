import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Package,
  Clock,
  FileText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getWorkflowSteps, type WorkflowStep } from '../../lib/workflow';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

interface BorrowingItem {
  id: string;
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

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  returned: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  borrowed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

function statusLabel(s: string) {
  switch (s) {
    case 'pending': return 'Menunggu';
    case 'approved': return 'Disetujui';
    case 'rejected': return 'Ditolak';
    case 'returned': return 'Dikembalikan';
    case 'borrowed': return 'Dipinjam';
    case 'completed': return 'Selesai';
    default: return s;
  }
}

export default function BorrowingsAdminPage() {
  const { hasPermission, adminProfile } = useAuth();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [stepCache, setStepCache] = useState<Record<string, WorkflowStep[]>>({});

  useEffect(() => {
    (async () => {
      if (adminProfile?.id) {
        const { data } = await supabase
          .from('admin_user_roles')
          .select('role_id')
          .eq('admin_user_id', adminProfile.id);
        setUserRoleIds((data ?? []).map((r: any) => r.role_id as string));
      }
    })();
  }, [adminProfile?.id]);

  async function fetchBorrowings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('borrowings')
        .select('*, borrowing_items(*)')
        .order('created_at', { ascending: false });
      if (error) {
        showToast('Gagal memuat data peminjaman', 'error');
        return;
      }
      const list = (data as unknown as Borrowing[]) ?? [];
      setBorrowings(list);
      // Cache workflow steps per template
      const templateIds = [...new Set(list.map((b) => b.workflow_template_id).filter(Boolean))] as string[];
      const cache: Record<string, WorkflowStep[]> = {};
      await Promise.all(
        templateIds.map(async (tid) => {
          cache[tid] = await getWorkflowSteps(tid);
        }),
      );
      setStepCache(cache);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBorrowings();
  }, []);

  const filtered = useMemo(() => {
    return borrowings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          (b.borrower_name ?? '').toLowerCase().includes(q) ||
          (b.borrower_class ?? '').toLowerCase().includes(q) ||
          (b.purpose ?? '').toLowerCase().includes(q) ||
          (b.item_type ?? '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [borrowings, search, statusFilter]);

  function getApprovalState(b: Borrowing) {
    const steps = b.workflow_template_id ? stepCache[b.workflow_template_id] ?? [] : [];
    if (steps.length === 0) {
      return { canApprove: b.status === 'pending', currentStep: null, hasActed: false, steps: [] };
    }
    const currentStep = steps.find((s) => s.step_order === b.current_step) ?? null;
    const canApprove =
      !!currentStep &&
      currentStep.role_id !== null &&
      userRoleIds.includes(currentStep.role_id) &&
      b.status === 'pending';
    // Check if user already acted on current step via borrowing_items
    const hasActed = (b.borrowing_items ?? []).some(
      (it) =>
        it.current_step === b.current_step &&
        it.status !== 'pending' &&
        it.assigned_approver_role === (adminProfile?.role ?? null),
    );
    return { canApprove, currentStep, hasActed, steps };
  }

  async function handleApprove(b: Borrowing) {
    setActionLoading(b.id);
    try {
      const steps = b.workflow_template_id ? stepCache[b.workflow_template_id] ?? [] : [];
      const currentOrder = b.current_step ?? 0;
      const nextStep = steps.find((s) => s.step_order > currentOrder);
      const newStatus = nextStep ? 'pending' : 'approved';
      const newStep = nextStep ? nextStep.step_order : currentOrder;
      const newLabel = nextStep ? (nextStep.step_label ?? null) : 'Disetujui';

      const { error } = await supabase
        .from('borrowings')
        .update({
          status: newStatus,
          current_step: newStep,
          current_status_label: newLabel,
          approved_by: adminProfile?.id ?? null,
          approver_position: adminProfile?.role ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', b.id);

      if (error) {
        showToast('Gagal menyetujui peminjaman', 'error');
        return;
      }

      // Update borrowing_items for current step
      if ((b.borrowing_items ?? []).length > 0) {
        await supabase
          .from('borrowing_items')
          .update({ status: 'approved', current_status_label: 'Disetujui' })
          .eq('borrowing_id', b.id)
          .eq('current_step', currentOrder);
      }

      showToast(newStatus === 'approved' ? 'Peminjaman disetujui' : 'Lanjut ke tahap berikutnya', 'success');
      fetchBorrowings();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(b: Borrowing) {
    setActionLoading(b.id);
    try {
      const { error } = await supabase
        .from('borrowings')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
          approved_by: adminProfile?.id ?? null,
          approver_position: adminProfile?.role ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', b.id);

      if (error) {
        showToast('Gagal menolak peminjaman', 'error');
        return;
      }

      if ((b.borrowing_items ?? []).length > 0) {
        await supabase
          .from('borrowing_items')
          .update({ status: 'rejected', current_status_label: 'Ditolak' })
          .eq('borrowing_id', b.id);
      }

      showToast('Peminjaman ditolak', 'info');
      fetchBorrowings();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Peminjaman</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola dan setujui permohonan peminjaman barang dan fasilitas.
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Cari nama, kelas, tujuan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="borrowed">Dipinjam</option>
            <option value="returned">Dikembalikan</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada peminjaman" description="Belum ada data peminjaman yang cocok." />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const { canApprove, hasActed, currentStep, steps } = getApprovalState(b);
            const showApprove = canApprove && !hasActed && hasPermission('borrowings', 'approve');
            const showReject = canApprove && !hasActed && hasPermission('borrowings', 'reject');
            return (
              <div key={b.id} className="card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {b.purpose ?? b.borrower_name ?? 'Peminjaman'}
                      </h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[b.status] ?? statusStyles.pending}`}>
                        {statusLabel(b.status)}
                      </span>
                      {b.current_status_label && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {b.current_status_label}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <span>{b.borrower_name ?? '-'}{b.borrower_class ? ` (${b.borrower_class})` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span>{b.item_type ?? 'Barang'} • {b.borrowed_units ?? 0} unit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{b.borrow_date ?? '-'} → {b.return_date ?? '-'}</span>
                      </div>
                      {b.start_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{b.start_time}{b.end_time ? ` - ${b.end_time}` : ''}</span>
                        </div>
                      )}
                    </div>

                    {b.notes && (
                      <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>{b.notes}</span>
                      </div>
                    )}

                    {/* Items */}
                    {(b.borrowing_items ?? []).length > 0 && (
                      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Item:</p>
                        <div className="flex flex-wrap gap-2">
                          {b.borrowing_items.map((it) => (
                            <span
                              key={it.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {it.item_name ?? it.item_type ?? 'Item'} ×{it.quantity}
                              <span className={`rounded px-1.5 py-0.5 ${statusStyles[it.status] ?? statusStyles.pending}`}>
                                {statusLabel(it.status)}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workflow progress */}
                    {steps.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {steps.map((s, idx) => {
                          const done = (b.current_step ?? 0) > s.step_order;
                          const active = (b.current_step ?? 0) === s.step_order && b.status === 'pending';
                          return (
                            <div key={s.id} className="flex items-center gap-1.5">
                              <div
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                                  done
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : active
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {done && <CheckCircle2 className="h-3 w-3" />}
                                {s.step_label ?? `Tahap ${s.step_order}`}
                              </div>
                              {idx < steps.length - 1 && <div className="h-px w-4 bg-slate-300 dark:bg-slate-700" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {currentStep && canApprove && !hasActed && (
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        Menunggu persetujuan Anda ({currentStep.step_label})
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {(showApprove || showReject) && (
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      {showApprove && (
                        <button
                          onClick={() => handleApprove(b)}
                          disabled={actionLoading === b.id}
                          className="btn-primary px-4 py-2 text-xs"
                        >
                          {actionLoading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Setujui
                        </button>
                      )}
                      {showReject && (
                        <button
                          onClick={() => handleReject(b)}
                          disabled={actionLoading === b.id}
                          className="btn-danger px-4 py-2 text-xs"
                        >
                          {actionLoading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
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

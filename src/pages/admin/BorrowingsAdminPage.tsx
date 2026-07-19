import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getWorkflowSteps, type WorkflowStep } from '../../lib/workflow';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import {
  Search,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string;
  item_name: string;
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
  borrower_name: string;
  borrower_class: string;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrowed_units: number | null;
  borrow_date: string;
  return_date: string | null;
  actual_return_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  item_type: string;
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

const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected', 'returned', 'completed'];

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
    if (!adminProfile) return;
    const { data } = await supabase
      .from('admin_user_roles')
      .select('role_id')
      .eq('admin_user_id', adminProfile.id);
    setUserRoleIds((data ?? []).map((r: any) => r.role_id as string));
  }, [adminProfile]);

  const fetchBorrowings = useCallback(async () => {
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
      setBorrowings((data as unknown as Borrowing[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBorrowings();
    fetchUserRoleIds();
  }, [fetchBorrowings, fetchUserRoleIds]);

  const getSteps = useCallback(async (templateId: string): Promise<WorkflowStep[]> => {
    if (!templateId) return [];
    if (workflowStepsCache[templateId]) return workflowStepsCache[templateId];
    const steps = await getWorkflowSteps(templateId);
    setWorkflowStepsCache((prev) => ({ ...prev, [templateId]: steps }));
    return steps;
  }, [workflowStepsCache]);

  const canApproveBorrowing = (b: Borrowing): boolean => {
    if (b.status !== 'pending') return false;
    if (!b.workflow_template_id || b.current_step === null) return true;
    const steps = workflowStepsCache[b.workflow_template_id];
    if (!steps) return false;
    const currentStep = steps.find((s) => s.step_order === b.current_step);
    if (!currentStep?.role_id) return true;
    return userRoleIds.includes(currentStep.role_id);
  };

  const hasUserAlreadyActed = (b: Borrowing): boolean => {
    if (b.current_step === null) return false;
    const stepItems = b.borrowing_items.filter((bi) => bi.current_step === b.current_step);
    if (stepItems.length === 0) return false;
    return stepItems.some((bi) => bi.status !== 'pending');
  };

  const handleApprove = async (b: Borrowing) => {
    setActionLoading(b.id);
    try {
      const steps = b.workflow_template_id ? await getSteps(b.workflow_template_id) : [];
      const currentStepNum = b.current_step ?? 1;
      const nextStep = steps.find((s) => s.step_order > currentStepNum);
      const isLastStep = !nextStep;
      const newStatus = isLastStep ? 'approved' : 'pending';
      const newStep = isLastStep ? currentStepNum : nextStep.step_order;
      const newStatusLabel = isLastStep ? 'Disetujui' : nextStep.step_label;

      const { error } = await supabase
        .from('borrowings')
        .update({
          status: newStatus,
          current_step: newStep,
          current_status_label: newStatusLabel,
          approved_by: adminProfile?.id ?? null,
          approver_position: adminProfile?.role ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', b.id);
      if (error) throw error;

      if (b.borrowing_items.length > 0) {
        const updates = b.borrowing_items.map((bi) => ({
          id: bi.id,
          status: isLastStep ? 'approved' : 'pending',
          current_status_label: newStatusLabel,
          current_step: newStep,
          updated_at: new Date().toISOString(),
        }));
        for (const u of updates) {
          await supabase.from('borrowing_items').update(u).eq('id', u.id);
        }
      }

      showToast(isLastStep ? 'Peminjaman disetujui' : 'Persetujuan lanjut ke tahap berikutnya', 'success');
      await fetchBorrowings();
    } catch {
      showToast('Gagal menyetujui peminjaman', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (b: Borrowing) => {
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
      if (error) throw error;

      if (b.borrowing_items.length > 0) {
        for (const bi of b.borrowing_items) {
          await supabase
            .from('borrowing_items')
            .update({ status: 'rejected', current_status_label: 'Ditolak', updated_at: new Date().toISOString() })
            .eq('id', bi.id);
        }
      }

      showToast('Peminjaman ditolak', 'info');
      await fetchBorrowings();
    } catch {
      showToast('Gagal menolak peminjaman', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Pre-fetch workflow steps for all borrowings
  useEffect(() => {
    borrowings.forEach((b) => {
      if (b.workflow_template_id && !workflowStepsCache[b.workflow_template_id]) {
        getSteps(b.workflow_template_id);
      }
    });
  }, [borrowings, workflowStepsCache, getSteps]);

  const filtered = borrowings.filter((b) => {
    const matchSearch =
      !search ||
      (b.borrower_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (b.purpose ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (b.item_type ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'returned':
      case 'completed':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Peminjaman</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola dan setujui permintaan peminjaman</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari peminjam, tujuan, atau jenis..."
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
            <option key={s} value={s}>{s === 'all' ? 'Semua Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada peminjaman" description="Belum ada data peminjaman yang cocok." icon={<Package className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const canApprove = canApproveBorrowing(b) && !hasUserAlreadyActed(b);
            const showApprove = canApprove && hasPermission('borrowings', 'approve');
            const showReject = canApprove && hasPermission('borrowings', 'reject');
            return (
              <div key={b.id} className="card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(b.status ?? '')}`}>
                        {b.current_status_label ?? b.status}
                      </span>
                      <span className="text-sm text-slate-400">{b.item_type ?? 'Barang'}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <User className="h-4 w-4 text-slate-400" />
                        <span>{b.borrower_name ?? 'N/A'}</span>
                        {b.borrower_class && <span className="text-slate-400">• {b.borrower_class}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{b.borrow_date ?? '-'}</span>
                        {b.return_date && <span className="text-slate-400">→ {b.return_date}</span>}
                      </div>
                      {b.borrower_email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span>{b.borrower_email}</span>
                        </div>
                      )}
                      {b.borrower_phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>{b.borrower_phone}</span>
                        </div>
                      )}
                    </div>
                    {b.purpose && (
                      <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>{b.purpose}</span>
                      </div>
                    )}
                    {b.notes && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Catatan: {b.notes}</p>
                    )}

                    {/* Items */}
                    {b.borrowing_items.length > 0 && (
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                        <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Item Peminjaman</p>
                        <div className="space-y-1.5">
                          {b.borrowing_items.map((bi) => (
                            <div key={bi.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <ChevronRight className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-700 dark:text-slate-200">{bi.item_name ?? bi.item_type ?? 'Item'}</span>
                                <span className="text-slate-400">×{bi.quantity}</span>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(bi.status ?? '')}`}>
                                {bi.current_status_label ?? bi.status ?? '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workflow progress */}
                    {b.workflow_template_id && workflowStepsCache[b.workflow_template_id] && (
                      <div className="flex items-center gap-1.5">
                        {workflowStepsCache[b.workflow_template_id].map((s, idx, arr) => {
                          const isCurrent = s.step_order === b.current_step;
                          const isPast = b.current_step !== null && s.step_order < b.current_step;
                          const isDone = b.status === 'approved' || isPast;
                          return (
                            <div key={s.id} className="flex items-center">
                              <div
                                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : isCurrent
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400'
                                }`}
                              >
                                {isDone ? <CheckCircle2 className="h-3 w-3" /> : isCurrent ? <Clock className="h-3 w-3" /> : null}
                                {s.step_label}
                              </div>
                              {idx < arr.length - 1 && (
                                <ChevronRight className="mx-0.5 h-3 w-3 text-slate-300" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {(showApprove || showReject) && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {showApprove && (
                        <button
                          onClick={() => handleApprove(b)}
                          disabled={actionLoading === b.id}
                          className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                        >
                          {actionLoading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Setujui
                        </button>
                      )}
                      {showReject && (
                        <button
                          onClick={() => handleReject(b)}
                          disabled={actionLoading === b.id}
                          className="btn-danger"
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

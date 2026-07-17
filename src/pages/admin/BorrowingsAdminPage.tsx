import { useEffect, useState, useCallback } from 'react';
import {
  Package, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  User, FileText, ArrowRight, RotateCcw, Mail, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  fetchWorkflowTemplate, getNextActionableStep, isLastActionableStep, getCurrentStep,
  type WorkflowStep, type WorkflowTemplate,
} from '../../lib/workflow';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string;
  quantity: number;
  status: string;
  current_step: number;
  notes: string;
  inventory: { name: string; code: string } | null;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_email: string;
  purpose: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  workflow_template_id: string | null;
  borrowing_items: BorrowingItem[];
}

interface ApprovalHistoryEntry {
  borrowing_id: string;
  borrowing_item_id: string;
  step_order: number;
  step_label: string;
  approver_name: string;
  approver_role: string;
  status: string;
  notes: string;
  acted_at: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    returned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return map[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [workflowCache, setWorkflowCache] = useState<Record<string, WorkflowTemplate>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Approval form state per item
  const [approvalForms, setApprovalForms] = useState<Record<string, { approverName: string; approverPosition: string; notes: string }>>({});

  const loadBorrowings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('borrowings')
        .select(`
          id, borrower_name, borrower_email, purpose, start_date, end_date, status, created_at, workflow_template_id,
          borrowing_items (
            id, borrowing_id, inventory_id, quantity, status, current_step, notes,
            inventory:inventory_id (name, code)
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBorrowings((data ?? []) as unknown as Borrowing[]);

      // Pre-fetch workflow templates
      const templateIds = [...new Set((data ?? []).map((b: any) => b.workflow_template_id).filter(Boolean))] as string[];
      for (const tid of templateIds) {
        if (!workflowCache[tid]) {
          const template = await fetchWorkflowTemplate(tid);
          if (template) {
            setWorkflowCache((prev) => ({ ...prev, [tid]: template }));
          }
        }
      }
    } catch {
      showToast('Gagal memuat data peminjaman', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadBorrowings();
  }, [loadBorrowings]);

  const getForm = (itemId: string) => ({
    approverName: approvalForms[itemId]?.approverName || '',
    approverPosition: approvalForms[itemId]?.approverPosition || '',
    notes: approvalForms[itemId]?.notes || '',
  });

  const updateForm = (itemId: string, field: string, value: string) => {
    setApprovalForms((prev) => ({
      ...prev,
      [itemId]: { ...getForm(itemId), [field]: value },
    }));
  };

  const sendEmail = async (borrowingId: string, itemId: string, action: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v2/send-borrowing-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowingId, borrowingItemId: itemId, action }),
      });
    } catch {
      // Email is best-effort; don't block on failure
      console.warn('Failed to send email notification');
    }
  };

  const logApproval = async (entry: ApprovalHistoryEntry) => {
    try {
      await supabase.from('approval_history').insert({
        borrowing_id: entry.borrowing_id,
        borrowing_item_id: entry.borrowing_item_id,
        step_order: entry.step_order,
        step_label: entry.step_label,
        approver_name: entry.approver_name,
        approver_role: entry.approver_role,
        status: entry.status,
        notes: entry.notes,
        acted_at: entry.acted_at,
      });
    } catch {
      console.warn('Failed to log approval history');
    }
  };

  const handleApprove = async (borrowing: Borrowing, item: BorrowingItem) => {
    const form = getForm(item.id);
    if (!form.approverName.trim() || !form.approverPosition.trim()) {
      showToast('Isi nama dan jabatan approver', 'warning');
      return;
    }

    setActionLoading(item.id);
    try {
      const template = borrowing.workflow_template_id ? workflowCache[borrowing.workflow_template_id] : null;
      const steps: WorkflowStep[] = template?.steps ?? [];
      const currentStep = getCurrentStep(steps, item.current_step);
      const stepLabel = currentStep?.step_label || `Step ${item.current_step}`;

      if (isLastActionableStep(steps, item.current_step)) {
        // Finalize: mark as approved (or completed)
        await supabase
          .from('borrowing_items')
          .update({ status: 'approved', current_step: item.current_step })
          .eq('id', item.id);

        await logApproval({
          borrowing_id: borrowing.id,
          borrowing_item_id: item.id,
          step_order: item.current_step,
          step_label: stepLabel,
          approver_name: form.approverName,
          approver_role: form.approverPosition,
          status: 'approved',
          notes: form.notes,
          acted_at: new Date().toISOString(),
        });

        showToast(`Item disetujui (step final): ${stepLabel}`, 'success');
      } else {
        const nextStep = getNextActionableStep(steps, item.current_step);
        const nextStepOrder = nextStep ? nextStep.step_order : item.current_step + 1;

        await supabase
          .from('borrowing_items')
          .update({ current_step: nextStepOrder, status: 'pending' })
          .eq('id', item.id);

        await logApproval({
          borrowing_id: borrowing.id,
          borrowing_item_id: item.id,
          step_order: item.current_step,
          step_label: stepLabel,
          approver_name: form.approverName,
          approver_role: form.approverPosition,
          status: 'approved',
          notes: form.notes,
          acted_at: new Date().toISOString(),
        });

        showToast(`Item disetujui, lanjut ke step ${nextStepOrder}`, 'success');
      }

      await sendEmail(borrowing.id, item.id, 'approved');
      await loadBorrowings();
      setApprovalForms((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch {
      showToast('Gagal menyetujui item', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (borrowing: Borrowing, item: BorrowingItem) => {
    const form = getForm(item.id);
    if (!form.approverName.trim()) {
      showToast('Isi nama approver', 'warning');
      return;
    }

    setActionLoading(item.id);
    try {
      const template = borrowing.workflow_template_id ? workflowCache[borrowing.workflow_template_id] : null;
      const steps: WorkflowStep[] = template?.steps ?? [];
      const currentStep = getCurrentStep(steps, item.current_step);
      const stepLabel = currentStep?.step_label || `Step ${item.current_step}`;

      await supabase
        .from('borrowing_items')
        .update({ status: 'rejected' })
        .eq('id', item.id);

      await logApproval({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: item.current_step,
        step_label: stepLabel,
        approver_name: form.approverName,
        approver_role: form.approverPosition,
        status: 'rejected',
        notes: form.notes,
        acted_at: new Date().toISOString(),
      });

      await sendEmail(borrowing.id, item.id, 'rejected');
      showToast('Item ditolak', 'info');
      await loadBorrowings();
      setApprovalForms((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch {
      showToast('Gagal menolak item', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async (borrowing: Borrowing, item: BorrowingItem) => {
    setActionLoading(item.id);
    try {
      await supabase
        .from('borrowing_items')
        .update({ status: 'returned' })
        .eq('id', item.id);

      await logApproval({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: item.current_step,
        step_label: 'Return',
        approver_name: 'Admin',
        approver_role: 'Admin',
        status: 'returned',
        notes: 'Item telah dikembalikan',
        acted_at: new Date().toISOString(),
      });

      showToast('Item ditandai sebagai dikembalikan', 'success');
      await loadBorrowings();
    } catch {
      showToast('Gagal menandai return', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (borrowing: Borrowing, item: BorrowingItem) => {
    setActionLoading(item.id);
    try {
      await supabase
        .from('borrowing_items')
        .update({ status: 'completed' })
        .eq('id', item.id);

      showToast('Item ditandai selesai', 'success');
      await loadBorrowings();
    } catch {
      showToast('Gagal menyelesaikan item', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const renderWorkflowProgress = (borrowing: Borrowing, item: BorrowingItem) => {
    const template = borrowing.workflow_template_id ? workflowCache[borrowing.workflow_template_id] : null;
    const steps: WorkflowStep[] = template?.steps ?? [];
    if (steps.length === 0) return null;

    return (
      <div className="flex items-center gap-1 mt-3 flex-wrap">
        {steps.map((step, idx) => {
          const isDone = step.step_order < item.current_step;
          const isCurrent = step.step_order === item.current_step && item.status === 'pending';
          const isInfoOnly = step.is_info_only;
          return (
            <div key={step.id} className="flex items-center gap-1">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                  isDone && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  isCurrent && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-2 ring-blue-400/30',
                  !isDone && !isCurrent && 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  isInfoOnly && 'italic opacity-70',
                )}
              >
                {isDone && <CheckCircle className="w-3 h-3" />}
                {isCurrent && <Clock className="w-3 h-3 animate-pulse" />}
                <span>{step.step_label}</span>
              </div>
              {idx < steps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
            </div>
          );
        })}
      </div>
    );
  };

  const filters = ['all', 'pending', 'approved', 'rejected', 'completed', 'returned'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Peminjaman</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola approval peminjaman dengan workflow</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              {f === 'all' ? 'Semua' : f}
            </button>
          ))}
        </div>
      </div>

      {borrowings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada peminjaman</p>
        </div>
      ) : (
        <div className="space-y-4">
          {borrowings.map((borrowing) => {
            const isExpanded = expanded === borrowing.id;
            return (
              <div key={borrowing.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : borrowing.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{borrowing.borrower_name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {borrowing.purpose || 'No purpose'} · {new Date(borrowing.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', statusBadge(borrowing.status))}>
                      {borrowing.status}
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-slide-in">
                    {/* Borrowing info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{borrowing.borrower_email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{new Date(borrowing.start_date).toLocaleDateString('id-ID')} → {new Date(borrowing.end_date).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>{borrowing.borrowing_items?.length || 0} item</span>
                      </div>
                    </div>

                    {/* Items */}
                    {(borrowing.borrowing_items || []).map((item) => {
                      const form = getForm(item.id);
                      const isPending = item.status === 'pending';
                      const isApproved = item.status === 'approved';
                      const isRejected = item.status === 'rejected';
                      const isReturned = item.status === 'returned';
                      const isLoading = actionLoading === item.id;

                      return (
                        <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/30">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {item.inventory?.name || 'Unknown item'}
                                <span className="ml-2 text-xs text-slate-400">({item.inventory?.code || 'no code'})</span>
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Jumlah: {item.quantity}</p>
                              {renderWorkflowProgress(borrowing, item)}
                            </div>
                            <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize flex-shrink-0', statusBadge(item.status))}>
                              {item.status}
                            </span>
                          </div>

                          {/* Approval form */}
                          {isPending && (
                            <div className="mt-4 space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  placeholder="Nama Approver"
                                  value={form.approverName}
                                  onChange={(e) => updateForm(item.id, 'approverName', e.target.value)}
                                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                  type="text"
                                  placeholder="Jabatan / Position"
                                  value={form.approverPosition}
                                  onChange={(e) => updateForm(item.id, 'approverPosition', e.target.value)}
                                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <textarea
                                placeholder="Catatan (opsional)"
                                value={form.notes}
                                onChange={(e) => updateForm(item.id, 'notes', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleApprove(borrowing, item)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                >
                                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(borrowing, item)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Post-approval actions */}
                          {(isApproved || isReturned) && !isPending && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                              {isApproved && (
                                <button
                                  onClick={() => handleReturn(borrowing, item)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                >
                                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                  Tandai Dikembalikan
                                </button>
                              )}
                              {isReturned && (
                                <button
                                  onClick={() => handleComplete(borrowing, item)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                  Tandai Selesai
                                </button>
                              )}
                            </div>
                          )}

                          {isRejected && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 border-t border-slate-200 dark:border-slate-700 pt-4">
                              <XCircle className="w-4 h-4" />
                              Item ini telah ditolak
                            </div>
                          )}
                        </div>
                      );
                    })}
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

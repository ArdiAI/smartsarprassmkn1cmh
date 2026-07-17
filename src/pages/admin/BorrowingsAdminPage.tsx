import { useEffect, useState } from 'react';
import {
  Package, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Loader2, Mail, FileText, RotateCcw, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';
import {
  fetchWorkflowTemplate, getNextActionableStep, isLastActionableStep, getCurrentStep,
  type WorkflowStep, type WorkflowTemplate,
} from '../../lib/workflow';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  item_name: string;
  quantity: number;
  status: string;
  current_step: number;
  workflow_template_id: string | null;
  notes?: string;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_email: string;
  purpose: string;
  borrow_date: string;
  return_date: string;
  status: string;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

interface ApprovalForm {
  approverName: string;
  approverPosition: string;
  notes: string;
}

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approvalForms, setApprovalForms] = useState<Record<string, ApprovalForm>>({});
  const [workflowCache, setWorkflowCache] = useState<Record<string, WorkflowTemplate>>({});

  useEffect(() => {
    fetchBorrowings();
  }, []);

  const fetchBorrowings = async () => {
    try {
      const { data, error } = await supabase
        .from('borrowings')
        .select('id, borrower_name, borrower_email, purpose, borrow_date, return_date, status, created_at, borrowing_items(id, borrowing_id, item_name, quantity, status, current_step, workflow_template_id, notes)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const items = (data as unknown as Borrowing[]) || [];
      setBorrowings(items);

      // Pre-fetch workflow templates
      const templateIds = new Set<string>();
      items.forEach((b) => {
        b.borrowing_items?.forEach((item) => {
          if (item.workflow_template_id) templateIds.add(item.workflow_template_id);
        });
      });

      const cache: Record<string, WorkflowTemplate> = {};
      await Promise.all(
        Array.from(templateIds).map(async (tid) => {
          const tmpl = await fetchWorkflowTemplate(tid);
          if (tmpl) cache[tid] = tmpl;
        })
      );
      setWorkflowCache(cache);
    } catch {
      showToast('Gagal memuat peminjaman', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getForm = (itemId: string): ApprovalForm =>
    approvalForms[itemId] || { approverName: '', approverPosition: '', notes: '' };

  const setForm = (itemId: string, patch: Partial<ApprovalForm>) => {
    setApprovalForms((prev) => ({
      ...prev,
      [itemId]: { ...getForm(itemId), ...patch },
    }));
  };

  const logHistory = async (
    borrowingId: string,
    borrowingItemId: string,
    step: WorkflowStep | undefined,
    approverName: string,
    approverRole: string,
    status: string,
    notes: string
  ) => {
    await supabase.from('approval_history').insert({
      borrowing_id: borrowingId,
      borrowing_item_id: borrowingItemId,
      step_order: step?.step_order ?? 0,
      step_label: step?.step_label ?? '',
      approver_name: approverName,
      approver_role: approverRole,
      status,
      notes,
      acted_at: new Date().toISOString(),
    });
  };

  const sendEmail = async (borrowing: Borrowing, item: BorrowingItem, status: string) => {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowing_id: borrowing.id,
          borrowing_item_id: item.id,
          borrower_name: borrowing.borrower_name,
          borrower_email: borrowing.borrower_email,
          item_name: item.item_name,
          status,
        }),
      });
    } catch {
      // Email failure is non-blocking
    }
  };

  const handleApprove = async (borrowing: Borrowing, item: BorrowingItem) => {
    const form = getForm(item.id);
    if (!form.approverName || !form.approverPosition) {
      showToast('Nama dan jabatan approver wajib diisi', 'warning');
      return;
    }

    setActionLoading(item.id);
    try {
      const template = item.workflow_template_id ? workflowCache[item.workflow_template_id] : null;
      const steps = template?.steps || [];
      const currentStep = getCurrentStep(steps, item.current_step);

      const isLast = isLastActionableStep(steps, item.current_step);
      const nextStep = getNextActionableStep(steps, item.current_step);

      let newStatus = item.status;
      let newCurrentStep = item.current_step;

      if (isLast || steps.length === 0) {
        newStatus = 'approved';
      } else if (nextStep) {
        newCurrentStep = nextStep.step_order;
        newStatus = nextStep.is_info_only ? 'approved' : 'pending';
      }

      const { error } = await supabase
        .from('borrowing_items')
        .update({ status: newStatus, current_step: newCurrentStep })
        .eq('id', item.id);

      if (error) throw error;

      await logHistory(borrowing.id, item.id, currentStep, form.approverName, form.approverPosition, 'approved', form.notes);
      await sendEmail(borrowing, item, newStatus);

      showToast(`Item "${item.item_name}" disetujui`, 'success');
      setApprovalForms((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      fetchBorrowings();
    } catch {
      showToast('Gagal menyetujui item', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (borrowing: Borrowing, item: BorrowingItem) => {
    const form = getForm(item.id);
    if (!form.approverName || !form.approverPosition) {
      showToast('Nama dan jabatan approver wajib diisi', 'warning');
      return;
    }

    setActionLoading(item.id);
    try {
      const template = item.workflow_template_id ? workflowCache[item.workflow_template_id] : null;
      const steps = template?.steps || [];
      const currentStep = getCurrentStep(steps, item.current_step);

      const { error } = await supabase
        .from('borrowing_items')
        .update({ status: 'rejected' })
        .eq('id', item.id);

      if (error) throw error;

      await logHistory(borrowing.id, item.id, currentStep, form.approverName, form.approverPosition, 'rejected', form.notes);
      await sendEmail(borrowing, item, 'rejected');

      showToast(`Item "${item.item_name}" ditolak`, 'info');
      setApprovalForms((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      fetchBorrowings();
    } catch {
      showToast('Gagal menolak item', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async (item: BorrowingItem) => {
    setActionLoading(item.id);
    try {
      const { error } = await supabase
        .from('borrowing_items')
        .update({ status: 'returned' })
        .eq('id', item.id);

      if (error) throw error;
      showToast(`Item "${item.item_name}" ditandai dikembalikan`, 'success');
      fetchBorrowings();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (item: BorrowingItem) => {
    setActionLoading(item.id);
    try {
      const { error } = await supabase
        .from('borrowing_items')
        .update({ status: 'completed' })
        .eq('id', item.id);

      if (error) throw error;
      showToast(`Item "${item.item_name}" diselesaikan`, 'success');
      fetchBorrowings();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      returned: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return map[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  };

  const renderWorkflowProgress = (item: BorrowingItem) => {
    const template = item.workflow_template_id ? workflowCache[item.workflow_template_id] : null;
    const steps = template?.steps || [];
    if (steps.length === 0) return null;

    return (
      <div className="flex items-center gap-1 flex-wrap mt-2">
        {steps.map((step) => {
          const isCurrent = step.step_order === item.current_step;
          const isPast = step.step_order < item.current_step;
          const isRejected = item.status === 'rejected';
          return (
            <div key={step.id} className="flex items-center gap-1">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                  isRejected && step.step_order >= item.current_step
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-700/50'
                    : isPast
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : isCurrent
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                )}
              >
                {isPast && !isRejected && <CheckCircle className="w-3 h-3" />}
                {isCurrent && !isRejected && <Clock className="w-3 h-3" />}
                {step.step_label}
              </div>
              {step.step_order < steps.length && <div className="w-3 h-px bg-slate-200 dark:bg-slate-600" />}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Peminjaman</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola dan setujui peminjaman barang</p>
      </div>

      {borrowings.length === 0 ? (
        <div className="card p-10 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada peminjaman</p>
        </div>
      ) : (
        <div className="space-y-4">
          {borrowings.map((b) => {
            const isExpanded = expandedId === b.id;
            return (
              <div key={b.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{b.borrower_name || 'N/A'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {b.purpose || '—'} · {new Date(b.borrow_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', statusBadge(b.status))}>
                    {b.status}
                  </span>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                        <p className="text-slate-900 dark:text-white">{b.borrower_email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tanggal Kembali</p>
                        <p className="text-slate-900 dark:text-white">
                          {b.return_date ? new Date(b.return_date).toLocaleDateString('id-ID') : '—'}
                        </p>
                      </div>
                    </div>

                    {b.borrowing_items?.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{item.item_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Jumlah: {item.quantity}</p>
                          </div>
                          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', statusBadge(item.status))}>
                            {item.status}
                          </span>
                        </div>

                        {renderWorkflowProgress(item)}

                        {item.status !== 'rejected' && item.status !== 'completed' && item.status !== 'returned' && (
                          <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="label">Nama Approver</label>
                                <input
                                  className="input"
                                  value={getForm(item.id).approverName}
                                  onChange={(e) => setForm(item.id, { approverName: e.target.value })}
                                  placeholder="Nama lengkap"
                                />
                              </div>
                              <div>
                                <label className="label">Jabatan</label>
                                <input
                                  className="input"
                                  value={getForm(item.id).approverPosition}
                                  onChange={(e) => setForm(item.id, { approverPosition: e.target.value })}
                                  placeholder="Jabatan / role"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="label">Catatan</label>
                              <textarea
                                className="input min-h-[80px] resize-y"
                                value={getForm(item.id).notes}
                                onChange={(e) => setForm(item.id, { notes: e.target.value })}
                                placeholder="Catatan approval (opsional)"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleApprove(b, item)}
                                disabled={actionLoading === item.id}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Setujui
                              </button>
                              <button
                                onClick={() => handleReject(b, item)}
                                disabled={actionLoading === item.id}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Tolak
                              </button>
                              {item.status === 'approved' && (
                                <>
                                  <button
                                    onClick={() => handleReturn(item)}
                                    disabled={actionLoading === item.id}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                  >
                                    <RotateCcw className="w-4 h-4" /> Dikembalikan
                                  </button>
                                  <button
                                    onClick={() => handleComplete(item)}
                                    disabled={actionLoading === item.id}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle className="w-4 h-4" /> Selesai
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {item.status === 'rejected' && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-red-500">
                            <XCircle className="w-4 h-4" /> Item ditolak
                          </div>
                        )}
                        {(item.status === 'returned' || item.status === 'completed') && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-500">
                            <CheckCircle className="w-4 h-4" /> {item.status === 'returned' ? 'Dikembalikan' : 'Selesai'}
                          </div>
                        )}
                      </div>
                    ))}
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

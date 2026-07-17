import { useEffect, useState, useCallback } from 'react';
import {
  fetchWorkflowTemplate,
  getNextActionableStep,
  isLastActionableStep,
  getCurrentStep,
  type WorkflowStep,
  type WorkflowTemplate,
} from '../../lib/workflow';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  History,
  Check,
  X,
} from 'lucide-react';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string | null;
  item_name: string | null;
  quantity: number;
  status: string | null;
  current_status_label: string | null;
  workflow_template_id: string | null;
  current_step: number | null;
  assigned_approver_name: string | null;
  assigned_approver_role: string | null;
  created_at: string;
  updated_at: string;
}

interface Borrowing {
  id: string;
  inventory_id: string | null;
  facility_id: string | null;
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
  purpose: string | null;
  item_type: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  workflow_template_id: string | null;
  current_step: number | null;
  current_status_label: string | null;
  approved_by: string | null;
  approver_position: string | null;
  borrowing_items: BorrowingItem[];
}

interface ApprovalHistoryEntry {
  id: string;
  step_order: number;
  step_label: string;
  approver_name: string;
  approver_role: string;
  status: string;
  notes: string | null;
  acted_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700/30 dark:text-slate-400',
};

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [workflowCache, setWorkflowCache] = useState<Record<string, WorkflowTemplate | null>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('borrowings')
      .select('*, borrowing_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat peminjaman', 'error');
    } else {
      setBorrowings((data as unknown as Borrowing[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  const getWorkflow = useCallback(
    async (templateId: string): Promise<WorkflowTemplate | null> => {
      if (workflowCache[templateId] !== undefined) return workflowCache[templateId];
      const tpl = await fetchWorkflowTemplate(templateId);
      setWorkflowCache(prev => ({ ...prev, [templateId]: tpl }));
      return tpl;
    },
    [workflowCache]
  );

  const sendEmail = async (borrowingId: string, eventType: string) => {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowingId, eventType }),
      });
    } catch {
      // Non-critical
    }
  };

  const handleItemAction = async (
    item: BorrowingItem,
    borrowing: Borrowing,
    action: 'approve' | 'reject',
    approverName: string,
    approverPosition: string,
    notes: string
  ) => {
    if (!approverName.trim() || !approverPosition.trim()) {
      showToast('Nama dan jabatan approver wajib diisi', 'warning');
      return;
    }
    setActionLoading(item.id);
    try {
      const templateId = item.workflow_template_id ?? borrowing.workflow_template_id;
      if (!templateId) {
        showToast('Template workflow tidak ditemukan', 'error');
        setActionLoading(null);
        return;
      }
      const workflow = await getWorkflow(templateId);
      if (!workflow) {
        showToast('Workflow tidak ditemukan', 'error');
        setActionLoading(null);
        return;
      }
      const steps = workflow.steps;
      const currentStepNum = item.current_step ?? 0;
      const currentStep = getCurrentStep(steps, currentStepNum);
      const stepOrder = currentStep?.step_order ?? currentStepNum;
      const stepLabel = currentStep?.step_label ?? `Step ${stepOrder}`;

      if (action === 'reject') {
        // Reject item
        await supabase
          .from('borrowing_items')
          .update({
            status: 'rejected',
            current_status_label: 'Ditolak',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        await supabase
          .from('approval_history')
          .insert({
            borrowing_id: borrowing.id,
            borrowing_item_id: item.id,
            step_order: stepOrder,
            step_label: stepLabel,
            approver_name: approverName,
            approver_role: approverPosition,
            status: 'rejected',
            notes: notes,
            acted_at: new Date().toISOString(),
          });

        await sendEmail(borrowing.id, 'rejected');
        showToast('Item peminjaman ditolak', 'success');
      } else {
        // Approve item
        const isLast = isLastActionableStep(steps, currentStepNum);
        const nextStep = getNextActionableStep(steps, currentStepNum);

        if (isLast || !nextStep) {
          // Finalize item
          await supabase
            .from('borrowing_items')
            .update({
              status: 'approved',
              current_status_label: 'Disetujui',
              current_step: stepOrder,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          await sendEmail(borrowing.id, 'approved');
          showToast('Item peminjaman disetujui sepenuhnya', 'success');
        } else {
          // Advance to next step
          await supabase
            .from('borrowing_items')
            .update({
              current_step: nextStep.step_order,
              current_status_label: nextStep.step_label,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          await sendEmail(borrowing.id, 'step_approved');
          showToast(`Disetujui - lanjut ke: ${nextStep.step_label}`, 'success');
        }

        await supabase
          .from('approval_history')
          .insert({
            borrowing_id: borrowing.id,
            borrowing_item_id: item.id,
            step_order: stepOrder,
            step_label: stepLabel,
            approver_name: approverName,
            approver_role: approverPosition,
            status: 'approved',
            notes: notes,
            acted_at: new Date().toISOString(),
          });
      }

      await fetchBorrowings();
    } catch (err) {
      showToast('Gagal memproses aksi', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async (borrowing: Borrowing) => {
    setActionLoading(borrowing.id);
    try {
      const now = new Date().toISOString();
      await supabase
        .from('borrowings')
        .update({
          status: 'returned',
          actual_return_date: now,
          current_status_label: 'Dikembalikan',
        })
        .eq('id', borrowing.id);

      // Update all items
      if (borrowing.borrowing_items?.length) {
        for (const item of borrowing.borrowing_items) {
          await supabase
            .from('borrowing_items')
            .update({ status: 'returned', current_status_label: 'Dikembalikan', updated_at: now })
            .eq('id', item.id);
        }
      }

      await sendEmail(borrowing.id, 'returned');
      showToast('Peminjaman ditandai sebagai dikembalikan', 'success');
      await fetchBorrowings();
    } catch {
      showToast('Gagal menandai pengembalian', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (borrowing: Borrowing) => {
    setActionLoading(borrowing.id);
    try {
      await supabase
        .from('borrowings')
        .update({ status: 'completed', current_status_label: 'Selesai' })
        .eq('id', borrowing.id);

      if (borrowing.borrowing_items?.length) {
        for (const item of borrowing.borrowing_items) {
          await supabase
            .from('borrowing_items')
            .update({ status: 'completed', current_status_label: 'Selesai', updated_at: new Date().toISOString() })
            .eq('id', item.id);
        }
      }

      showToast('Peminjaman diselesaikan', 'success');
      await fetchBorrowings();
    } catch {
      showToast('Gagal menyelesaikan peminjaman', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchHistory = async (borrowingId: string): Promise<ApprovalHistoryEntry[]> => {
    const { data } = await supabase
      .from('approval_history')
      .select('*')
      .eq('borrowing_id', borrowingId)
      .order('acted_at', { ascending: true });
    return (data as unknown as ApprovalHistoryEntry[]) || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Peminjaman</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola dan setujui permintaan peminjaman
        </p>
      </div>

      {borrowings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada peminjaman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {borrowings.map(borrowing => (
            <BorrowingCard
              key={borrowing.id}
              borrowing={borrowing}
              expanded={expandedId === borrowing.id}
              onToggle={() => setExpandedId(expandedId === borrowing.id ? null : borrowing.id)}
              workflowCache={workflowCache}
              getWorkflow={getWorkflow}
              onItemAction={handleItemAction}
              onReturn={handleReturn}
              onComplete={handleComplete}
              actionLoading={actionLoading}
              fetchHistory={fetchHistory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Borrowing Card Component ----

interface BorrowingCardProps {
  borrowing: Borrowing;
  expanded: boolean;
  onToggle: () => void;
  workflowCache: Record<string, WorkflowTemplate | null>;
  getWorkflow: (id: string) => Promise<WorkflowTemplate | null>;
  onItemAction: (
    item: BorrowingItem,
    borrowing: Borrowing,
    action: 'approve' | 'reject',
    approverName: string,
    approverPosition: string,
    notes: string
  ) => void;
  onReturn: (b: Borrowing) => void;
  onComplete: (b: Borrowing) => void;
  actionLoading: string | null;
  fetchHistory: (id: string) => Promise<ApprovalHistoryEntry[]>;
}

function BorrowingCard({
  borrowing,
  expanded,
  onToggle,
  workflowCache,
  getWorkflow,
  onItemAction,
  onReturn,
  onComplete,
  actionLoading,
  fetchHistory,
}: BorrowingCardProps) {
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [actionItem, setActionItem] = useState<BorrowingItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  const [notes, setNotes] = useState('');

  const loadHistory = async () => {
    if (!showHistory) {
      const h = await fetchHistory(borrowing.id);
      setHistory(h);
    }
    setShowHistory(!showHistory);
  };

  const openAction = (item: BorrowingItem, type: 'approve' | 'reject') => {
    setActionItem(item);
    setActionType(type);
    setApproverName('');
    setApproverPosition('');
    setNotes('');
  };

  const submitAction = () => {
    if (actionItem) {
      onItemAction(actionItem, borrowing, actionType, approverName, approverPosition, notes);
      setActionItem(null);
    }
  };

  const canReturn = borrowing.status === 'approved';
  const canComplete = borrowing.status === 'returned';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            {borrowing.item_type === 'facility' ? (
              <Building2 className="w-5 h-5 text-blue-500" />
            ) : (
              <Package className="w-5 h-5 text-blue-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
              {borrowing.borrower_name ?? '—'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {borrowing.borrower_class ?? '—'} • {borrowing.borrow_date ?? '—'}
              {borrowing.return_date ? ` → ${borrowing.return_date}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium',
              statusColors[borrowing.status] ?? statusColors.pending
            )}
          >
            {borrowing.current_status_label ?? borrowing.status}
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700/50 p-5 space-y-4">
          {/* Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-slate-700 dark:text-slate-200 truncate">{borrowing.borrower_email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Telepon</p>
              <p className="text-slate-700 dark:text-slate-200">{borrowing.borrower_phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Tujuan</p>
              <p className="text-slate-700 dark:text-slate-200 truncate">{borrowing.purpose ?? '—'}</p>
            </div>
            {borrowing.start_time && (
              <div>
                <p className="text-xs text-slate-400">Waktu Mulai</p>
                <p className="text-slate-700 dark:text-slate-200">{borrowing.start_time}</p>
              </div>
            )}
            {borrowing.end_time && (
              <div>
                <p className="text-xs text-slate-400">Waktu Selesai</p>
                <p className="text-slate-700 dark:text-slate-200">{borrowing.end_time}</p>
              </div>
            )}
            {borrowing.notes && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-slate-400">Catatan</p>
                <p className="text-slate-700 dark:text-slate-200">{borrowing.notes}</p>
              </div>
            )}
          </div>

          {/* Items with workflow */}
          {borrowing.borrowing_items && borrowing.borrowing_items.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Item Peminjaman</p>
              {borrowing.borrowing_items.map(item => (
                <ItemWorkflow
                  key={item.id}
                  item={item}
                  borrowing={borrowing}
                  workflowCache={workflowCache}
                  getWorkflow={getWorkflow}
                  onAction={openAction}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {canReturn && (
              <button
                onClick={() => onReturn(borrowing)}
                disabled={actionLoading === borrowing.id}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === borrowing.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Tandai Dikembalikan
              </button>
            )}
            {canComplete && (
              <button
                onClick={() => onComplete(borrowing)}
                disabled={actionLoading === borrowing.id}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === borrowing.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Selesaikan
              </button>
            )}
            <button
              onClick={loadHistory}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <History className="w-4 h-4" />
              Riwayat Approval
            </button>
          </div>

          {/* History */}
          {showHistory && (
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Riwayat Persetujuan</p>
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada riwayat</p>
              ) : (
                history.map(h => (
                  <div key={h.id} className="flex items-start gap-3 text-sm">
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                        h.status === 'approved'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      )}
                    >
                      {h.status === 'approved' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 dark:text-slate-200">
                        <span className="font-medium">{h.approver_name}</span> ({h.approver_role}) — {h.step_label}
                      </p>
                      {h.notes && <p className="text-xs text-slate-400">{h.notes}</p>}
                      <p className="text-xs text-slate-400">
                        {new Date(h.acted_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Action modal */}
          {actionItem && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {actionType === 'approve' ? 'Setujui Item' : 'Tolak Item'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Item: {actionItem.item_name ?? '—'}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Nama Approver
                    </label>
                    <input
                      type="text"
                      value={approverName}
                      onChange={e => setApproverName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Nama lengkap"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Jabatan
                    </label>
                    <input
                      type="text"
                      value={approverPosition}
                      onChange={e => setApproverPosition(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Jabatan/posisi"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Catatan
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Catatan (opsional)"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setActionItem(null)}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={submitAction}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors',
                      actionType === 'approve'
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'bg-red-500 hover:bg-red-600'
                    )}
                  >
                    {actionType === 'approve' ? 'Setujui' : 'Tolak'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Item Workflow Component ----

interface ItemWorkflowProps {
  item: BorrowingItem;
  borrowing: Borrowing;
  workflowCache: Record<string, WorkflowTemplate | null>;
  getWorkflow: (id: string) => Promise<WorkflowTemplate | null>;
  onAction: (item: BorrowingItem, type: 'approve' | 'reject') => void;
  actionLoading: string | null;
}

function ItemWorkflow({ item, borrowing, workflowCache, getWorkflow, onAction, actionLoading }: ItemWorkflowProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const templateId = item.workflow_template_id ?? borrowing.workflow_template_id;
      if (templateId) {
        const wf = workflowCache[templateId];
        if (wf) {
          setSteps(wf.steps);
        } else {
          const w = await getWorkflow(templateId);
          if (w) setSteps(w.steps);
        }
      }
      setLoaded(true);
    };
    load();
  }, [item.workflow_template_id, borrowing.workflow_template_id, workflowCache, getWorkflow]);

  const currentStep = item.current_step ?? 0;
  const isRejected = item.status === 'rejected';
  const isApproved = item.status === 'approved' || item.status === 'completed';
  const isReturned = item.status === 'returned';

  return (
    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {item.item_type === 'facility' ? (
            <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
          ) : (
            <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
            {item.item_name ?? '—'}
          </span>
          <span className="text-xs text-slate-400 flex-shrink-0">×{item.quantity}</span>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded-lg text-xs font-medium flex-shrink-0',
            statusColors[item.status ?? 'pending'] ?? statusColors.pending
          )}
        >
          {item.current_status_label ?? item.status ?? 'pending'}
        </span>
      </div>

      {/* Workflow progress */}
      {loaded && steps.length > 0 && (
        <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
          {steps.map((step, idx) => {
            const isCurrent = step.step_order === currentStep && !isRejected && !isApproved && !isReturned;
            const isPast = step.step_order < currentStep || isApproved || isReturned;
            const isInfo = step.is_info_only;
            return (
              <div key={step.id} className="flex items-center flex-shrink-0">
                {idx > 0 && <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-600" />}
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap',
                    isRejected
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : isCurrent
                        ? 'bg-blue-500 text-white'
                        : isPast
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-600/50 text-slate-400',
                    isInfo && !isCurrent && !isPast && 'opacity-60'
                  )}
                >
                  {isPast && !isRejected && <Check className="w-3 h-3" />}
                  {isRejected && <X className="w-3 h-3" />}
                  <span>{step.step_label}</span>
                  {isInfo && (
                    <span className="text-[10px] opacity-70">(info)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      {!isRejected && !isApproved && !isReturned && (
        <div className="flex gap-2">
          <button
            onClick={() => onAction(item, 'approve')}
            disabled={actionLoading === item.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {actionLoading === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Setujui
          </button>
          <button
            onClick={() => onAction(item, 'reject')}
            disabled={actionLoading === item.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Tolak
          </button>
        </div>
      )}
    </div>
  );
}

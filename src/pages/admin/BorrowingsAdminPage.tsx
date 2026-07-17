import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  User,
  Mail,
  FileText,
  Loader2,
  PackageCheck,
  PackageX,
  ArrowRight,
  Info,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';
import {
  fetchWorkflowTemplate,
  getNextActionableStep,
  isLastActionableStep,
  getCurrentStep,
  type WorkflowStep,
  type WorkflowTemplate,
} from '../../lib/workflow';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  item_name: string;
  item_type: string;
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
  borrower_name: string;
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrow_date: string;
  return_date: string | null;
  status: string;
  purpose: string | null;
  notes: string | null;
  item_type: string | null;
  created_at: string;
}

interface BorrowingWithItems extends Borrowing {
  items: BorrowingItem[];
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  completed: 'Selesai',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

const itemStatusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<BorrowingWithItems[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [templateCache, setTemplateCache] = useState<Map<string, WorkflowTemplate>>(new Map());

  const loadBorrowings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('borrowings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Gagal memuat data peminjaman', 'error');
      setLoading(false);
      return;
    }

    const borrowingsData = (data || []) as unknown as Borrowing[];
    const result: BorrowingWithItems[] = [];

    for (const b of borrowingsData) {
      const { data: itemsData } = await supabase
        .from('borrowing_items')
        .select('*')
        .eq('borrowing_id', b.id)
        .order('created_at', { ascending: true });
      result.push({ ...b, items: (itemsData || []) as unknown as BorrowingItem[] });
    }

    setBorrowings(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBorrowings();
  }, [loadBorrowings]);

  const getTemplate = useCallback(
    async (templateId: string): Promise<WorkflowTemplate | null> => {
      if (templateCache.has(templateId)) return templateCache.get(templateId)!;
      const tmpl = await fetchWorkflowTemplate(templateId);
      if (tmpl) {
        setTemplateCache((prev) => new Map(prev).set(templateId, tmpl));
      }
      return tmpl;
    },
    [templateCache]
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sendEmailNotification = async (
    borrowingId: string,
    type: 'approved' | 'rejected' | 'completed' | 'step_approved',
    extra?: Record<string, string>
  ) => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowingId, type, ...extra }),
      });
    } catch {
      // Email failures are non-blocking
    }
  };

  const handleItemAction = async (
    item: BorrowingItem,
    borrowing: BorrowingWithItems,
    action: 'approve' | 'reject'
  ) => {
    if (!approverName.trim() || !approverPosition.trim()) {
      showToast('Isi nama dan jabatan approver', 'warning');
      return;
    }

    const actionKey = `${item.id}-${action}`;
    setActionLoading(actionKey);

    try {
      const template = item.workflow_template_id
        ? await getTemplate(item.workflow_template_id)
        : null;

      const currentStepNum = item.current_step ?? 1;
      const steps = template?.steps ?? [];
      const currentStep = getCurrentStep(steps, currentStepNum);
      const stepLabel = currentStep?.step_label || item.current_status_label || `Step ${currentStepNum}`;

      // Log to approval_history
      await supabase.from('approval_history').insert({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: currentStepNum,
        step_label: stepLabel,
        approver_name: approverName,
        approver_role: approverPosition,
        status: action === 'approve' ? 'approved' : 'rejected',
        notes: notes || null,
        acted_at: new Date().toISOString(),
      });

      if (action === 'approve') {
        if (template && steps.length > 0) {
          const next = getNextActionableStep(steps, currentStepNum);
          const isLast = isLastActionableStep(steps, currentStepNum);

          if (isLast || !next) {
            // Finalize item
            await supabase
              .from('borrowing_items')
              .update({
                status: 'approved',
                current_status_label: 'Disetujui (Final)',
                assigned_approver_name: approverName,
                assigned_approver_role: approverPosition,
              })
              .eq('id', item.id);

            await sendEmailNotification(borrowing.id, 'step_approved', {
              itemName: item.item_name,
              stepLabel,
            });
          } else if (next) {
            // Advance to next actionable step
            await supabase
              .from('borrowing_items')
              .update({
                current_step: next.step_order,
                current_status_label: next.step_label,
                status: 'pending',
                assigned_approver_name: approverName,
                assigned_approver_role: approverPosition,
              })
              .eq('id', item.id);

            await sendEmailNotification(borrowing.id, 'step_approved', {
              itemName: item.item_name,
              stepLabel,
              nextStep: next.step_label,
            });
          }
        } else {
          // No workflow template — simple approve
          await supabase
            .from('borrowing_items')
            .update({
              status: 'approved',
              current_status_label: 'Disetujui',
              assigned_approver_name: approverName,
              assigned_approver_role: approverPosition,
            })
            .eq('id', item.id);

          await sendEmailNotification(borrowing.id, 'approved', {
            itemName: item.item_name,
          });
        }
      } else {
        // Reject
        await supabase
          .from('borrowing_items')
          .update({
            status: 'rejected',
            current_status_label: 'Ditolak',
            assigned_approver_name: approverName,
            assigned_approver_role: approverPosition,
          })
          .eq('id', item.id);

        await sendEmailNotification(borrowing.id, 'rejected', {
          itemName: item.item_name,
        });
      }

      // Check if all items are finalized to update borrowing status
      await refreshBorrowingStatus(borrowing.id);

      showToast(
        action === 'approve' ? 'Item berhasil disetujui' : 'Item ditolak',
        action === 'approve' ? 'success' : 'info'
      );
      setNotes('');
      await loadBorrowings();
    } catch (err) {
      showToast('Terjadi kesalahan saat memproses', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const refreshBorrowingStatus = async (borrowingId: string) => {
    const { data: items } = await supabase
      .from('borrowing_items')
      .select('status')
      .eq('borrowing_id', borrowingId);

    if (!items || items.length === 0) return;

    const allItems = items as unknown as { status: string }[];
    const allApproved = allItems.every((i) => i.status === 'approved' || i.status === 'completed' || i.status === 'returned');
    const anyRejected = allItems.some((i) => i.status === 'rejected');

    let newStatus = 'pending';
    if (anyRejected && !allApproved) {
      newStatus = 'rejected';
    } else if (allApproved) {
      newStatus = 'approved';
    }

    await supabase
      .from('borrowings')
      .update({ status: newStatus })
      .eq('id', borrowingId);
  };

  const handleBulkAction = async (
    borrowing: BorrowingWithItems,
    action: 'approve' | 'reject'
  ) => {
    if (!approverName.trim() || !approverPosition.trim()) {
      showToast('Isi nama dan jabatan approver', 'warning');
      return;
    }

    const actionKey = `bulk-${borrowing.id}-${action}`;
    setActionLoading(actionKey);

    try {
      for (const item of borrowing.items) {
        if (item.status === 'approved' || item.status === 'rejected' || item.status === 'completed') continue;

        const template = item.workflow_template_id
          ? await getTemplate(item.workflow_template_id)
          : null;
        const currentStepNum = item.current_step ?? 1;
        const steps = template?.steps ?? [];
        const currentStep = getCurrentStep(steps, currentStepNum);
        const stepLabel = currentStep?.step_label || item.current_status_label || `Step ${currentStepNum}`;

        await supabase.from('approval_history').insert({
          borrowing_id: borrowing.id,
          borrowing_item_id: item.id,
          step_order: currentStepNum,
          step_label: stepLabel,
          approver_name: approverName,
          approver_role: approverPosition,
          status: action === 'approve' ? 'approved' : 'rejected',
          notes: notes || null,
          acted_at: new Date().toISOString(),
        });

        if (action === 'approve') {
          if (template && steps.length > 0) {
            const isLast = isLastActionableStep(steps, currentStepNum);
            if (isLast) {
              await supabase
                .from('borrowing_items')
                .update({
                  status: 'approved',
                  current_status_label: 'Disetujui (Final)',
                  assigned_approver_name: approverName,
                  assigned_approver_role: approverPosition,
                })
                .eq('id', item.id);
            } else {
              const next = getNextActionableStep(steps, currentStepNum);
              await supabase
                .from('borrowing_items')
                .update({
                  current_step: next ? next.step_order : currentStepNum,
                  current_status_label: next ? next.step_label : 'Disetujui (Final)',
                  status: next ? 'pending' : 'approved',
                  assigned_approver_name: approverName,
                  assigned_approver_role: approverPosition,
                })
                .eq('id', item.id);
            }
          } else {
            await supabase
              .from('borrowing_items')
              .update({
                status: 'approved',
                current_status_label: 'Disetujui',
                assigned_approver_name: approverName,
                assigned_approver_role: approverPosition,
              })
              .eq('id', item.id);
          }
        } else {
          await supabase
            .from('borrowing_items')
            .update({
              status: 'rejected',
              current_status_label: 'Ditolak',
              assigned_approver_name: approverName,
              assigned_approver_role: approverPosition,
            })
            .eq('id', item.id);
        }
      }

      await refreshBorrowingStatus(borrowing.id);
      await sendEmailNotification(borrowing.id, action === 'approve' ? 'approved' : 'rejected');
      showToast(
        action === 'approve'
          ? 'Semua item berhasil disetujui'
          : 'Peminjaman ditolak',
        action === 'approve' ? 'success' : 'info'
      );
      setNotes('');
      await loadBorrowings();
    } catch {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReturned = async (borrowing: BorrowingWithItems) => {
    setActionLoading(`return-${borrowing.id}`);
    try {
      for (const item of borrowing.items) {
        if (item.status === 'approved') {
          await supabase
            .from('borrowing_items')
            .update({ status: 'returned', current_status_label: 'Dikembalikan' })
            .eq('id', item.id);
        }
      }
      await supabase
        .from('borrowings')
        .update({ status: 'returned', actual_return_date: new Date().toISOString().slice(0, 10) })
        .eq('id', borrowing.id);

      showToast('Peminjaman ditandai sebagai dikembalikan', 'success');
      await loadBorrowings();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkCompleted = async (borrowing: BorrowingWithItems) => {
    setActionLoading(`complete-${borrowing.id}`);
    try {
      await supabase
        .from('borrowings')
        .update({ status: 'completed' })
        .eq('id', borrowing.id);
      showToast('Peminjaman ditandai sebagai selesai', 'success');
      await loadBorrowings();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const WorkflowProgress = ({ item }: { item: BorrowingItem }) => {
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      let active = true;
      (async () => {
        if (item.workflow_template_id) {
          const tmpl = await getTemplate(item.workflow_template_id);
          if (active && tmpl) setSteps(tmpl.steps);
        }
        if (active) setLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [item.workflow_template_id]);

    if (!loaded) return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
    if (steps.length === 0) return null;

    const currentStepNum = item.current_step ?? 1;

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((step, idx) => {
          const isCurrent = step.step_order === currentStepNum;
          const isPast = step.step_order < currentStepNum;
          const isApproved = isPast || (isCurrent && (item.status === 'approved' || item.status === 'completed' || item.status === 'returned'));
          const isRejected = isCurrent && item.status === 'rejected';

          return (
            <div key={step.id} className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border',
                  isApproved && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
                  isCurrent && !isApproved && !isRejected && 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700',
                  isRejected && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
                  !isApproved && !isCurrent && !isRejected && 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-700/30 dark:text-slate-500 dark:border-slate-700'
                )}
              >
                {isApproved && <CheckCircle className="w-3.5 h-3.5" />}
                {isRejected && <XCircle className="w-3.5 h-3.5" />}
                {isCurrent && !isApproved && !isRejected && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>{step.step_label}</span>
                {step.is_info_only && (
                  <Info className="w-3 h-3 opacity-50" />
                )}
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Manajemen Peminjaman
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola dan setujui peminjaman dengan workflow approval
        </p>
      </div>

      {/* Approver inputs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Informasi Approver
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Nama approver"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={approverPosition}
              onChange={(e) => setApproverPosition(e.target.value)}
              placeholder="Jabatan approver"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
        <div className="relative mt-3">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan (opsional)"
            rows={2}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          />
        </div>
      </div>

      {/* Borrowings list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : borrowings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-400">Belum ada peminjaman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {borrowings.map((borrowing) => {
            const isExpanded = expanded.has(borrowing.id);
            const pendingItems = borrowing.items.filter(
              (i) => i.status === 'pending'
            ).length;
            const allApproved = borrowing.items.length > 0 && borrowing.items.every(
              (i) => i.status === 'approved' || i.status === 'completed' || i.status === 'returned'
            );

            return (
              <div
                key={borrowing.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  onClick={() => toggleExpand(borrowing.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {borrowing.borrower_name}
                      </p>
                      {borrowing.borrower_class && (
                        <span className="text-xs text-slate-400">
                          {borrowing.borrower_class}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 truncate mt-0.5">
                      {borrowing.purpose || 'Tanpa keterangan'} ·{' '}
                      {new Date(borrowing.borrow_date).toLocaleDateString('id-ID')}{' '}
                      {borrowing.return_date &&
                        `→ ${new Date(borrowing.return_date).toLocaleDateString('id-ID')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {borrowing.items.length > 0 && (
                      <span className="text-xs text-slate-400 hidden sm:block">
                        {borrowing.items.length} item · {pendingItems} pending
                      </span>
                    )}
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium',
                        statusStyles[borrowing.status] || statusStyles.pending
                      )}
                    >
                      {statusLabel[borrowing.status] || borrowing.status}
                    </span>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-4">
                    {/* Borrower contact info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Email</p>
                        <p className="text-slate-700 dark:text-slate-300">
                          {borrowing.borrower_email || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Telepon</p>
                        <p className="text-slate-700 dark:text-slate-300">
                          {borrowing.borrower_phone || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Tipe</p>
                        <p className="text-slate-700 dark:text-slate-300">
                          {borrowing.item_type || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Bulk actions */}
                    {borrowing.status === 'pending' && borrowing.items.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleBulkAction(borrowing, 'approve')}
                          disabled={actionLoading === `bulk-${borrowing.id}-approve`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === `bulk-${borrowing.id}-approve` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Setujui Semua
                        </button>
                        <button
                          onClick={() => handleBulkAction(borrowing, 'reject')}
                          disabled={actionLoading === `bulk-${borrowing.id}-reject`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === `bulk-${borrowing.id}-reject` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Tolak Semua
                        </button>
                      </div>
                    )}

                    {/* Return / Complete actions */}
                    {borrowing.status === 'approved' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleMarkReturned(borrowing)}
                          disabled={actionLoading === `return-${borrowing.id}`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                          <PackageCheck className="w-4 h-4" />
                          Tandai Dikembalikan
                        </button>
                        <button
                          onClick={() => handleMarkCompleted(borrowing)}
                          disabled={actionLoading === `complete-${borrowing.id}`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Tandai Selesai
                        </button>
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-3">
                      {borrowing.items.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">
                          Tidak ada item dalam peminjaman ini
                        </p>
                      ) : (
                        borrowing.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {item.item_name}
                                </p>
                                <p className="text-sm text-slate-400">
                                  {item.item_type} · Qty: {item.quantity}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  'px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0',
                                  itemStatusStyles[item.status] || itemStatusStyles.pending
                                )}
                              >
                                {item.current_status_label || statusLabel[item.status] || item.status}
                              </span>
                            </div>

                            {/* Workflow progress */}
                            <WorkflowProgress item={item} />

                            {/* Assigned approver */}
                            {item.assigned_approver_name && (
                              <p className="text-xs text-slate-400">
                                Approver: {item.assigned_approver_name}
                                {item.assigned_approver_role && ` (${item.assigned_approver_role})`}
                              </p>
                            )}

                            {/* Per-item actions */}
                            {(item.status === 'pending') && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  onClick={() => handleItemAction(item, borrowing, 'approve')}
                                  disabled={actionLoading === `${item.id}-approve`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === `${item.id}-approve` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleItemAction(item, borrowing, 'reject')}
                                  disabled={actionLoading === `${item.id}-reject`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === `${item.id}-reject` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <PackageX className="w-4 h-4" />
                                  )}
                                  Tolak
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
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

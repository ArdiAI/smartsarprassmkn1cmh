import { useEffect, useState } from 'react';
import {
  PackageOpen,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCheck,
  User,
  Mail,
  FileText,
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
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string;
  item_name: string;
  quantity: number;
  status: string;
  current_status_label: string;
  workflow_template_id: string | null;
  current_step: number;
  assigned_approver_name: string | null;
  assigned_approver_role: string | null;
  created_at: string;
  updated_at: string;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  borrower_email: string;
  borrower_phone: string;
  item_type: string;
  status: string;
  notes: string;
  purpose: string;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [workflowCache, setWorkflowCache] = useState<Record<string, WorkflowTemplate>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const fetchBorrowings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('borrowings')
      .select('*, borrowing_items(*)')
      .order('created_at', { ascending: false });
    setBorrowings((data as unknown as Borrowing[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBorrowings();
  }, []);

  const getWorkflow = async (templateId: string): Promise<WorkflowTemplate | null> => {
    if (workflowCache[templateId]) return workflowCache[templateId];
    const template = await fetchWorkflowTemplate(templateId);
    if (template) {
      setWorkflowCache((prev) => ({ ...prev, [templateId]: template }));
    }
    return template;
  };

  const sendEmail = async (borrowingId: string, eventType: string) => {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowingId, eventType }),
      });
    } catch {
      // email failures are non-blocking
    }
  };

  const handleApprove = async (item: BorrowingItem, borrowing: Borrowing) => {
    if (!approverName.trim() || !approverPosition.trim()) {
      showToast('Nama dan jabatan approver wajib diisi', 'warning');
      return;
    }
    setActionLoading(item.id);
    try {
      const templateId = item.workflow_template_id ?? '';
      if (!templateId) {
        showToast('Item tidak memiliki workflow template', 'error');
        setActionLoading(null);
        return;
      }
      const template = await getWorkflow(templateId);
      if (!template) {
        showToast('Workflow template tidak ditemukan', 'error');
        setActionLoading(null);
        return;
      }

      const currentStepNum = item.current_step ?? 0;
      const currentStep = getCurrentStep(template.steps, currentStepNum);
      const isLast = isLastActionableStep(template.steps, currentStepNum);
      const nextStep = getNextActionableStep(template.steps, currentStepNum);

      let newStatus: string;
      let newStep: number;
      let newLabel: string;

      if (isLast) {
        newStatus = 'approved';
        newStep = currentStepNum;
        newLabel = 'Disetujui - Selesai';
      } else {
        newStatus = 'approved';
        newStep = nextStep?.step_order ?? currentStepNum;
        newLabel = nextStep?.step_label ?? 'Menunggu Persetujuan';
      }

      // Update borrowing item
      await supabase
        .from('borrowing_items')
        .update({
          status: newStatus,
          current_step: newStep,
          current_status_label: newLabel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      // Log to approval_history
      await supabase.from('approval_history').insert({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: currentStep?.step_order ?? currentStepNum,
        step_label: currentStep?.step_label ?? '',
        approver_name: approverName,
        approver_role: approverPosition,
        status: 'approved',
        notes: actionNotes || null,
        acted_at: new Date().toISOString(),
      });

      // Update parent borrowing status if all items approved or at least one approved
      const { data: allItems } = await supabase
        .from('borrowing_items')
        .select('id, status')
        .eq('borrowing_id', borrowing.id);
      const items = (allItems as unknown as { id: string; status: string }[]) || [];
      const allApproved = items.length > 0 && items.every((i) => i.status === 'approved');
      const anyRejected = items.some((i) => i.status === 'rejected');

      if (allApproved) {
        await supabase
          .from('borrowings')
          .update({ status: 'approved', approved_by: approverName, approver_position: approverPosition, approved_at: new Date().toISOString() })
          .eq('id', borrowing.id);
      } else if (!anyRejected) {
        await supabase
          .from('borrowings')
          .update({ status: 'approved' })
          .eq('id', borrowing.id);
      }

      await sendEmail(borrowing.id, isLast ? 'approved_final' : 'approved_step');

      showToast(`Item ${item.item_name ?? ''} disetujui`, 'success');
      setApproverName('');
      setApproverPosition('');
      setActionNotes('');
      setActiveItemId(null);
      await fetchBorrowings();
    } catch (err) {
      showToast('Gagal menyetujui item', 'error');
      console.error(err);
    }
    setActionLoading(null);
  };

  const handleReject = async (item: BorrowingItem, borrowing: Borrowing) => {
    if (!approverName.trim() || !approverPosition.trim()) {
      showToast('Nama dan jabatan approver wajib diisi', 'warning');
      return;
    }
    setActionLoading(item.id);
    try {
      const templateId = item.workflow_template_id ?? '';
      const template = templateId ? await getWorkflow(templateId) : null;
      const currentStepNum = item.current_step ?? 0;
      const currentStep = template ? getCurrentStep(template.steps, currentStepNum) : undefined;

      await supabase
        .from('borrowing_items')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      await supabase.from('approval_history').insert({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: currentStep?.step_order ?? currentStepNum,
        step_label: currentStep?.step_label ?? '',
        approver_name: approverName,
        approver_role: approverPosition,
        status: 'rejected',
        notes: actionNotes || null,
        acted_at: new Date().toISOString(),
      });

      await supabase
        .from('borrowings')
        .update({ status: 'rejected' })
        .eq('id', borrowing.id);

      await sendEmail(borrowing.id, 'rejected');

      showToast(`Item ${item.item_name ?? ''} ditolak`, 'success');
      setApproverName('');
      setApproverPosition('');
      setActionNotes('');
      setActiveItemId(null);
      await fetchBorrowings();
    } catch (err) {
      showToast('Gagal menolak item', 'error');
      console.error(err);
    }
    setActionLoading(null);
  };

  const handleReturn = async (item: BorrowingItem, borrowing: Borrowing) => {
    setActionLoading(item.id);
    try {
      await supabase
        .from('borrowing_items')
        .update({
          status: 'returned',
          current_status_label: 'Dikembalikan',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      await supabase
        .from('borrowings')
        .update({ status: 'returned', actual_return_date: new Date().toISOString() })
        .eq('id', borrowing.id);

      showToast(`Item ${item.item_name ?? ''} ditandai dikembalikan`, 'success');
      await fetchBorrowings();
    } catch (err) {
      showToast('Gagal menandai pengembalian', 'error');
      console.error(err);
    }
    setActionLoading(null);
  };

  const handleComplete = async (item: BorrowingItem, borrowing: Borrowing) => {
    setActionLoading(item.id);
    try {
      await supabase
        .from('borrowing_items')
        .update({
          status: 'completed',
          current_status_label: 'Selesai',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      await supabase
        .from('borrowings')
        .update({ status: 'completed' })
        .eq('id', borrowing.id);

      showToast(`Item ${item.item_name ?? ''} diselesaikan`, 'success');
      await fetchBorrowings();
    } catch (err) {
      showToast('Gagal menyelesaikan item', 'error');
      console.error(err);
    }
    setActionLoading(null);
  };

  const renderWorkflowProgress = (item: BorrowingItem, steps: WorkflowStep[]) => {
    if (!steps || steps.length === 0) return null;
    const currentStepNum = item.current_step ?? 0;
    return (
      <div className="flex items-center gap-1 flex-wrap mt-3">
        {steps.map((step, idx) => {
          const isCompleted = step.step_order < currentStepNum;
          const isCurrent = step.step_order === currentStepNum;
          const isInfoOnly = step.is_info_only;
          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                  isCompleted && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                  isCurrent && !isInfoOnly && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-2 ring-blue-400',
                  isCurrent && isInfoOnly && 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 ring-2 ring-cyan-400',
                  !isCompleted && !isCurrent && 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                )}
              >
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                {isCurrent && !isInfoOnly && <Clock className="w-3.5 h-3.5" />}
                <span>{step.step_label}</span>
              </div>
              {idx < steps.length - 1 && <div className="w-4 h-px bg-slate-300 dark:bg-slate-600 mx-0.5" />}
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
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Peminjaman</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola dan setujui permintaan peminjaman dengan workflow
        </p>
      </div>

      {borrowings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <PackageOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada peminjaman</p>
        </div>
      ) : (
        <div className="space-y-4">
          {borrowings.map((borrowing) => {
            const isExpanded = expandedId === borrowing.id;
            return (
              <div
                key={borrowing.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : borrowing.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <PackageOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        {borrowing.borrower_name ?? 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {borrowing.borrower_class ?? ''} • {new Date(borrowing.created_at ?? '').toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('px-3 py-1 rounded-full text-xs font-medium', statusStyles[borrowing.status] ?? statusStyles.pending)}>
                      {statusLabels[borrowing.status] ?? borrowing.status}
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-5 space-y-4">
                    {/* Borrower info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{borrowing.borrower_email ?? '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{borrowing.borrower_phone ?? '-'}</span>
                      </div>
                      {borrowing.purpose && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{borrowing.purpose}</span>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                      {borrowing.borrowing_items?.map((item) => {
                        const templateId = item.workflow_template_id ?? '';
                        const template = templateId ? workflowCache[templateId] : null;
                        const isActive = activeItemId === item.id;
                        return (
                          <div
                            key={item.id}
                            className="border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-white">
                                  {item.item_name ?? 'Item'} ({item.item_type ?? ''})
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Jumlah: {item.quantity ?? 0} • Status: {item.current_status_label ?? item.status ?? ''}
                                </p>
                              </div>
                              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[item.status] ?? statusStyles.pending)}>
                                {statusLabels[item.status] ?? item.status}
                              </span>
                            </div>

                            {template && renderWorkflowProgress(item, template.steps)}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 mt-4 flex-wrap">
                              {(item.status === 'pending' || item.status === 'approved') && (
                                <>
                                  <button
                                    onClick={() => setActiveItemId(isActive ? null : item.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> Setujui
                                  </button>
                                  <button
                                    onClick={() => setActiveItemId(isActive ? null : item.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" /> Tolak
                                  </button>
                                </>
                              )}
                              {item.status === 'approved' && (
                                <button
                                  onClick={() => handleReturn(item, borrowing)}
                                  disabled={actionLoading === item.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                                >
                                  <RotateCcw className="w-4 h-4" /> Tandai Dikembalikan
                                </button>
                              )}
                              {item.status === 'returned' && (
                                <button
                                  onClick={() => handleComplete(item, borrowing)}
                                  disabled={actionLoading === item.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors disabled:opacity-50"
                                >
                                  <CheckCheck className="w-4 h-4" /> Selesaikan
                                </button>
                              )}
                            </div>

                            {/* Approval form */}
                            {isActive && (item.status === 'pending' || item.status === 'approved') && (
                              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Nama Approver *</label>
                                    <input
                                      type="text"
                                      value={approverName}
                                      onChange={(e) => setApproverName(e.target.value)}
                                      placeholder="Nama lengkap"
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Jabatan *</label>
                                    <input
                                      type="text"
                                      value={approverPosition}
                                      onChange={(e) => setApproverPosition(e.target.value)}
                                      placeholder="Jabatan / posisi"
                                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Catatan</label>
                                  <textarea
                                    value={actionNotes}
                                    onChange={(e) => setActionNotes(e.target.value)}
                                    placeholder="Catatan tambahan (opsional)"
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleApprove(item, borrowing)}
                                    disabled={actionLoading === item.id}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {actionLoading === item.id ? 'Memproses...' : 'Setujui'}
                                  </button>
                                  <button
                                    onClick={() => handleReject(item, borrowing)}
                                    disabled={actionLoading === item.id}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    {actionLoading === item.id ? 'Memproses...' : 'Tolak'}
                                  </button>
                                  <button
                                    onClick={() => { setActiveItemId(null); setApproverName(''); setApproverPosition(''); setActionNotes(''); }}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {(!borrowing.borrowing_items || borrowing.borrowing_items.length === 0) && (
                        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Tidak ada item pada peminjaman ini</p>
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

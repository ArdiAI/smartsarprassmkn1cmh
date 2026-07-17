import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  Package, Building2, User, FileText, Mail, Loader2, History,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  fetchWorkflowTemplate, getNextActionableStep, isLastActionableStep,
  getCurrentStep, type WorkflowStep, type WorkflowTemplate,
} from '../../lib/workflow';

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
  updated_at: string | null;
}

interface Borrowing {
  id: string;
  inventory_id: string | null;
  borrower_name: string;
  borrower_class: string | null;
  borrowed_units: number | null;
  borrow_date: string | null;
  return_date: string | null;
  actual_return_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  borrower_email: string | null;
  borrower_phone: string | null;
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
  drive_file_id: string | null;
  drive_file_url: string | null;
  borrowing_items: BorrowingItem[];
}

interface ApprovalHistoryEntry {
  id: string;
  borrowing_id: string;
  step_order: number;
  step_label: string;
  approver_name: string;
  approver_role: string;
  status: string;
  notes: string | null;
  acted_at: string;
  created_at: string;
  borrowing_item_id: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
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
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [historyMap, setHistoryMap] = useState<Record<string, ApprovalHistoryEntry[]>>({});
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('borrowings')
        .select('*, borrowing_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data as unknown as Borrowing[]) || [];
      setBorrowings(rows);

      // Fetch workflow templates for all unique template IDs
      const templateIds = new Set<string>();
      rows.forEach((b) => {
        if (b.workflow_template_id) templateIds.add(b.workflow_template_id);
        b.borrowing_items?.forEach((item) => {
          if (item.workflow_template_id) templateIds.add(item.workflow_template_id);
        });
      });

      const cache: Record<string, WorkflowTemplate> = {};
      for (const tid of templateIds) {
        const tmpl = await fetchWorkflowTemplate(tid);
        if (tmpl) cache[tid] = tmpl;
      }
      setWorkflowCache(cache);

      // Fetch approval history for all borrowings
      if (rows.length > 0) {
        const { data: histData } = await supabase
          .from('approval_history')
          .select('*')
          .in('borrowing_id', rows.map((r) => r.id))
          .order('acted_at', { ascending: true });
        const hMap: Record<string, ApprovalHistoryEntry[]> = {};
        (histData as unknown as ApprovalHistoryEntry[] || []).forEach((h) => {
          if (!hMap[h.borrowing_id]) hMap[h.borrowing_id] = [];
          hMap[h.borrowing_id].push(h);
        });
        setHistoryMap(hMap);
      }
    } catch (err) {
      console.error('Fetch borrowings error:', err);
      showToast('Gagal memuat data peminjaman', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  async function sendBorrowingEmail(borrowingId: string, eventType: string) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v2/send-borrowing-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowingId, eventType }),
      });
    } catch (err) {
      console.error('Email send error:', err);
    }
  }

  async function handleApproveItem(borrowing: Borrowing, item: BorrowingItem) {
    if (!approverName.trim()) {
      showToast('Masukkan nama approver', 'warning');
      return;
    }
    if (!approverPosition.trim()) {
      showToast('Masukkan jabatan approver', 'warning');
      return;
    }

    const templateId = item.workflow_template_id ?? borrowing.workflow_template_id;
    if (!templateId) {
      showToast('Template workflow tidak ditemukan', 'error');
      return;
    }

    const template = workflowCache[templateId];
    if (!template) {
      showToast('Template workflow tidak ditemukan', 'error');
      return;
    }

    const steps = template.steps;
    const currentStepNum = item.current_step ?? 0;
    const currentStep = getCurrentStep(steps, currentStepNum);
    const notes = actionNotes[item.id] ?? '';

    setActionLoading(item.id);

    try {
      // Log to approval_history
      await supabase.from('approval_history').insert({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: currentStepNum,
        step_label: currentStep?.step_label ?? `Step ${currentStepNum}`,
        approver_name: approverName,
        approver_role: approverPosition,
        status: 'approved',
        notes: notes || null,
        acted_at: new Date().toISOString(),
      });

      if (isLastActionableStep(steps, currentStepNum)) {
        // Finalize - mark item as approved and borrowing as approved
        await supabase
          .from('borrowing_items')
          .update({
            status: 'approved',
            current_status_label: 'Disetujui',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        // Check if all items are approved to mark borrowing as approved
        const { data: allItems } = await supabase
          .from('borrowing_items')
          .select('status')
          .eq('borrowing_id', borrowing.id);

        const itemsList = (allItems as unknown as { status: string | null }[]) || [];
        const allApproved = itemsList.length > 0 && itemsList.every((i) => i.status === 'approved');

        if (allApproved) {
          await supabase
            .from('borrowings')
            .update({
              status: 'approved',
              approved_by: approverName,
              approver_position: approverPosition,
              approved_at: new Date().toISOString(),
            })
            .eq('id', borrowing.id);
        }

        showToast('Item disetujui - workflow selesai', 'success');
        await sendBorrowingEmail(borrowing.id, 'approved');
      } else {
        // Advance to next actionable step
        const nextStep = getNextActionableStep(steps, currentStepNum);
        if (nextStep) {
          await supabase
            .from('borrowing_items')
            .update({
              current_step: nextStep.step_order,
              current_status_label: nextStep.step_label,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          showToast(`Item maju ke step: ${nextStep.step_label}`, 'success');
          await sendBorrowingEmail(borrowing.id, 'step_approved');
        }
      }

      setActionNotes((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      await fetchBorrowings();
    } catch (err) {
      console.error('Approve error:', err);
      showToast('Gagal menyetujui item', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectItem(borrowing: Borrowing, item: BorrowingItem) {
    if (!approverName.trim()) {
      showToast('Masukkan nama approver', 'warning');
      return;
    }
    if (!approverPosition.trim()) {
      showToast('Masukkan jabatan approver', 'warning');
      return;
    }

    const templateId = item.workflow_template_id ?? borrowing.workflow_template_id;
    const template = templateId ? workflowCache[templateId] : null;
    const steps = template?.steps ?? [];
    const currentStepNum = item.current_step ?? 0;
    const currentStep = getCurrentStep(steps, currentStepNum);
    const notes = actionNotes[item.id] ?? '';

    setActionLoading(item.id);

    try {
      await supabase.from('approval_history').insert({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: currentStepNum,
        step_label: currentStep?.step_label ?? `Step ${currentStepNum}`,
        approver_name: approverName,
        approver_role: approverPosition,
        status: 'rejected',
        notes: notes || null,
        acted_at: new Date().toISOString(),
      });

      await supabase
        .from('borrowing_items')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      await supabase
        .from('borrowings')
        .update({ status: 'rejected' })
        .eq('id', borrowing.id);

      showToast('Item ditolak', 'info');
      await sendBorrowingEmail(borrowing.id, 'rejected');

      setActionNotes((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      await fetchBorrowings();
    } catch (err) {
      console.error('Reject error:', err);
      showToast('Gagal menolak item', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkReturned(borrowing: Borrowing) {
    setActionLoading(borrowing.id);
    try {
      await supabase
        .from('borrowings')
        .update({
          status: 'returned',
          actual_return_date: new Date().toISOString(),
        })
        .eq('id', borrowing.id);

      await supabase
        .from('borrowing_items')
        .update({
          status: 'returned',
          current_status_label: 'Dikembalikan',
          updated_at: new Date().toISOString(),
        })
        .eq('borrowing_id', borrowing.id);

      showToast('Peminjaman ditandai sebagai dikembalikan', 'success');
      await sendBorrowingEmail(borrowing.id, 'returned');
      await fetchBorrowings();
    } catch (err) {
      console.error('Return error:', err);
      showToast('Gagal menandai pengembalian', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkCompleted(borrowing: Borrowing) {
    setActionLoading(borrowing.id);
    try {
      await supabase
        .from('borrowings')
        .update({ status: 'completed' })
        .eq('id', borrowing.id);

      await supabase
        .from('borrowing_items')
        .update({
          status: 'completed',
          current_status_label: 'Selesai',
          updated_at: new Date().toISOString(),
        })
        .eq('borrowing_id', borrowing.id);

      showToast('Peminjaman diselesaikan', 'success');
      await fetchBorrowings();
    } catch (err) {
      console.error('Complete error:', err);
      showToast('Gagal menyelesaikan peminjaman', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  function renderWorkflowProgress(item: BorrowingItem, borrowing: Borrowing) {
    const templateId = item.workflow_template_id ?? borrowing.workflow_template_id;
    const template = templateId ? workflowCache[templateId] : null;
    if (!template) {
      return (
        <div className="text-xs text-slate-500 dark:text-slate-400 italic">
          Tidak ada workflow template
        </div>
      );
    }

    const steps = template.steps;
    const currentStepNum = item.current_step ?? 0;
    const itemStatus = item.status ?? borrowing.status;

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((step: WorkflowStep, idx: number) => {
          const isCurrent = step.step_order === currentStepNum;
          const isPast = step.step_order < currentStepNum || itemStatus === 'approved' || itemStatus === 'completed';
          const isRejected = itemStatus === 'rejected' && isCurrent;
          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                  isRejected
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : isCurrent
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-2 ring-blue-300 dark:ring-blue-700'
                    : isPast
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                )}
              >
                {isRejected ? (
                  <XCircle className="w-3 h-3" />
                ) : isPast && !isCurrent ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : isCurrent ? (
                  <Clock className="w-3 h-3" />
                ) : (
                  <span className="w-3 h-3 rounded-full border border-current opacity-40" />
                )}
                <span>{step.step_label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={cn('w-4 h-0.5 mx-0.5', isPast ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700')} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const filteredBorrowings = filterStatus === 'all'
    ? borrowings
    : borrowings.filter((b) => b.status === filterStatus);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Peminjaman</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola dan setujui peminjaman dengan workflow approval
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'pending', 'approved', 'returned', 'rejected', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filterStatus === s
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
            )}
          >
            {s === 'all' ? 'Semua' : statusLabels[s] ?? s}
          </button>
        ))}
      </div>

      {/* Approver inputs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Identitas Approver (berlaku untuk semua aksi)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Nama Approver</label>
            <input
              type="text"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Nama lengkap approver"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Jabatan</label>
            <input
              type="text"
              value={approverPosition}
              onChange={(e) => setApproverPosition(e.target.value)}
              placeholder="Jabatan/posisi approver"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Borrowings list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredBorrowings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada peminjaman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBorrowings.map((borrowing) => {
            const isExpanded = expandedId === borrowing.id;
            const history = historyMap[borrowing.id] ?? [];
            return (
              <div
                key={borrowing.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                {/* Header row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : borrowing.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {borrowing.borrower_name ?? 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {borrowing.borrower_class ?? '-'} • {borrowing.item_type ?? 'Item'} • {new Date(borrowing.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', statusColors[borrowing.status] ?? statusColors.pending)}>
                      {statusLabels[borrowing.status] ?? borrowing.status}
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4">
                    {/* Details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Peminjam</p>
                          <p className="text-slate-900 dark:text-white">{borrowing.borrower_name ?? '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                          <p className="text-slate-900 dark:text-white truncate">{borrowing.borrower_email ?? '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Tujuan</p>
                          <p className="text-slate-900 dark:text-white">{borrowing.purpose ?? '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Tanggal Pinjam</p>
                          <p className="text-slate-900 dark:text-white">{borrowing.borrow_date ? new Date(borrowing.borrow_date).toLocaleDateString('id-ID') : '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Tanggal Kembali</p>
                          <p className="text-slate-900 dark:text-white">{borrowing.return_date ? new Date(borrowing.return_date).toLocaleDateString('id-ID') : '-'}</p>
                        </div>
                      </div>
                      {borrowing.notes && (
                        <div className="flex items-start gap-2 text-sm">
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Catatan</p>
                            <p className="text-slate-900 dark:text-white">{borrowing.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Borrowing items */}
                    {borrowing.borrowing_items && borrowing.borrowing_items.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Item Peminjaman</p>
                        {borrowing.borrowing_items.map((item) => {
                          const itemStatus = item.status ?? borrowing.status;
                          const canAct = itemStatus === 'pending' || itemStatus === 'approved';
                          return (
                            <div
                              key={item.id}
                              className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 space-y-3"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  {item.item_type === 'facility' || item.item_type === 'fasilitas' ? (
                                    <Building2 className="w-4 h-4 text-indigo-500" />
                                  ) : (
                                    <Package className="w-4 h-4 text-cyan-500" />
                                  )}
                                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                                    {item.item_name ?? 'Item'}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    (Qty: {item.quantity})
                                  </span>
                                </div>
                                <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', statusColors[itemStatus] ?? statusColors.pending)}>
                                  {statusLabels[itemStatus] ?? itemStatus}
                                </span>
                              </div>

                              {/* Workflow progress */}
                              {renderWorkflowProgress(item, borrowing)}

                              {/* Approver assignment info */}
                              {item.assigned_approver_name && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Approver: {item.assigned_approver_name} ({item.assigned_approver_role ?? '-'})
                                </p>
                              )}

                              {/* Action area */}
                              {canAct && (
                                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                  <textarea
                                    value={actionNotes[item.id] ?? ''}
                                    onChange={(e) => setActionNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                    placeholder="Catatan untuk approval ini..."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleApproveItem(borrowing, item)}
                                      disabled={actionLoading === item.id}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                    >
                                      {actionLoading === item.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                      )}
                                      <span>Setujui</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectItem(borrowing, item)}
                                      disabled={actionLoading === item.id}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>Tolak</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Top-level actions */}
                    {(borrowing.status === 'approved' || borrowing.status === 'returned') && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        {borrowing.status === 'approved' && (
                          <button
                            onClick={() => handleMarkReturned(borrowing)}
                            disabled={actionLoading === borrowing.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === borrowing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Tandai Dikembalikan</span>
                          </button>
                        )}
                        {borrowing.status === 'returned' && (
                          <button
                            onClick={() => handleMarkCompleted(borrowing)}
                            disabled={actionLoading === borrowing.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === borrowing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Selesaikan</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Approval history */}
                    {history.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <History className="w-4 h-4 text-slate-400" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Riwayat Approval</p>
                        </div>
                        <div className="space-y-2">
                          {history.map((h) => (
                            <div key={h.id} className="flex items-start gap-2 text-xs">
                              <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', h.status === 'approved' ? 'bg-emerald-500' : h.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500')} />
                              <div>
                                <p className="text-slate-700 dark:text-slate-300">
                                  <span className="font-medium">{h.step_label}</span> — {h.approver_name} ({h.approver_role})
                                </p>
                                <p className="text-slate-500 dark:text-slate-400">
                                  {h.status === 'approved' ? 'Disetujui' : h.status === 'rejected' ? 'Ditolak' : h.status}
                                  {h.notes ? ` • ${h.notes}` : ''}
                                  {' • '} {new Date(h.acted_at).toLocaleString('id-ID')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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

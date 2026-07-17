import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Package,
  Building2,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  fetchWorkflowTemplate,
  getNextActionableStep,
  isLastActionableStep,
  getCurrentStep,
  type WorkflowStep,
  type WorkflowTemplate,
} from '../../lib/workflow';

interface BorrowingItemRow {
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
}

interface BorrowingRow {
  id: string;
  borrower_name: string;
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  item_type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  purpose: string | null;
  borrow_date: string | null;
  return_date: string | null;
  created_at: string;
  current_status_label: string | null;
  workflow_template_id: string | null;
  current_step: number | null;
  borrowing_items: BorrowingItemRow[];
}

interface InventoryRow {
  id: string;
  name: string;
}

interface FacilityRow {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<BorrowingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inventoryMap, setInventoryMap] = useState<Record<string, string>>({});
  const [facilityMap, setFacilityMap] = useState<Record<string, string>>({});
  const [workflowCache, setWorkflowCache] = useState<Record<string, WorkflowTemplate>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionForms, setActionForms] = useState<Record<string, { approverName: string; approverRole: string; notes: string }>>({});

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

    const rows = (data as unknown as BorrowingRow[]) ?? [];

    // Fetch inventory and facility names
    const inventoryIds = new Set<string>();
    const facilityIds = new Set<string>();
    rows.forEach(b => {
      b.borrowing_items?.forEach(item => {
        if (item.inventory_id) inventoryIds.add(item.inventory_id);
        if (item.facility_id) facilityIds.add(item.facility_id);
      });
    });

    const [invRes, facRes] = await Promise.all([
      inventoryIds.size > 0
        ? supabase.from('inventory').select('id, name').in('id', Array.from(inventoryIds))
        : Promise.resolve({ data: [] }),
      facilityIds.size > 0
        ? supabase.from('facilities').select('id, name').in('id', Array.from(facilityIds))
        : Promise.resolve({ data: [] }),
    ]);

    const invMap: Record<string, string> = {};
    ((invRes.data as unknown as InventoryRow[]) ?? []).forEach(i => {
      invMap[i.id] = i.name;
    });
    setInventoryMap(invMap);

    const facMap: Record<string, string> = {};
    ((facRes.data as unknown as FacilityRow[]) ?? []).forEach(f => {
      facMap[f.id] = f.name;
    });
    setFacilityMap(facMap);

    // Fetch workflow templates
    const templateIds = new Set<string>();
    rows.forEach(b => {
      if (b.workflow_template_id) templateIds.add(b.workflow_template_id);
      b.borrowing_items?.forEach(item => {
        if (item.workflow_template_id) templateIds.add(item.workflow_template_id);
      });
    });

    const cache: Record<string, WorkflowTemplate> = { ...workflowCache };
    for (const tid of Array.from(templateIds)) {
      if (!cache[tid]) {
        const tmpl = await fetchWorkflowTemplate(tid);
        if (tmpl) cache[tid] = tmpl;
      }
    }
    setWorkflowCache(cache);

    setBorrowings(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  const getFormItem = (itemId: string) => {
    return actionForms[itemId] ?? { approverName: '', approverRole: '', notes: '' };
  };

  const setFormField = (itemId: string, field: string, value: string) => {
    setActionForms(prev => ({
      ...prev,
      [itemId]: { ...getFormItem(itemId), [field]: value },
    }));
  };

  const sendBorrowingEmail = async (borrowingId: string, eventType: string) => {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v2/send-borrowing-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowingId, eventType }),
      });
    } catch {
      // Email failures are non-blocking
    }
  };

  const handleApprove = async (borrowing: BorrowingRow, item: BorrowingItemRow) => {
    const form = getFormItem(item.id);
    if (!form.approverName.trim() || !form.approverRole.trim()) {
      showToast('Nama dan jabatan approver wajib diisi', 'warning');
      return;
    }

    setActionLoading(item.id);
    try {
      const templateId = item.workflow_template_id ?? borrowing.workflow_template_id ?? '';
      const template = templateId ? workflowCache[templateId] : null;
      const steps: WorkflowStep[] = template?.steps ?? [];
      const currentStep = item.current_step ?? 0;
      const currentStepObj = getCurrentStep(steps, currentStep);
      const stepLabel = currentStepObj?.step_label ?? `Step ${currentStep}`;

      // Log to approval_history
      await supabase.from('approval_history').insert({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: currentStep,
        step_label: stepLabel,
        approver_name: form.approverName,
        approver_role: form.approverRole,
        status: 'approved',
        notes: form.notes,
        acted_at: new Date().toISOString(),
      });

      if (isLastActionableStep(steps, currentStep)) {
        // Finalize - item approved
        const newStatusLabel = 'Disetujui';
        await supabase
          .from('borrowing_items')
          .update({
            status: 'approved',
            current_status_label: newStatusLabel,
            assigned_approver_name: form.approverName,
            assigned_approver_role: form.approverRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        // Check if all items are approved to update borrowing
        const allItems = borrowing.borrowing_items ?? [];
        const allApproved = allItems.every(
          it => it.id === item.id || it.status === 'approved' || it.status === 'completed'
        );
        if (allApproved) {
          await supabase
            .from('borrowings')
            .update({
              status: 'approved',
              current_status_label: newStatusLabel,
              approved_by: form.approverName,
              approver_position: form.approverRole,
              approved_at: new Date().toISOString(),
            })
            .eq('id', borrowing.id);
        }

        await sendBorrowingEmail(borrowing.id, 'approved');
        showToast(`Item "${item.item_name ?? 'item'}" disetujui sepenuhnya`, 'success');
      } else {
        // Advance to next actionable step
        const nextStep = getNextActionableStep(steps, currentStep);
        const nextStepNum = nextStep?.step_order ?? currentStep + 1;
        const nextLabel = nextStep?.step_label ?? 'Menunggu Persetujuan';
        await supabase
          .from('borrowing_items')
          .update({
            current_step: nextStepNum,
            current_status_label: nextLabel,
            assigned_approver_name: form.approverName,
            assigned_approver_role: form.approverRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        // Update borrowing-level step tracking
        await supabase
          .from('borrowings')
          .update({
            current_step: nextStepNum,
            current_status_label: nextLabel,
          })
          .eq('id', borrowing.id);

        await sendBorrowingEmail(borrowing.id, 'step_approved');
        showToast(`Item "${item.item_name ?? 'item'}" lanjut ke: ${nextLabel}`, 'success');
      }

      setActionForms(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      fetchBorrowings();
    } catch (err) {
      showToast('Gagal menyetujui item', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (borrowing: BorrowingRow, item: BorrowingItemRow) => {
    const form = getFormItem(item.id);
    if (!form.approverName.trim() || !form.approverRole.trim()) {
      showToast('Nama dan jabatan approver wajib diisi', 'warning');
      return;
    }

    setActionLoading(item.id);
    try {
      const templateId = item.workflow_template_id ?? borrowing.workflow_template_id ?? '';
      const template = templateId ? workflowCache[templateId] : null;
      const steps: WorkflowStep[] = template?.steps ?? [];
      const currentStep = item.current_step ?? 0;
      const currentStepObj = getCurrentStep(steps, currentStep);
      const stepLabel = currentStepObj?.step_label ?? `Step ${currentStep}`;

      await supabase.from('approval_history').insert({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: currentStep,
        step_label: stepLabel,
        approver_name: form.approverName,
        approver_role: form.approverRole,
        status: 'rejected',
        notes: form.notes,
        acted_at: new Date().toISOString(),
      });

      await supabase
        .from('borrowing_items')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
          assigned_approver_name: form.approverName,
          assigned_approver_role: form.approverRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      // Update borrowing status to rejected
      await supabase
        .from('borrowings')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
          admin_notes: form.notes,
        })
        .eq('id', borrowing.id);

      await sendBorrowingEmail(borrowing.id, 'rejected');
      showToast(`Item "${item.item_name ?? 'item'}" ditolak`, 'info');

      setActionForms(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      fetchBorrowings();
    } catch {
      showToast('Gagal menolak item', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async (borrowing: BorrowingRow, item: BorrowingItemRow) => {
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

      // Check all items returned
      const allItems = borrowing.borrowing_items ?? [];
      const allReturned = allItems.every(
        it => it.id === item.id || it.status === 'returned' || it.status === 'completed'
      );
      if (allReturned) {
        await supabase
          .from('borrowings')
          .update({
            status: 'returned',
            current_status_label: 'Dikembalikan',
            actual_return_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', borrowing.id);
      }

      await sendBorrowingEmail(borrowing.id, 'returned');
      showToast('Item ditandai sebagai dikembalikan', 'success');
      fetchBorrowings();
    } catch {
      showToast('Gagal menandai pengembalian', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (borrowing: BorrowingRow, item: BorrowingItemRow) => {
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

      const allItems = borrowing.borrowing_items ?? [];
      const allCompleted = allItems.every(
        it => it.id === item.id || it.status === 'completed'
      );
      if (allCompleted) {
        await supabase
          .from('borrowings')
          .update({
            status: 'completed',
            current_status_label: 'Selesai',
          })
          .eq('id', borrowing.id);
      }

      showToast('Item ditandai selesai', 'success');
      fetchBorrowings();
    } catch {
      showToast('Gagal menyelesaikan item', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const renderWorkflowProgress = (item: BorrowingItemRow) => {
    const templateId = item.workflow_template_id;
    const template = templateId ? workflowCache[templateId] : null;
    const steps: WorkflowStep[] = template?.steps ?? [];
    if (steps.length === 0) return null;

    const currentStep = item.current_step ?? 0;

    return (
      <div className="flex items-center gap-1 flex-wrap mt-2">
        {steps.map((step, idx) => {
          const isDone = step.step_order < currentStep;
          const isCurrent = step.step_order === currentStep;
          const isPending = step.step_order > currentStep;
          return (
            <div key={step.id} className="flex items-center gap-1">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                  isDone && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                  isCurrent && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-2 ring-blue-400',
                  isPending && 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                )}
              >
                {isDone && <CheckCircle2 className="w-3 h-3" />}
                {isCurrent && <Clock className="w-3 h-3" />}
                <span>{step.step_label}</span>
                {step.is_info_only && (
                  <span className="text-[9px] opacity-60">(info)</span>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={cn('w-3 h-0.5', isDone ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600')} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getItemDisplayName = (item: BorrowingItemRow) => {
    if (item.item_name) return item.item_name;
    if (item.item_type === 'facility' && item.facility_id) return facilityMap[item.facility_id] ?? 'Fasilitas';
    if (item.item_type === 'inventory' && item.inventory_id) return inventoryMap[item.inventory_id] ?? 'Inventaris';
    return 'Item';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Peminjaman</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola dan setujui permintaan peminjaman
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {!loading && borrowings.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-400 dark:text-slate-500">Belum ada data peminjaman</p>
        </div>
      )}

      <div className="space-y-4">
        {borrowings.map(borrowing => {
          const isExpanded = expandedId === borrowing.id;
          return (
            <div
              key={borrowing.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              {/* Borrowing header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : borrowing.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white flex-shrink-0">
                    <ClipboardIcon type={borrowing.item_type} />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {borrowing.borrower_name ?? 'N/A'}
                      {borrowing.borrower_class && (
                        <span className="text-slate-400 dark:text-slate-500 font-normal">
                          {' '}• {borrowing.borrower_class}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(borrowing.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {borrowing.purpose && ` • ${borrowing.purpose}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium',
                      statusColors[borrowing.status] ?? statusColors.pending
                    )}
                  >
                    {borrowing.current_status_label ?? borrowing.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded items */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
                  {/* Borrower info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {borrowing.borrower_email && (
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Email</p>
                        <p className="text-slate-700 dark:text-slate-200">{borrowing.borrower_email}</p>
                      </div>
                    )}
                    {borrowing.borrower_phone && (
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Telepon</p>
                        <p className="text-slate-700 dark:text-slate-200">{borrowing.borrower_phone}</p>
                      </div>
                    )}
                    {borrowing.return_date && (
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Tgl Kembali</p>
                        <p className="text-slate-700 dark:text-slate-200">
                          {new Date(borrowing.return_date).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    )}
                  </div>
                  {borrowing.notes && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Catatan Peminjam</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{borrowing.notes}</p>
                    </div>
                  )}

                  {/* Items */}
                  {(borrowing.borrowing_items ?? []).map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            {item.item_type === 'facility' ? (
                              <Building2 className="w-4 h-4 text-slate-500" />
                            ) : (
                              <Package className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white">
                              {getItemDisplayName(item)}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              Jumlah: {item.quantity} • {item.item_type}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0',
                            statusColors[item.status] ?? statusColors.pending
                          )}
                        >
                          {item.current_status_label ?? item.status}
                        </span>
                      </div>

                      {/* Workflow progress */}
                      {renderWorkflowProgress(item)}

                      {/* Action form for pending items */}
                      {(item.status === 'pending' || item.status === 'approved') && (
                        <div className="mt-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Nama Approver"
                              value={getFormItem(item.id).approverName}
                              onChange={e => setFormField(item.id, 'approverName', e.target.value)}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Jabatan Approver"
                              value={getFormItem(item.id).approverRole}
                              onChange={e => setFormField(item.id, 'approverRole', e.target.value)}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <textarea
                            placeholder="Catatan (opsional)"
                            value={getFormItem(item.id).notes}
                            onChange={e => setFormField(item.id, 'notes', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleApprove(borrowing, item)}
                              disabled={actionLoading === item.id}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              Setujui
                            </button>
                            <button
                              onClick={() => handleReject(borrowing, item)}
                              disabled={actionLoading === item.id}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Tolak
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Return/Complete buttons for approved items */}
                      {item.status === 'approved' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleReturn(borrowing, item)}
                            disabled={actionLoading === item.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Tandai Dikembalikan
                          </button>
                          <button
                            onClick={() => handleComplete(borrowing, item)}
                            disabled={actionLoading === item.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Tandai Selesai
                          </button>
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
    </div>
  );
}

function ClipboardIcon({ type }: { type: string }) {
  return type === 'facility' ? (
    <Building2 className="w-5 h-5" />
  ) : (
    <Package className="w-5 h-5" />
  );
}

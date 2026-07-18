import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  fetchWorkflowTemplate,
  getNextActionableStep,
  isLastActionableStep,
  getCurrentStep,
  fetchNextApprover,
  notifyNextApprover,
  filterBorrowingsForAdmin,
  fetchRoleById,
  type WorkflowTemplate,
  type AdminUser,
} from '../../lib/workflow';
import { showToast } from '../../components/Toast';
import AccessDenied from '../../components/AccessDenied';
import {
  CheckCircle, XCircle, Loader2, Package, Calendar, User, Mail, Phone,
  FileText, ChevronDown, ChevronUp, ArrowRight, History,
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
  borrowed_units: number | null;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  borrower_email: string;
  borrower_phone: string | null;
  item_type: string;
  facility_id: string | null;
  purpose: string;
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
  borrowing_item_id: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300' },
};

export default function BorrowingsAdminPage() {
  const { user, adminProfile, hasPermission } = useAuth();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [filteredBorrowings, setFilteredBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notesByItem, setNotesByItem] = useState<Record<string, string>>({});
  const [historyByBorrowing, setHistoryByBorrowing] = useState<Record<string, ApprovalHistoryEntry[]>>({});

  const workflowCacheRef = useRef<Record<string, WorkflowTemplate>>({});

  const adminUser: AdminUser | null = adminProfile;

  // Permission flags for action buttons
  const canApprove = hasPermission('borrowings', 'approve');
  const canReject = hasPermission('borrowings', 'reject');
  const canManage = hasPermission('borrowings', 'manage');
  // Returning an item is treated as a "manage" action on borrowings.
  const canReturn = canManage;

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
    const all = (data as unknown as Borrowing[]) || [];
    setBorrowings(all);

    const filtered = await filterBorrowingsForAdmin(all, adminUser);
    setFilteredBorrowings(filtered);

    const templateIds = [...new Set(all.map(b => b.workflow_template_id).filter(Boolean) as string[])];
    for (const tid of templateIds) {
      if (!workflowCacheRef.current[tid]) {
        const tmpl = await fetchWorkflowTemplate(tid);
        if (tmpl) workflowCacheRef.current[tid] = tmpl;
      }
    }

    setLoading(false);
  }, [adminUser]);

  const fetchHistory = useCallback(async (borrowingId: string) => {
    const { data } = await supabase
      .from('approval_history')
      .select('*')
      .eq('borrowing_id', borrowingId)
      .order('acted_at', { ascending: true });
    setHistoryByBorrowing(prev => ({ ...prev, [borrowingId]: (data as unknown as ApprovalHistoryEntry[]) || [] }));
  }, []);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  const displayList = (adminUser?.role === 'superadmin' ? borrowings : filteredBorrowings).filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.borrower_name?.toLowerCase().includes(q) ||
        b.borrower_email?.toLowerCase().includes(q) ||
        b.borrower_class?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApproveItem = async (borrowing: Borrowing, item: BorrowingItem) => {
    if (!user) return;
    if (!canApprove) {
      showToast('Anda tidak memiliki izin untuk menyetujui peminjaman', 'error');
      return;
    }
    setActionLoading(item.id);
    try {
      const templateId = item.workflow_template_id || borrowing.workflow_template_id;
      if (!templateId) {
        showToast('Template workflow tidak ditemukan', 'error');
        setActionLoading(null);
        return;
      }
      const template = workflowCacheRef.current[templateId] || (await fetchWorkflowTemplate(templateId));
      if (!template) {
        showToast('Template workflow tidak ditemukan', 'error');
        setActionLoading(null);
        return;
      }
      workflowCacheRef.current[templateId] = template;

      const currentStepNum = item.current_step ?? 1;
      const currentStep = getCurrentStep(template.steps, currentStepNum);
      const notes = notesByItem[item.id] || '';

      const approverName = adminUser?.name || user.email || 'Admin';
      const stepRole = currentStep ? await fetchRoleById(currentStep.role_id) : null;
      const approverRole = stepRole?.name || adminUser?.role || 'Admin';

      const nextStep = getNextActionableStep(template.steps, currentStepNum);
      const isLast = isLastActionableStep(template.steps, currentStepNum);

      let newStatus = 'approved';
      let newStep = currentStepNum;
      let newStatusLabel = 'Disetujui';

      if (isLast) {
        newStatus = 'approved';
        newStatusLabel = 'Disetujui - Selesai';
      } else if (nextStep) {
        newStep = nextStep.step_order;
        newStatus = 'pending';
        newStatusLabel = nextStep.step_label;
      }

      const { error: itemError } = await supabase
        .from('borrowing_items')
        .update({
          status: newStatus,
          current_step: newStep,
          current_status_label: newStatusLabel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (itemError) {
        showToast('Gagal menyetujui item', 'error');
        setActionLoading(null);
        return;
      }

      await supabase.from('approval_history').insert({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: currentStepNum,
        step_label: currentStep?.step_label || `Step ${currentStepNum}`,
        approver_name: approverName,
        approver_role: approverRole,
        status: 'approved',
        notes,
        acted_at: new Date().toISOString(),
      });

      if (!isLast && nextStep) {
        const { role, approver } = await fetchNextApprover(template.steps, currentStepNum);
        if (approver && role) {
          await notifyNextApprover({
            type: 'next_approver',
            borrowing_id: borrowing.id,
            borrower_name: borrowing.borrower_name,
            borrower_email: borrowing.borrower_email,
            next_approver_email: approver.approver_email,
            next_approver_name: approver.approver_name,
            next_step_label: nextStep.step_label,
            next_role_name: role.name,
          });
          showToast(`Notifikasi dikirim ke ${approver.approver_name} (${role.name})`, 'success');
        } else {
          showToast('Disetujui. Email approver berikutnya belum dikonfigurasi.', 'warning');
        }
      } else {
        showToast('Pengajuan disetujui sepenuhnya', 'success');
      }

      const allItems = borrowing.borrowing_items.map(bi =>
        bi.id === item.id ? { ...bi, status: newStatus, current_step: newStep, current_status_label: newStatusLabel } : bi
      );
      const allApproved = allItems.every(bi => bi.status === 'approved' || (bi.id === item.id && newStatus === 'approved'));
      const anyRejected = allItems.some(bi => bi.status === 'rejected');

      let parentStatus = borrowing.status;
      let parentStep = borrowing.current_step;
      let parentLabel = borrowing.current_status_label;

      if (anyRejected) {
        parentStatus = 'rejected';
      } else if (allApproved) {
        parentStatus = 'approved';
        parentLabel = 'Disetujui - Selesai';
      } else {
        parentStatus = 'pending';
        parentStep = newStep;
        parentLabel = newStatusLabel;
      }

      await supabase
        .from('borrowings')
        .update({
          status: parentStatus,
          current_step: parentStep,
          current_status_label: parentLabel,
          approved_by: allApproved ? approverName : borrowing.approved_by,
          approver_position: allApproved ? approverRole : borrowing.approver_position,
          approved_at: allApproved ? new Date().toISOString() : borrowing.approved_at,
        })
        .eq('id', borrowing.id);

      setNotesByItem(prev => ({ ...prev, [item.id]: '' }));
      await fetchBorrowings();
      await fetchHistory(borrowing.id);
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menyetujui', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectItem = async (borrowing: Borrowing, item: BorrowingItem) => {
    if (!user) return;
    if (!canReject) {
      showToast('Anda tidak memiliki izin untuk menolak peminjaman', 'error');
      return;
    }
    setActionLoading(`reject-${item.id}`);
    try {
      const templateId = item.workflow_template_id || borrowing.workflow_template_id;
      const template = templateId ? (workflowCacheRef.current[templateId] || (await fetchWorkflowTemplate(templateId))) : null;
      const currentStepNum = item.current_step ?? 1;
      const currentStep = template ? getCurrentStep(template.steps, currentStepNum) : null;
      const notes = notesByItem[item.id] || '';

      const approverName = adminUser?.name || user.email || 'Admin';
      const stepRole = currentStep ? await fetchRoleById(currentStep.role_id) : null;
      const approverRole = stepRole?.name || adminUser?.role || 'Admin';

      const { error: itemError } = await supabase
        .from('borrowing_items')
        .update({
          status: 'rejected',
          current_status_label: 'Ditolak',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (itemError) {
        showToast('Gagal menolak item', 'error');
        setActionLoading(null);
        return;
      }

      await supabase.from('approval_history').insert({
        borrowing_id: borrowing.id,
        borrowing_item_id: item.id,
        step_order: currentStepNum,
        step_label: currentStep?.step_label || `Step ${currentStepNum}`,
        approver_name: approverName,
        approver_role: approverRole,
        status: 'rejected',
        notes,
        acted_at: new Date().toISOString(),
      });

      await notifyNextApprover({
        type: 'rejected',
        borrowing_id: borrowing.id,
        borrower_name: borrowing.borrower_name,
        borrower_email: borrowing.borrower_email,
        next_approver_email: borrowing.borrower_email,
        next_approver_name: borrowing.borrower_name,
        next_step_label: 'Ditolak',
        next_role_name: approverRole,
      });

      await supabase
        .from('borrowings')
        .update({ status: 'rejected', current_status_label: 'Ditolak' })
        .eq('id', borrowing.id);

      setNotesByItem(prev => ({ ...prev, [item.id]: '' }));
      showToast('Pengajuan ditolak', 'info');
      await fetchBorrowings();
      await fetchHistory(borrowing.id);
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menolak', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReturned = async (borrowing: Borrowing, item: BorrowingItem) => {
    if (!canReturn) {
      showToast('Anda tidak memiliki izin untuk menandai pengembalian', 'error');
      return;
    }
    setActionLoading(`return-${item.id}`);
    try {
      await supabase
        .from('borrowing_items')
        .update({ status: 'returned', current_status_label: 'Dikembalikan', updated_at: new Date().toISOString() })
        .eq('id', item.id);

      const allReturned = borrowing.borrowing_items.every(bi => bi.id === item.id || bi.status === 'returned');
      if (allReturned) {
        await supabase
          .from('borrowings')
          .update({ status: 'returned', actual_return_date: new Date().toISOString().slice(0, 10), current_status_label: 'Dikembalikan' })
          .eq('id', borrowing.id);
      }
      showToast('Item ditandai sudah dikembalikan', 'success');
      await fetchBorrowings();
    } catch (e) {
      showToast('Gagal menandai pengembalian', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const renderWorkflowProgress = (borrowing: Borrowing, item: BorrowingItem) => {
    const templateId = item.workflow_template_id || borrowing.workflow_template_id;
    if (!templateId) return null;
    const template = workflowCacheRef.current[templateId];
    if (!template) return null;

    return (
      <div className="flex items-center gap-1 flex-wrap mt-3">
        {template.steps.map((step, idx) => {
          const isCurrent = step.step_order === item.current_step;
          const isPast = (item.current_step ?? 1) > step.step_order;
          const isRejected = item.status === 'rejected';
          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  isRejected && isCurrent
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : isCurrent
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-2 ring-blue-400'
                    : isPast
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                }`}
              >
                {step.step_label}
              </div>
              {idx < template.steps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" />}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Peminjaman</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola pengajuan peminjaman dengan workflow approval otomatis
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Cari nama, email, kelas, atau keperluan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Disetujui</option>
          <option value="returned">Dikembalikan</option>
          <option value="rejected">Ditolak</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada pengajuan</p>
          <p className="text-sm text-slate-400 mt-1">
            {adminUser?.role === 'superadmin'
              ? 'Belum ada pengajuan peminjaman'
              : 'Tidak ada pengajuan yang menjadi tanggung jawab Anda saat ini'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map(borrowing => {
            const isExpanded = expandedId === borrowing.id;
            const sc = statusConfig[borrowing.status] || statusConfig.pending;
            const history = historyByBorrowing[borrowing.id] || [];
            return (
              <div key={borrowing.id} className="card overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : borrowing.id);
                    if (!isExpanded) fetchHistory(borrowing.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{borrowing.borrower_name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {borrowing.borrower_class} · {borrowing.borrower_email}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {borrowing.borrow_date} → {borrowing.return_date}
                        {borrowing.start_time && borrowing.end_time ? ` (${borrowing.start_time}-${borrowing.end_time})` : ''}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{borrowing.purpose}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <User className="w-4 h-4 text-slate-400" /> {borrowing.borrower_name}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Mail className="w-4 h-4 text-slate-400" /> {borrowing.borrower_email}
                        </div>
                        {borrowing.borrower_phone && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Phone className="w-4 h-4 text-slate-400" /> {borrowing.borrower_phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Calendar className="w-4 h-4 text-slate-400" /> {borrowing.borrow_date} s/d {borrowing.return_date}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                          <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                          <span>{borrowing.purpose}</span>
                        </div>
                        {borrowing.notes && (
                          <div className="text-slate-500 dark:text-slate-400">
                            <span className="font-medium">Catatan:</span> {borrowing.notes}
                          </div>
                        )}
                        {borrowing.document_url && (
                          <a href={borrowing.document_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm">
                            Lihat dokumen pendukung
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Item Dipinjam</h4>
                      <div className="space-y-3">
                        {borrowing.borrowing_items.map(item => {
                          const itemSc = statusConfig[item.status] || statusConfig.pending;
                          const canApproveThis = item.status === 'pending' && canApprove;
                          const canRejectThis = item.status === 'pending' && canReject;
                          const canReturnThis = item.status === 'approved' && canReturn;
                          const showActionArea = canApproveThis || canRejectThis || canReturnThis;
                          return (
                            <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-slate-900 dark:text-white">{item.item_name}</span>
                                    <span className="text-sm text-slate-500">×{item.quantity}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${itemSc.color}`}>{itemSc.label}</span>
                                  </div>
                                  {item.current_status_label && (
                                    <p className="text-xs text-slate-500 mt-1">Status: {item.current_status_label}</p>
                                  )}
                                  {renderWorkflowProgress(borrowing, item)}
                                </div>
                              </div>

                              {showActionArea && (
                                <div className="mt-3 space-y-3">
                                  {(canApproveThis || canRejectThis) && (
                                    <div>
                                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                                        Catatan (opsional)
                                      </label>
                                      <textarea
                                        value={notesByItem[item.id] || ''}
                                        onChange={e => setNotesByItem(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        rows={2}
                                        placeholder="Catatan untuk approval ini..."
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                      />
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    {canApproveThis && (
                                      <button
                                        onClick={() => handleApproveItem(borrowing, item)}
                                        disabled={actionLoading === item.id}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                      >
                                        {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        Setujui
                                      </button>
                                    )}
                                    {canRejectThis && (
                                      <button
                                        onClick={() => handleRejectItem(borrowing, item)}
                                        disabled={actionLoading === `reject-${item.id}`}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                                      >
                                        {actionLoading === `reject-${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                        Tolak
                                      </button>
                                    )}
                                    {canReturnThis && (
                                      <button
                                        onClick={() => handleMarkReturned(borrowing, item)}
                                        disabled={actionLoading === `return-${item.id}`}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                                      >
                                        {actionLoading === `return-${item.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        Tandai Dikembalikan
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {history.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                          <History className="w-4 h-4" /> Riwayat Approval
                        </h4>
                        <div className="space-y-2">
                          {history.map(h => (
                            <div key={h.id} className="flex items-start gap-3 text-sm rounded-lg bg-slate-50 dark:bg-slate-700/30 p-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 ${h.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <div className="flex-1">
                                <p className="text-slate-700 dark:text-slate-300">
                                  <span className="font-medium">{h.approver_name}</span> ({h.approver_role}) —{' '}
                                  <span className={h.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}>
                                    {h.status === 'approved' ? 'Menyetujui' : 'Menolak'}
                                  </span>
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {h.step_label} · {new Date(h.acted_at).toLocaleString('id-ID')}
                                </p>
                                {h.notes && <p className="text-xs text-slate-500 mt-0.5">"{h.notes}"</p>}
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

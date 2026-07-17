import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchWorkflowTemplate, getNextActionableStep, isLastActionableStep, getCurrentStep, type WorkflowStep, type WorkflowTemplate } from '../../lib/workflow';
import { Search, Check, X, AlertTriangle, Package, Building2, Clock, MessageSquare, User, ShoppingCart, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  partially_approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  returned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak', completed: 'Selesai',
  cancelled: 'Dibatalkan', partially_approved: 'Sebagian Disetujui', returned: 'Dikembalikan',
};
const workflowCache = new Map<string, WorkflowTemplate | null>();

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [workflowStepsMap, setWorkflowStepsMap] = useState<Record<string, WorkflowStep[]>>({});

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('borrowings').select('*, borrowing_items(*)').order('created_at', { ascending: false });
    if (data) {
      setBorrowings(data);
      const templateIds = new Set<string>();
      data.forEach((b: any) => (b.borrowing_items || []).forEach((item: any) => { if (item.workflow_template_id) templateIds.add(item.workflow_template_id); }));
      const stepsMap: Record<string, WorkflowStep[]> = {};
      for (const tid of templateIds) {
        if (!workflowCache.has(tid)) { const t = await fetchWorkflowTemplate(tid); workflowCache.set(tid, t); }
        const t = workflowCache.get(tid); if (t) stepsMap[tid] = t.steps;
      }
      setWorkflowStepsMap(stepsMap);
    }
    setLoading(false);
  }

  function toggleExpand(id: string) { setExpandedItems(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function approveItem(itemId: string, borrowingId: string, notes?: string) {
    setProcessing(true); setActionError('');
    try {
      const { data: item } = await supabase.from('borrowing_items').select('*').eq('id', itemId).single();
      let steps: WorkflowStep[] = [];
      if (item.workflow_template_id) {
        if (!workflowCache.has(item.workflow_template_id)) { const t = await fetchWorkflowTemplate(item.workflow_template_id); workflowCache.set(item.workflow_template_id, t); }
        steps = workflowCache.get(item.workflow_template_id)?.steps || [];
      }
      if (steps.length === 0) { await finalizeItem(itemId, borrowingId, 'approved', 'Disetujui', notes); }
      else {
        const currentStepNum = item.current_step || 1;
        const currentStep = getCurrentStep(steps, currentStepNum);
        if (isLastActionableStep(steps, currentStepNum)) { await finalizeItem(itemId, borrowingId, 'approved', 'Disetujui', notes); }
        else {
          const nextStep = getNextActionableStep(steps, currentStepNum);
          if (nextStep) {
            await supabase.from('borrowing_items').update({ current_step: nextStep.step_order, current_status_label: `Menunggu ${nextStep.step_label}`, assigned_approver_name: approverName, assigned_approver_role: approverPosition }).eq('id', itemId);
            await supabase.from('approval_history').insert({ borrowing_id: borrowingId, borrowing_item_id: itemId, step_order: currentStepNum, step_label: currentStep?.step_label || `Step ${currentStepNum}`, approver_name: approverName || 'Admin', approver_role: approverPosition || 'Admin', status: 'approved', notes: notes || '', acted_at: new Date().toISOString() });
            await sendStepNotification(borrowingId, itemId, nextStep, 'next_approver');
            await sendStepNotification(borrowingId, itemId, nextStep, 'borrower_step_advance');
          }
        }
      }
      await recalcStatus(borrowingId, notes); await fetchData();
    } catch (e: any) { setActionError(e.message); } finally { setProcessing(false); }
  }

  async function rejectItem(itemId: string, borrowingId: string, notes?: string) {
    setProcessing(true); setActionError('');
    try {
      const { data: item } = await supabase.from('borrowing_items').select('*').eq('id', itemId).single();
      const currentStepNum = item.current_step || 1;
      let steps: WorkflowStep[] = [];
      if (item.workflow_template_id) { if (!workflowCache.has(item.workflow_template_id)) { const t = await fetchWorkflowTemplate(item.workflow_template_id); workflowCache.set(item.workflow_template_id, t); } steps = workflowCache.get(item.workflow_template_id)?.steps || []; }
      const currentStep = getCurrentStep(steps, currentStepNum);
      await supabase.from('borrowing_items').update({ status: 'rejected', current_status_label: 'Ditolak', assigned_approver_name: approverName, assigned_approver_role: approverPosition }).eq('id', itemId);
      await supabase.from('approval_history').insert({ borrowing_id: borrowingId, borrowing_item_id: itemId, step_order: currentStepNum, step_label: currentStep?.step_label || `Step ${currentStepNum}`, approver_name: approverName || 'Admin', approver_role: approverPosition || 'Admin', status: 'rejected', notes: notes || '', acted_at: new Date().toISOString() });
      await sendFinalNotification(borrowingId, itemId, 'rejected');
      await recalcStatus(borrowingId, notes); await fetchData();
    } catch (e: any) { setActionError(e.message); } finally { setProcessing(false); }
  }

  async function finalizeItem(itemId: string, borrowingId: string, status: string, label: string, notes?: string) {
    await supabase.from('borrowing_items').update({ status, current_status_label: label, assigned_approver_name: approverName, assigned_approver_role: approverPosition }).eq('id', itemId);
    const { data: item } = await supabase.from('borrowing_items').select('current_step, workflow_template_id').eq('id', itemId).single();
    const currentStepNum = item?.current_step || 1;
    let steps: WorkflowStep[] = [];
    if (item?.workflow_template_id) { if (!workflowCache.has(item.workflow_template_id)) { const t = await fetchWorkflowTemplate(item.workflow_template_id); workflowCache.set(item.workflow_template_id, t); } steps = workflowCache.get(item.workflow_template_id)?.steps || []; }
    const currentStep = getCurrentStep(steps, currentStepNum);
    await supabase.from('approval_history').insert({ borrowing_id: borrowingId, borrowing_item_id: itemId, step_order: currentStepNum, step_label: currentStep?.step_label || `Step ${currentStepNum}`, approver_name: approverName || 'Admin', approver_role: approverPosition || 'Admin', status, notes: notes || '', acted_at: new Date().toISOString() });
    await sendFinalNotification(borrowingId, itemId, status as 'approved' | 'rejected');
  }

  async function recalcStatus(borrowingId: string, notes?: string) {
    const { data: items } = await supabase.from('borrowing_items').select('status').eq('borrowing_id', borrowingId);
    const all = items || [];
    const allApproved = all.every(i => i.status === 'approved' || i.status === 'returned');
    const anyRejected = all.some(i => i.status === 'rejected');
    const anyPending = all.some(i => i.status === 'pending');
    let status = 'pending', label = 'Menunggu Persetujuan';
    if (anyRejected) { status = 'rejected'; label = 'Ditolak'; }
    else if (allApproved) { status = 'approved'; label = 'Disetujui'; }
    else if (!anyPending) { status = 'partially_approved'; label = 'Sebagian Disetujui'; }
    const update: any = { status, current_status_label: label };
    if (notes !== undefined) update.admin_notes = notes;
    if (status === 'approved' || status === 'rejected') { if (approverName) update.approved_by = approverName; if (approverPosition) update.approver_position = approverPosition; update.approved_at = new Date().toISOString(); }
    await supabase.from('borrowings').update(update).eq('id', borrowingId);
  }

  async function sendStepNotification(borrowingId: string, itemId: string, nextStep: WorkflowStep, type: 'next_approver' | 'borrower_step_advance') {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: b } = await supabase.from('borrowings').select('borrower_name, borrower_email, purpose, borrow_date, return_date').eq('id', borrowingId).single();
      const { data: item } = await supabase.from('borrowing_items').select('item_name, quantity').eq('id', itemId).single();
      if (!b) return;
      await fetch(`${supabaseUrl}/functions/v2/send-borrowing-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, borrowing_id: borrowingId, borrowing_item_id: itemId, borrower_name: b.borrower_name, borrower_email: b.borrower_email, purpose: b.purpose, borrow_date: b.borrow_date, return_date: b.return_date || b.borrow_date, item_name: item?.item_name, item_quantity: item?.quantity, next_step_label: nextStep.step_label, next_step_role: nextStep.role_name, workflow_template_id: nextStep.workflow_template_id }) });
    } catch (e) { console.error('Notification error:', e); }
  }

  async function sendFinalNotification(borrowingId: string, itemId: string, status: 'approved' | 'rejected') {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: b } = await supabase.from('borrowings').select('borrower_name, borrower_email, purpose, borrow_date, return_date').eq('id', borrowingId).single();
      const { data: item } = await supabase.from('borrowing_items').select('item_name, quantity').eq('id', itemId).single();
      if (!b) return;
      await fetch(`${supabaseUrl}/functions/v2/send-borrowing-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'final_decision', borrowing_id: borrowingId, borrowing_item_id: itemId, borrower_name: b.borrower_name, borrower_email: b.borrower_email, purpose: b.purpose, borrow_date: b.borrow_date, return_date: b.return_date || b.borrow_date, item_name: item?.item_name, item_quantity: item?.quantity, status }) });
    } catch (e) { console.error('Notification error:', e); }
  }

  async function bulkApprove(borrowingId: string, notes?: string) {
    setProcessing(true); setActionError('');
    try { const { data: items } = await supabase.from('borrowing_items').select('id').eq('borrowing_id', borrowingId); for (const item of items || []) { await finalizeItem(item.id, borrowingId, 'approved', 'Disetujui', notes); } await recalcStatus(borrowingId, notes); await fetchData(); }
    catch (e: any) { setActionError(e.message); } finally { setProcessing(false); }
  }

  async function bulkReject(borrowingId: string, notes?: string) {
    setProcessing(true); setActionError('');
    try { const { data: items } = await supabase.from('borrowing_items').select('id').eq('borrowing_id', borrowingId); for (const item of items || []) { await supabase.from('borrowing_items').update({ status: 'rejected', current_status_label: 'Ditolak' }).eq('id', item.id); await supabase.from('approval_history').insert({ borrowing_id: borrowingId, borrowing_item_id: item.id, step_order: 1, step_label: 'Bulk Reject', approver_name: approverName || 'Admin', approver_role: approverPosition || 'Admin', status: 'rejected', notes: notes || '', acted_at: new Date().toISOString() }); await sendFinalNotification(borrowingId, item.id, 'rejected'); } await recalcStatus(borrowingId, notes); await fetchData(); }
    catch (e: any) { setActionError(e.message); } finally { setProcessing(false); }
  }

  async function markCompleted(borrowingId: string) {
    setProcessing(true);
    try { await supabase.from('borrowings').update({ status: 'completed', current_status_label: 'Selesai', actual_return_date: new Date().toISOString().split('T')[0] }).eq('id', borrowingId); await supabase.from('borrowing_items').update({ status: 'returned', current_status_label: 'Dikembalikan' }).eq('borrowing_id', borrowingId); await fetchData(); }
    catch (e: any) { setActionError(e.message); } finally { setProcessing(false); }
  }

  const filtered = borrowings.filter(b => {
    const ms = b.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.borrowing_items || []).some((i: any) => i.item_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const mf = !statusFilter || b.status === statusFilter; return ms && mf;
  });
  const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Peminjaman</h1><p className="text-slate-600 dark:text-slate-400">Approval bertahap: Pembina &rarr; Wakasek &rarr; PJ Fasilitas &rarr; Wakasek Sarpras</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{ l: 'Menunggu', v: borrowings.filter(b => b.status === 'pending').length, i: Clock, c: 'text-amber-500' }, { l: 'Disetujui', v: borrowings.filter(b => b.status === 'approved').length, i: Check, c: 'text-emerald-500' }, { l: 'Total', v: borrowings.length, i: Package, c: 'text-blue-500' }, { l: 'Ditolak', v: borrowings.filter(b => b.status === 'rejected').length, i: X, c: 'text-red-500' }].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/50"><div className="flex items-center gap-2"><s.i className={cn('w-4 h-4', s.c)} /><span className="text-lg font-bold text-slate-900 dark:text-white">{s.v}</span></div><span className="text-xs text-slate-500">{s.l}</span></div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" placeholder="Cari..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"><option value="">Semua Status</option><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option><option value="partially_approved">Sebagian</option></select>
      </div>
      {loading ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}</div> : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center"><Package className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">Tidak ada data</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const items = b.borrowing_items || []; const isExp = expandedItems.has(b.id); const pending = items.filter((i: any) => i.status === 'pending').length;
            return (
              <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{b.borrower_name?.[0]?.toUpperCase() || '?'}</div>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-sm text-slate-900 dark:text-white">{b.borrower_name}</p><span className="text-xs text-slate-500">{b.borrower_class}</span></div><p className="text-xs text-slate-500 truncate">{b.purpose || '-'} &middot; {fmt(b.borrow_date)}</p></div>
                  <div className="flex items-center gap-2 flex-shrink-0">{pending > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{pending} menunggu</span>}<span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', STATUS_COLORS[b.status] || 'bg-slate-100')}>{b.current_status_label || STATUS_LABELS[b.status] || b.status}</span><button onClick={() => toggleExpand(b.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">{isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div>
                </div>
                {isExp && (
                  <div className="border-t border-slate-100 dark:border-slate-700">
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2"><ShoppingCart className="w-4 h-4 text-blue-500" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Item Peminjaman</span></div>
                      {items.map((item: any) => {
                        const steps = item.workflow_template_id ? workflowStepsMap[item.workflow_template_id] || [] : [];
                        const currentStepNum = item.current_step || 1;
                        const isLast = steps.length > 0 && isLastActionableStep(steps, currentStepNum);
                        return (
                          <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                            <div className="flex items-center gap-3">
                              {item.item_type === 'ruangan' ? <Building2 className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-cyan-500" />}
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.item_name}</p><p className="text-xs text-slate-400">&times;{item.quantity}</p></div>
                              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', STATUS_COLORS[item.status] || 'bg-slate-100')}>{item.current_status_label || STATUS_LABELS[item.status] || item.status}</span>
                              {item.status === 'pending' && (<div className="flex gap-1 flex-shrink-0"><button onClick={() => approveItem(item.id, b.id, adminNotes)} disabled={processing} className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-200 disabled:opacity-50" title={isLast ? 'Setujui (final)' : 'Setujui & lanjut'}><Check className="w-3.5 h-3.5" /></button><button onClick={() => rejectItem(item.id, b.id, adminNotes)} disabled={processing} className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200 disabled:opacity-50"><X className="w-3.5 h-3.5" /></button></div>)}
                            </div>
                            {steps.length > 0 && (<div className="mt-2 flex items-center gap-1 flex-wrap">{steps.map((s, idx) => { const done = item.status === 'approved' || (item.current_step || 1) > s.step_order; const curr = (item.current_step || 1) === s.step_order && item.status === 'pending'; return (<div key={s.id} className="flex items-center gap-1">{idx > 0 && <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />}<span className={cn('text-xs px-1.5 py-0.5 rounded-md', done ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : curr ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-medium' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500')}>{s.is_info_only && '~'}{s.step_label}</span></div>); })}</div>)}
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 pb-4 grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-slate-400">Email</span><p className="text-slate-700 dark:text-slate-200 truncate">{b.borrower_email || '-'}</p></div>
                      <div><span className="text-slate-400">No. HP</span><p className="text-slate-700 dark:text-slate-200">{b.borrower_phone || '-'}</p></div>
                    </div>
                    {b.status === 'pending' && (
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <input type="text" value={approverName} onChange={e => setApproverName(e.target.value)} placeholder="Nama Penyetuju" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
                          <input type="text" value={approverPosition} onChange={e => setApproverPosition(e.target.value)} placeholder="Jabatan" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
                        </div>
                        <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Catatan..." rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none mb-3" />
                        <div className="flex gap-2"><button onClick={() => bulkApprove(b.id, adminNotes)} disabled={processing} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"><Check className="w-4 h-4" /> Setujui Semua</button><button onClick={() => bulkReject(b.id, adminNotes)} disabled={processing} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"><X className="w-4 h-4" /> Tolak Semua</button></div>
                      </div>
                    )}
                    {b.status === 'approved' && (<div className="px-4 pb-4"><button onClick={() => markCompleted(b.id)} disabled={processing} className="w-full px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50">Tandai Selesai</button></div>)}
                    {actionError && (<div className="mx-4 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" /><p className="text-sm text-red-700 dark:text-red-400">{actionError}</p></div>)}
                    {b.approved_by && (<div className="mx-4 mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"><User className="w-4 h-4 text-emerald-600" /><div><p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{b.approved_by}</p><p className="text-xs text-emerald-600">{b.approver_position}</p></div></div>)}
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

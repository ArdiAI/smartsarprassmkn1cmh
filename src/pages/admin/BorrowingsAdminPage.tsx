import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchWorkflowTemplate, getNextActionableStep, isLastActionableStep, getCurrentStep, type WorkflowStep, type WorkflowTemplate } from '../../lib/workflow';
import { Search, Check, X, AlertTriangle, Package, Building2, Clock, User, ShoppingCart, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const SC: Record<string, string> = { pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', partially_approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', returned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
const SL: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak', completed: 'Selesai', partially_approved: 'Sebagian', returned: 'Dikembalikan' };
const wc = new Map<string, WorkflowTemplate | null>();

export default function BorrowingsAdminPage() {
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true); const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(''); const [notes, setNotes] = useState('');
  const [aName, setAName] = useState(''); const [aPos, setAPos] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [stepsMap, setStepsMap] = useState<Record<string, WorkflowStep[]>>({});

  useEffect(() => { fetchData(); }, []);
  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('borrowings').select('*, borrowing_items(*)').order('created_at', { ascending: false });
    if (data) {
      setBorrowings(data);
      const tids = new Set<string>();
      data.forEach((b: any) => (b.borrowing_items || []).forEach((i: any) => { if (i.workflow_template_id) tids.add(i.workflow_template_id); }));
      const sm: Record<string, WorkflowStep[]> = {};
      for (const tid of tids) { if (!wc.has(tid)) { wc.set(tid, await fetchWorkflowTemplate(tid)); } const t = wc.get(tid); if (t) sm[tid] = t.steps; }
      setStepsMap(sm);
    }
    setLoading(false);
  }
  function toggle(id: string) { setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function approveItem(itemId: string, bId: string, n?: string) {
    setProcessing(true); setError('');
    try {
      const { data: item } = await supabase.from('borrowing_items').select('*').eq('id', itemId).single();
      let steps: WorkflowStep[] = [];
      if (item.workflow_template_id) { if (!wc.has(item.workflow_template_id)) { wc.set(item.workflow_template_id, await fetchWorkflowTemplate(item.workflow_template_id)); } steps = wc.get(item.workflow_template_id)?.steps || []; }
      if (steps.length === 0) { await finalize(itemId, bId, 'approved', 'Disetujui', n); }
      else {
        const cs = item.current_step || 1; const step = getCurrentStep(steps, cs);
        if (isLastActionableStep(steps, cs)) { await finalize(itemId, bId, 'approved', 'Disetujui', n); }
        else { const next = getNextActionableStep(steps, cs); if (next) {
          await supabase.from('borrowing_items').update({ current_step: next.step_order, current_status_label: `Menunggu ${next.step_label}`, assigned_approver_name: aName, assigned_approver_role: aPos }).eq('id', itemId);
          await supabase.from('approval_history').insert({ borrowing_id: bId, borrowing_item_id: itemId, step_order: cs, step_label: step?.step_label || `Step ${cs}`, approver_name: aName || 'Admin', approver_role: aPos || 'Admin', status: 'approved', notes: n || '', acted_at: new Date().toISOString() });
          await sendNotif(bId, itemId, next, 'next_approver'); await sendNotif(bId, itemId, next, 'borrower_step_advance');
        }}
      }
      await recalc(bId, n); await fetchData();
    } catch (e: any) { setError(e.message); } finally { setProcessing(false); }
  }

  async function rejectItem(itemId: string, bId: string, n?: string) {
    setProcessing(true); setError('');
    try {
      const { data: item } = await supabase.from('borrowing_items').select('*').eq('id', itemId).single();
      const cs = item.current_step || 1; let steps: WorkflowStep[] = [];
      if (item.workflow_template_id) { if (!wc.has(item.workflow_template_id)) { wc.set(item.workflow_template_id, await fetchWorkflowTemplate(item.workflow_template_id)); } steps = wc.get(item.workflow_template_id)?.steps || []; }
      const step = getCurrentStep(steps, cs);
      await supabase.from('borrowing_items').update({ status: 'rejected', current_status_label: 'Ditolak', assigned_approver_name: aName, assigned_approver_role: aPos }).eq('id', itemId);
      await supabase.from('approval_history').insert({ borrowing_id: bId, borrowing_item_id: itemId, step_order: cs, step_label: step?.step_label || `Step ${cs}`, approver_name: aName || 'Admin', approver_role: aPos || 'Admin', status: 'rejected', notes: n || '', acted_at: new Date().toISOString() });
      await sendFinal(bId, itemId, 'rejected'); await recalc(bId, n); await fetchData();
    } catch (e: any) { setError(e.message); } finally { setProcessing(false); }
  }

  async function finalize(itemId: string, bId: string, status: string, label: string, n?: string) {
    await supabase.from('borrowing_items').update({ status, current_status_label: label, assigned_approver_name: aName, assigned_approver_role: aPos }).eq('id', itemId);
    const { data: item } = await supabase.from('borrowing_items').select('current_step, workflow_template_id').eq('id', itemId).single();
    const cs = item?.current_step || 1; let steps: WorkflowStep[] = [];
    if (item?.workflow_template_id) { if (!wc.has(item.workflow_template_id)) { wc.set(item.workflow_template_id, await fetchWorkflowTemplate(item.workflow_template_id)); } steps = wc.get(item.workflow_template_id)?.steps || []; }
    const step = getCurrentStep(steps, cs);
    await supabase.from('approval_history').insert({ borrowing_id: bId, borrowing_item_id: itemId, step_order: cs, step_label: step?.step_label || `Step ${cs}`, approver_name: aName || 'Admin', approver_role: aPos || 'Admin', status, notes: n || '', acted_at: new Date().toISOString() });
    await sendFinal(bId, itemId, status as 'approved' | 'rejected');
  }

  async function recalc(bId: string, n?: string) {
    const { data: items } = await supabase.from('borrowing_items').select('status').eq('borrowing_id', bId);
    const all = items || []; const ok = all.every(i => i.status === 'approved' || i.status === 'returned'); const rej = all.some(i => i.status === 'rejected'); const pend = all.some(i => i.status === 'pending');
    let s = 'pending', l = 'Menunggu Persetujuan';
    if (rej) { s = 'rejected'; l = 'Ditolak'; } else if (ok) { s = 'approved'; l = 'Disetujui'; } else if (!pend) { s = 'partially_approved'; l = 'Sebagian Disetujui'; }
    const u: any = { status: s, current_status_label: l }; if (n !== undefined) u.admin_notes = n;
    if (s === 'approved' || s === 'rejected') { if (aName) u.approved_by = aName; if (aPos) u.approver_position = aPos; u.approved_at = new Date().toISOString(); }
    await supabase.from('borrowings').update(u).eq('id', bId);
  }

  async function sendNotif(bId: string, iId: string, next: WorkflowStep, type: 'next_approver' | 'borrower_step_advance') {
    try { const u = import.meta.env.VITE_SUPABASE_URL; const { data: b } = await supabase.from('borrowings').select('borrower_name, borrower_email, purpose, borrow_date, return_date').eq('id', bId).single(); const { data: item } = await supabase.from('borrowing_items').select('item_name, quantity').eq('id', iId).single(); if (!b) return; await fetch(`${u}/functions/v2/send-borrowing-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, borrowing_id: bId, borrowing_item_id: iId, borrower_name: b.borrower_name, borrower_email: b.borrower_email, purpose: b.purpose, borrow_date: b.borrow_date, return_date: b.return_date || b.borrow_date, item_name: item?.item_name, item_quantity: item?.quantity, next_step_label: next.step_label, next_step_role: next.role_name, workflow_template_id: next.workflow_template_id }) }); } catch (e) { console.error(e); }
  }
  async function sendFinal(bId: string, iId: string, status: 'approved' | 'rejected') {
    try { const u = import.meta.env.VITE_SUPABASE_URL; const { data: b } = await supabase.from('borrowings').select('borrower_name, borrower_email, purpose, borrow_date, return_date').eq('id', bId).single(); const { data: item } = await supabase.from('borrowing_items').select('item_name, quantity').eq('id', iId).single(); if (!b) return; await fetch(`${u}/functions/v2/send-borrowing-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'final_decision', borrowing_id: bId, borrowing_item_id: iId, borrower_name: b.borrower_name, borrower_email: b.borrower_email, purpose: b.purpose, borrow_date: b.borrow_date, return_date: b.return_date || b.borrow_date, item_name: item?.item_name, item_quantity: item?.quantity, status }) }); } catch (e) { console.error(e); }
  }
  async function bulkApprove(bId: string, n?: string) { setProcessing(true); setError(''); try { const { data: items } = await supabase.from('borrowing_items').select('id').eq('borrowing_id', bId); for (const i of items || []) { await finalize(i.id, bId, 'approved', 'Disetujui', n); } await recalc(bId, n); await fetchData(); } catch (e: any) { setError(e.message); } finally { setProcessing(false); } }
  async function bulkReject(bId: string, n?: string) { setProcessing(true); setError(''); try { const { data: items } = await supabase.from('borrowing_items').select('id').eq('borrowing_id', bId); for (const i of items || []) { await supabase.from('borrowing_items').update({ status: 'rejected', current_status_label: 'Ditolak' }).eq('id', i.id); await supabase.from('approval_history').insert({ borrowing_id: bId, borrowing_item_id: i.id, step_order: 1, step_label: 'Bulk Reject', approver_name: aName || 'Admin', approver_role: aPos || 'Admin', status: 'rejected', notes: n || '', acted_at: new Date().toISOString() }); await sendFinal(bId, i.id, 'rejected'); } await recalc(bId, n); await fetchData(); } catch (e: any) { setError(e.message); } finally { setProcessing(false); } }
  async function markDone(bId: string) { setProcessing(true); try { await supabase.from('borrowings').update({ status: 'completed', current_status_label: 'Selesai', actual_return_date: new Date().toISOString().split('T')[0] }).eq('id', bId); await supabase.from('borrowing_items').update({ status: 'returned', current_status_label: 'Dikembalikan' }).eq('borrowing_id', bId); await fetchData(); } catch (e: any) { setError(e.message); } finally { setProcessing(false); } }

  const filtered = borrowings.filter(b => { const ms = b.borrower_name.toLowerCase().includes(search.toLowerCase()) || (b.borrowing_items || []).some((i: any) => i.item_name.toLowerCase().includes(search.toLowerCase())); const mf = !filter || b.status === filter; return ms && mf; });
  const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Peminjaman</h1><p className="text-slate-600 dark:text-slate-400">Approval bertahap: Pembina &rarr; Wakasek &rarr; PJ &rarr; Sarpras</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[{ l: 'Menunggu', v: borrowings.filter(b => b.status === 'pending').length, i: Clock, c: 'text-amber-500' }, { l: 'Disetujui', v: borrowings.filter(b => b.status === 'approved').length, i: Check, c: 'text-emerald-500' }, { l: 'Total', v: borrowings.length, i: Package, c: 'text-blue-500' }, { l: 'Ditolak', v: borrowings.filter(b => b.status === 'rejected').length, i: X, c: 'text-red-500' }].map((s, i) => <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/50"><div className="flex items-center gap-2"><s.i className={cn('w-4 h-4', s.c)} /><span className="text-lg font-bold text-slate-900 dark:text-white">{s.v}</span></div><span className="text-xs text-slate-500">{s.l}</span></div>)}</div>
      <div className="flex flex-col sm:flex-row gap-4"><div className="relative flex-1 max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" /></div><select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"><option value="">Semua</option><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option><option value="partially_approved">Sebagian</option></select></div>
      {loading ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}</div> : filtered.length === 0 ? <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center"><Package className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">Tidak ada data</p></div> : (
        <div className="space-y-3">{filtered.map(b => { const items = b.borrowing_items || []; const exp = expanded.has(b.id); const pend = items.filter((i: any) => i.status === 'pending').length; return (
          <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
            <div className="flex items-center gap-4 p-4"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{b.borrower_name?.[0]?.toUpperCase() || '?'}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-sm text-slate-900 dark:text-white">{b.borrower_name}</p><span className="text-xs text-slate-500">{b.borrower_class}</span></div><p className="text-xs text-slate-500 truncate">{b.purpose || '-'} &middot; {fmt(b.borrow_date)}</p></div><div className="flex items-center gap-2 flex-shrink-0">{pend > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{pend} menunggu</span>}<span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', SC[b.status] || 'bg-slate-100')}>{b.current_status_label || SL[b.status] || b.status}</span><button onClick={() => toggle(b.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">{exp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div></div>
            {exp && <div className="border-t border-slate-100 dark:border-slate-700">
              <div className="p-4 space-y-2"><div className="flex items-center gap-2 mb-2"><ShoppingCart className="w-4 h-4 text-blue-500" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Item</span></div>
                {items.map((item: any) => { const steps = item.workflow_template_id ? stepsMap[item.workflow_template_id] || [] : []; const cs = item.current_step || 1; const isLast = steps.length > 0 && isLastActionableStep(steps, cs); return (
                  <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg"><div className="flex items-center gap-3">{item.item_type === 'ruangan' ? <Building2 className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-cyan-500" />}<div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.item_name}</p><p className="text-xs text-slate-400">&times;{item.quantity}</p></div><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', SC[item.status] || 'bg-slate-100')}>{item.current_status_label || SL[item.status] || item.status}</span>{item.status === 'pending' && <div className="flex gap-1 flex-shrink-0"><button onClick={() => approveItem(item.id, b.id, notes)} disabled={processing} className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-200 disabled:opacity-50" title={isLast ? 'Setujui (final)' : 'Setujui & lanjut'}><Check className="w-3.5 h-3.5" /></button><button onClick={() => rejectItem(item.id, b.id, notes)} disabled={processing} className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200 disabled:opacity-50"><X className="w-3.5 h-3.5" /></button></div>}</div>
                    {steps.length > 0 && <div className="mt-2 flex items-center gap-1 flex-wrap">{steps.map((s, idx) => { const done = item.status === 'approved' || (item.current_step || 1) > s.step_order; const curr = (item.current_step || 1) === s.step_order && item.status === 'pending'; return <div key={s.id} className="flex items-center gap-1">{idx > 0 && <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />}<span className={cn('text-xs px-1.5 py-0.5 rounded-md', done ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : curr ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-medium' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500')}>{s.is_info_only && '~'}{s.step_label}</span></div>; })}</div>}
                  </div>
                ); })}
              </div>
              <div className="px-4 pb-4 grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-400">Email</span><p className="text-slate-700 dark:text-slate-200 truncate">{b.borrower_email || '-'}</p></div><div><span className="text-slate-400">HP</span><p className="text-slate-700 dark:text-slate-200">{b.borrower_phone || '-'}</p></div></div>
              {b.status === 'pending' && <div className="px-4 pb-4"><div className="grid grid-cols-2 gap-3 mb-3"><input value={aName} onChange={e => setAName(e.target.value)} placeholder="Nama Penyetuju" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /><input value={aPos} onChange={e => setAPos(e.target.value)} placeholder="Jabatan" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></div><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan..." rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none mb-3" /><div className="flex gap-2"><button onClick={() => bulkApprove(b.id, notes)} disabled={processing} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"><Check className="w-4 h-4" /> Setujui Semua</button><button onClick={() => bulkReject(b.id, notes)} disabled={processing} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"><X className="w-4 h-4" /> Tolak Semua</button></div></div>}
              {b.status === 'approved' && <div className="px-4 pb-4"><button onClick={() => markDone(b.id)} disabled={processing} className="w-full px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50">Tandai Selesai</button></div>}
              {error && <div className="mx-4 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" /><p className="text-sm text-red-700 dark:text-red-400">{error}</p></div>}
              {b.approved_by && <div className="mx-4 mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"><User className="w-4 h-4 text-emerald-600" /><div><p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{b.approved_by}</p><p className="text-xs text-emerald-600">{b.approver_position}</p></div></div>}
            </div>}
          </div>
        ); })}</div>
      )}
    </div>
  );
}

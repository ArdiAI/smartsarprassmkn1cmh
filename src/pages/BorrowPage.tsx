import { useState, useEffect, useCallback } from 'react';
import { Search, Send, User, Package, Mail, Phone, Building2, FileText, MessageSquare, AlertCircle, CheckCircle2, Plus, Trash2, ShoppingCart, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getDefaultWorkflow, type WorkflowTemplate } from '../lib/workflow';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';

interface CartItem { id: string; type: 'barang' | 'ruangan'; name: string; quantity: number; available: number; workflowTemplateId?: string; }
const initialForm = { borrower_name: '', borrower_class: '', borrower_email: '', borrower_phone: '', borrow_date: new Date().toISOString().split('T')[0], return_date: '', start_time: '08:00', end_time: '16:00', purpose: '', notes: '' };

export default function BorrowPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [browseType, setBrowseType] = useState<'ruangan' | 'barang'>('ruangan');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [historyEmail, setHistoryEmail] = useState('');
  const [historyBorrowings, setHistoryBorrowings] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearched, setHistorySearched] = useState(false);
  const [defaultWorkflow, setDefaultWorkflow] = useState<WorkflowTemplate | null>(null);

  useEffect(() => { fetchData(); getDefaultWorkflow().then(setDefaultWorkflow); }, []);
  async function fetchData() {
    setLoading(true);
    const [invRes, facRes] = await Promise.all([
      supabase.from('inventory').select('id, name, code, quantity, available_quantity, condition').eq('condition', 'good').order('name'),
      supabase.from('facilities').select('id, name, capacity, status, workflow_template_id').eq('status', 'aktif').order('name'),
    ]);
    setInventory(invRes.data || []); setFacilities(facRes.data || []); setLoading(false);
  }
  const addToCart = useCallback((item: any, type: 'barang' | 'ruangan') => {
    const id = `${type}_${item.id}`;
    if (cart.some(c => c.id === id)) return;
    setCart(prev => [...prev, { id, type, name: item.name, quantity: 1, available: type === 'barang' ? (item.available_quantity ?? item.quantity) : 1, workflowTemplateId: type === 'ruangan' ? (item.workflow_template_id || defaultWorkflow?.id) : (defaultWorkflow?.id) }]);
  }, [cart, defaultWorkflow]);
  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));
  const updateQty = (id: string, d: number) => setCart(prev => prev.map(c => c.id !== id ? c : { ...c, quantity: Math.min(Math.max(1, c.quantity + d), c.available) }));
  const filteredItems = (browseType === 'barang' ? inventory : facilities).filter((item: any) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) { setSubmitError('Pilih minimal satu item'); return; }
    setSubmitting(true); setSubmitError('');
    try {
      const wftId = cart[0]?.workflowTemplateId || defaultWorkflow?.id || null;
      const { data: borrowing, error: bErr } = await supabase.from('borrowings').insert({
        borrower_name: formData.borrower_name, borrower_class: formData.borrower_class, borrower_email: formData.borrower_email, borrower_phone: formData.borrower_phone,
        item_type: 'multi', borrowed_units: cart.length, borrow_date: formData.borrow_date, return_date: formData.return_date || null,
        start_time: formData.start_time, end_time: formData.end_time, purpose: formData.purpose, notes: formData.notes,
        status: 'pending', current_status_label: 'Menunggu Persetujuan', workflow_template_id: wftId, current_step: 1,
      }).select().single();
      if (bErr) throw new Error(bErr.message);
      const items = cart.map(c => ({ borrowing_id: borrowing.id, inventory_id: c.type === 'barang' ? c.id.replace('barang_', '') : null, facility_id: c.type === 'ruangan' ? c.id.replace('ruangan_', '') : null, item_type: c.type, item_name: c.name, quantity: c.quantity, status: 'pending', current_status_label: 'Menunggu Persetujuan', workflow_template_id: c.workflowTemplateId || wftId, current_step: 1 }));
      const { error: iErr } = await supabase.from('borrowing_items').insert(items);
      if (iErr) throw new Error(iErr.message);
      try { const u = import.meta.env.VITE_SUPABASE_URL; await fetch(`${u}/functions/v2/send-borrowing-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'new_request', borrowing_id: borrowing.id, borrower_name: formData.borrower_name, borrower_email: formData.borrower_email, purpose: formData.purpose, borrow_date: formData.borrow_date, return_date: formData.return_date || formData.borrow_date, items: cart.map(c => ({ name: c.name, quantity: c.quantity, type: c.type })), workflow_template_id: wftId }) }); } catch (e) { console.error('Email error:', e); }
      setSubmitSuccess(true); setFormData(initialForm); setCart([]); setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) { setSubmitError(err.message); } finally { setSubmitting(false); }
  }

  async function searchHistory() {
    if (!historyEmail.trim()) return;
    setHistoryLoading(true); setHistorySearched(true);
    const { data } = await supabase.from('borrowings').select('*, borrowing_items(id, item_name, item_type, quantity, status, current_status_label)').eq('borrower_email', historyEmail.trim()).order('created_at', { ascending: false });
    setHistoryBorrowings(data || []); setHistoryLoading(false);
  }

  const inputCls = "w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8"><h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Peminjaman</h1><p className="text-slate-500">Ajukan peminjaman fasilitas dan inventaris</p></div>
        <div className="flex gap-1 mb-8 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 max-w-xs">
          {([['form', 'Form Peminjaman'], ['history', 'Riwayat']] as const).map(([k, l]) => <button key={k} onClick={() => setActiveTab(k)} className={cn('flex-1 py-2 rounded-lg text-sm font-medium', activeTab === k ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400')}>{l}</button>)}
        </div>
        {activeTab === 'form' ? (
          <div>
            {submitSuccess && <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /><div><p className="font-medium text-emerald-800 dark:text-emerald-200">Pengajuan berhasil dikirim!</p><p className="text-sm text-emerald-600 dark:text-emerald-400">Notifikasi telah dikirim. Menunggu persetujuan bertahap.</p></div></div>}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700"><h2 className="font-semibold text-slate-900 dark:text-white">Pilih Fasilitas/Barang</h2><div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">{(['ruangan', 'barang'] as const).map(t => <button key={t} type="button" onClick={() => { setBrowseType(t); setSearchQuery(''); }} className={cn('px-3 py-1.5 rounded-md text-xs font-medium', browseType === t ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400')}>{t === 'ruangan' ? 'Ruangan' : 'Barang'}</button>)}</div></div>
                  <div className="p-4"><div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari..." className={inputCls} /></div>
                    {loading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto">{filteredItems.map((item: any) => { const cid = `${browseType}_${item.id}`; const inCart = cart.some(c => c.id === cid); return <button key={item.id} type="button" disabled={inCart} onClick={() => addToCart(item, browseType)} className={cn('text-left p-3 rounded-xl border-2 transition-all disabled:opacity-40', inCart ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-blue-300')}><div className="flex items-start justify-between gap-1"><p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">{item.name}</p>{inCart ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Plus className="w-4 h-4 text-blue-500 flex-shrink-0" />}</div>{browseType === 'barang' && <p className="text-xs text-slate-400 mt-1">Tersedia: {item.available_quantity ?? item.quantity}</p>}{browseType === 'ruangan' && item.capacity > 0 && <p className="text-xs text-slate-400 mt-1">Kapasitas: {item.capacity}</p>}</button>; })}</div>}
                  </div>
                  {cart.length > 0 && <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"><div className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-700"><ShoppingCart className="w-4 h-4 text-blue-600" /><h3 className="font-semibold text-sm text-slate-900 dark:text-white">Keranjang ({cart.length})</h3></div><div className="p-3 space-y-2 max-h-52 overflow-y-auto">{cart.map(c => <div key={c.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"><div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', c.type === 'ruangan' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-cyan-100 dark:bg-cyan-900/30')}>{c.type === 'ruangan' ? <Building2 className="w-4 h-4 text-blue-600" /> : <Package className="w-4 h-4 text-cyan-600" />}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p><p className="text-xs text-slate-400">{c.type === 'ruangan' ? 'Ruangan' : 'Barang'}</p></div><div className="flex items-center gap-1.5"><button type="button" onClick={() => updateQty(c.id, -1)} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center">&minus;</button><span className="text-sm font-medium w-6 text-center text-slate-900 dark:text-white">{c.quantity}</span><button type="button" onClick={() => updateQty(c.id, 1)} disabled={c.quantity >= c.available} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center disabled:opacity-40">+</button></div><button type="button" onClick={() => removeFromCart(c.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div></div>}
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700"><h2 className="font-semibold text-slate-900 dark:text-white mb-5">Data Peminjam</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[{ l: 'Nama', k: 'borrower_name', i: User, r: true }, { l: 'Kelas', k: 'borrower_class', i: FileText, r: true }, { l: 'Email', k: 'borrower_email', i: Mail, r: true, t: 'email' }, { l: 'No. HP', k: 'borrower_phone', i: Phone, r: false }].map(f => <div key={f.k}><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{f.l}</label><div className="relative"><f.i className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type={(f as any).t || 'text'} value={(formData as any)[f.k]} onChange={e => setFormData(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.l} required={f.r} className={inputCls} /></div></div>)}</div></div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700"><h2 className="font-semibold text-slate-900 dark:text-white mb-5">Waktu & Kegiatan</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tanggal</label><input type="date" value={formData.borrow_date} onChange={e => setFormData(p => ({ ...p, borrow_date: e.target.value }))} required className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kembali</label><input type="date" value={formData.return_date} onChange={e => setFormData(p => ({ ...p, return_date: e.target.value }))} min={formData.borrow_date} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jam Mulai</label><input type="time" value={formData.start_time} onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))} required className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jam Selesai</label><input type="time" value={formData.end_time} onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))} required className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" /></div></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tujuan <span className="text-red-500">*</span></label><textarea value={formData.purpose} onChange={e => setFormData(p => ({ ...p, purpose: e.target.value }))} rows={3} required className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm resize-none" /></div></div>
                {submitError && <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl"><AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-700 dark:text-red-300">{submitError}</p></div>}
                <button type="submit" disabled={submitting || cart.length === 0} className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-lg disabled:opacity-60">{submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-5 h-5" />}{submitting ? 'Mengirim...' : `Ajukan (${cart.length} item)`}</button>
              </div>
              <div className="space-y-4"><div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700"><h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-900 dark:text-white"><Info className="w-4 h-4 text-blue-500" />Ketentuan</h3><ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400"><li className="flex items-start gap-2"><span className="text-blue-500 mt-1">&bull;</span>Satu pengajuan bisa banyak item</li><li className="flex items-start gap-2"><span className="text-blue-500 mt-1">&bull;</span>Approval bertahap: Pembina &rarr; Wakasek &rarr; PJ &rarr; Sarpras</li><li className="flex items-start gap-2"><span className="text-blue-500 mt-1">&bull;</span>Email di setiap tahap</li></ul></div>{cart.length > 0 && <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-700"><h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">Item Terpilih</h3><div className="space-y-2">{cart.map(c => <div key={c.id} className="flex justify-between text-sm"><span className="text-blue-700 dark:text-blue-300">{c.name}</span><span className="text-blue-500 text-xs">&times;{c.quantity}</span></div>)}</div></div>}</div>
            </form>
          </div>
        ) : (
          <div><div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-6"><h2 className="font-semibold text-slate-900 dark:text-white mb-4">Cari Riwayat</h2><div className="flex gap-3"><div className="relative flex-1"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={historyEmail} onChange={e => setHistoryEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchHistory()} placeholder="Email..." className={inputCls} /></div><button onClick={searchHistory} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Cari</button></div></div>{historyLoading && <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}{historySearched && !historyLoading && historyBorrowings.length === 0 && <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"><MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Tidak ada riwayat</p></div>}<div className="space-y-3">{historyBorrowings.map(b => <HistoryCard key={b.id} b={b} />)}</div></div>
        )}
      </div>
      <Footer />
    </div>
  );
}

const SC: Record<string, string> = { pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', partially_approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
function HistoryCard({ b }: { b: any }) {
  const [exp, setExp] = useState(false);
  const items: any[] = b.borrowing_items || [];
  const rej = items.some(i => i.status === 'rejected'); const ok = items.length > 0 && items.every(i => i.status === 'approved' || i.status === 'returned');
  const st = rej ? 'rejected' : ok ? 'approved' : 'pending'; const lb = rej ? 'Ditolak' : ok ? 'Disetujui' : 'Menunggu';
  return <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"><div className="flex items-center gap-4 p-4"><div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0"><ShoppingCart className="w-5 h-5 text-blue-600" /></div><div className="flex-1 min-w-0"><p className="font-medium text-sm text-slate-900 dark:text-white truncate">{b.purpose || '-'}</p><p className="text-xs text-slate-500">{new Date(b.borrow_date || b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} &middot; {items.length} item</p></div><span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', SC[st] || 'bg-slate-100')}>{lb}</span><button onClick={() => setExp(!exp)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">{exp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div>{exp && <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-2">{items.map(i => <div key={i.id} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg">{i.item_type === 'ruangan' ? <Building2 className="w-4 h-4 text-blue-500" /> : <Package className="w-4 h-4 text-cyan-500" />}<span className="text-sm flex-1 text-slate-700 dark:text-slate-300">{i.item_name} &times;{i.quantity}</span><span className={cn('px-2 py-0.5 rounded-full text-xs', SC[i.status] || 'bg-slate-100')}>{i.current_status_label || i.status}</span></div>)}</div>}</div>;
}

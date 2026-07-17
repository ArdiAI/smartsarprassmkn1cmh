import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Users, Plus, Trash2, X, Building, Mail, Phone } from 'lucide-react';

export default function FacilityManagersPage() {
  const [managers, setManagers] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', facility_id: '' });

  useEffect(() => { fetch(); }, []);
  async function fetch() {
    setLoading(true);
    const [m, f] = await Promise.all([supabase.from('facility_managers').select('*, facilities(name)').order('created_at', { ascending: false }), supabase.from('facilities').select('id, name').order('name')]);
    setManagers(m.data || []); setFacilities(f.data || []); setLoading(false);
  }
  async function add() {
    await supabase.from('facility_managers').insert({ name: form.name, email: form.email, phone: form.phone, facility_id: form.facility_id || null });
    setForm({ name: '', email: '', phone: '', facility_id: '' }); setShowAdd(false); fetch();
  }
  async function remove(id: string) {
    if (!confirm('Hapus PJ fasilitas ini?')) return;
    await supabase.from('facility_managers').delete().eq('id', id); fetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1><p className="text-slate-600 dark:text-slate-400">Kelola penanggung jawab fasilitas</p></div><button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"><Plus className="w-4 h-4" /> Tambah PJ</button></div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}</div> : managers.length === 0 ? <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center"><Users className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">Belum ada PJ fasilitas</p></div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{managers.map(m => <div key={m.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium">{m.name?.[0] || '?'}</div><div><h3 className="font-semibold text-slate-900 dark:text-white">{m.name}</h3>{m.facilities && <p className="text-xs text-blue-500">{m.facilities.name}</p>}</div></div><button onClick={() => remove(m.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button></div><div className="mt-3 space-y-1 text-sm text-slate-500">{m.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {m.email}</p>}{m.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {m.phone}</p>}</div></div>)}</div>
      )}
      {showAdd && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}><div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah PJ Fasilitas</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div><div className="space-y-3"><div><label className="text-sm text-slate-600 dark:text-slate-400">Nama</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div><div><label className="text-sm text-slate-600 dark:text-slate-400">Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div><div><label className="text-sm text-slate-600 dark:text-slate-400">Telepon</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div><div><label className="text-sm text-slate-600 dark:text-slate-400">Fasilitas</label><select value={form.facility_id} onChange={e => setForm({ ...form, facility_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1"><option value="">-</option>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div></div><button onClick={add} className="w-full mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Simpan</button></div></div>}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Shield, Plus, Trash2, Edit, X, Check } from 'lucide-react';

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', level: 0, description: '' });

  useEffect(() => { fetch(); }, []);
  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('roles').select('*').order('level', { ascending: true });
    setRoles(data || []); setLoading(false);
  }
  async function add() {
    await supabase.from('roles').insert({ name: form.name, level: Number(form.level), description: form.description });
    setForm({ name: '', level: 0, description: '' }); setShowAdd(false); fetch();
  }
  async function remove(id: string) {
    if (!confirm('Hapus role ini?')) return;
    await supabase.from('roles').delete().eq('id', id); fetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1><p className="text-slate-600 dark:text-slate-400">Kelola role dan tingkat akses</p></div><button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"><Plus className="w-4 h-4" /> Tambah Role</button></div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{roles.map(r => <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50"><div className="flex items-start justify-between"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div><button onClick={() => remove(r.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button></div><h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{r.name}</h3><p className="text-xs text-slate-400 mt-1">Level {r.level}</p>{r.description && <p className="text-sm text-slate-500 mt-2">{r.description}</p>}</div>)}</div>
      )}
      {showAdd && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}><div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Role</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div><div className="space-y-3"><div><label className="text-sm text-slate-600 dark:text-slate-400">Nama Role</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div><div><label className="text-sm text-slate-600 dark:text-slate-400">Level</label><input type="number" value={form.level} onChange={e => setForm({ ...form, level: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div><div><label className="text-sm text-slate-600 dark:text-slate-400">Deskripsi</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div></div><button onClick={add} className="w-full mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Simpan</button></div></div>}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Mail, Plus, Trash2, X, Save, Check, AlertCircle } from 'lucide-react';

export default function ApproverEmailsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ role_name: '', email: '' });
  const [error, setError] = useState('');

  useEffect(() => { fetch(); }, []);
  async function fetch() {
    setLoading(true);
    const [r, rolesD] = await Promise.all([supabase.from('role_approver_emails').select('*').order('role_name', { ascending: true }), supabase.from('roles').select('name').order('level', { ascending: true })]);
    setRows(r.data || []); setRoles(rolesD.data || []); setLoading(false);
  }
  async function add() {
    setError('');
    if (!form.role_name || !form.email) { setError('Role dan email wajib diisi'); return; }
    const { error: e } = await supabase.from('role_approver_emails').insert({ role_name: form.role_name, email: form.email });
    if (e) { setError(e.message); return; }
    setForm({ role_name: '', email: '' }); setShowAdd(false); fetch();
  }
  async function remove(id: string) {
    if (!confirm('Hapus mapping ini?')) return;
    await supabase.from('role_approver_emails').delete().eq('id', id); fetch();
  }
  async function update(id: string, email: string) { await supabase.from('role_approver_emails').update({ email }).eq('id', id); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Approver</h1><p className="text-slate-600 dark:text-slate-400">Mapping role ke email untuk notifikasi persetujuan</p></div><button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"><Plus className="w-4 h-4" /> Tambah Mapping</button></div>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-blue-700 dark:text-blue-400">Email approver digunakan oleh sistem notifikasi untuk mengirim email ke pejabat yang berwenang pada setiap tahap persetujuan. Pastikan email yang dimasukkan valid.</p></div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}</div> : rows.length === 0 ? <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center"><Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">Belum ada mapping email approver</p></div> : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden"><table className="w-full"><thead><tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500 uppercase"><th className="p-4">Role</th><th className="p-4">Email</th><th className="p-4"></th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700/50"><td className="p-4"><span className="text-sm font-medium text-slate-900 dark:text-white">{r.role_name}</span></td><td className="p-4"><input defaultValue={r.email} onBlur={e => update(r.id, e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /></td><td className="p-4"><button onClick={() => remove(r.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody></table></div>
      )}
      {showAdd && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}><div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Mapping</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div>{error && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-600">{error}</div>}<div className="space-y-3"><div><label className="text-sm text-slate-600 dark:text-slate-400">Role</label><select value={form.role_name} onChange={e => setForm({ ...form, role_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1"><option value="">Pilih role...</option>{roles.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}</select></div><div><label className="text-sm text-slate-600 dark:text-slate-400">Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="approver@example.com" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div></div><button onClick={add} className="w-full mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Simpan</button></div></div>}
    </div>
  );
}

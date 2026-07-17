import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, UserCog, Trash2, Plus, X, Check, Edit } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role_id: '' });
  const [error, setError] = useState('');

  useEffect(() => { fetch(); }, []);
  async function fetch() {
    setLoading(true);
    const [a, r] = await Promise.all([supabase.from('admin_users').select('*, roles(name, level)').order('created_at', { ascending: false }), supabase.from('roles').select('*').order('level', { ascending: true })]);
    setAdmins(a.data || []); setRoles(r.data || []); setLoading(false);
  }

  async function addAdmin() {
    setError('');
    const { data: u } = await supabase.from('profiles').select('id, email, name').eq('email', form.email).single();
    if (!u) { setError('User belum terdaftar. Minta user registrasi terlebih dahulu.'); return; }
    const { error: e } = await supabase.from('admin_users').insert({ user_id: u.id, email: u.email, name: form.name || u.name, role_id: form.role_id });
    if (e) { setError(e.message); return; }
    setForm({ email: '', name: '', role_id: '' }); setShowAdd(false); fetch();
  }
  async function removeAdmin(id: string) {
    if (!confirm('Hapus admin ini?')) return;
    await supabase.from('admin_users').delete().eq('id', id); fetch();
  }
  async function updateRole(id: string, roleId: string) {
    await supabase.from('admin_users').update({ role_id: roleId }).eq('id', id); fetch();
  }

  const filtered = admins.filter(a => a.email?.toLowerCase().includes(search.toLowerCase()) || a.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen User</h1><p className="text-slate-600 dark:text-slate-400">Kelola admin dan role user</p></div><button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"><Plus className="w-4 h-4" /> Tambah Admin</button></div>
      <div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari admin..." className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" /></div>
      {loading ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}</div> : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500 uppercase"><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Dibuat</th><th className="p-4"></th></tr></thead>
            <tbody>{filtered.map(a => <tr key={a.id} className="border-b border-slate-100 dark:border-slate-700/50"><td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium text-blue-600">{a.name?.[0] || 'A'}</div><div><p className="text-sm font-medium text-slate-900 dark:text-white">{a.name}</p><p className="text-xs text-slate-400">{a.email}</p></div></div></td><td className="p-4"><select value={a.role_id || ''} onChange={e => updateRole(a.id, e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"><option value="">-</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></td><td className="p-4 text-sm text-slate-500">{new Date(a.created_at).toLocaleDateString('id-ID')}</td><td className="p-4"><button onClick={() => removeAdmin(a.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {showAdd && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}><div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Admin</h2><button onClick={() => setShowAdd(false)} className="p-1"><X className="w-5 h-5" /></button></div>{error && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-600">{error}</div>}<div className="space-y-3"><div><label className="text-sm text-slate-600 dark:text-slate-400">Email User (sudah registrasi)</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div><div><label className="text-sm text-slate-600 dark:text-slate-400">Nama</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div><div><label className="text-sm text-slate-600 dark:text-slate-400">Role</label><select value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1"><option value="">Pilih role...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div></div><button onClick={addAdmin} className="w-full mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Simpan</button></div></div>}
    </div>
  );
}

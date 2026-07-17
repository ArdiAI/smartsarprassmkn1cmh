import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, Plus, Pencil, Trash2, UserCog, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface AdminUser { id: string; name: string; email: string; role: string; is_active: boolean; }

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ user: AdminUser | null; open: boolean }>({ user: null, open: false });
  const [form, setForm] = useState({ name: '', email: '', role: 'admin', is_active: true });

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('admin_users').select('*').order('name');
    setUsers(data || []);
    setLoading(false);
  }

  async function save() {
    if (modal.user) {
      await supabase.from('admin_users').update(form).eq('id', modal.user.id);
    } else {
      await supabase.from('admin_users').insert(form);
    }
    setModal({ user: null, open: false });
    fetch();
  }

  async function del(id: string) {
    if (!confirm('Hapus user ini?')) return;
    await supabase.from('admin_users').delete().eq('id', id);
    fetch();
  }

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen User</h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola admin dan staff sistem</p>
        </div>
        <button onClick={() => { setForm({ name: '', email: '', role: 'admin', is_active: true }); setModal({ user: null, open: true }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah User
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari user..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
      </div>

      {loading ? <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{u.role}</span></td>
                  <td className="px-4 py-3"><span className={cn('w-2 h-2 rounded-full inline-block', u.is_active ? 'bg-green-500' : 'bg-slate-400')} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setForm({ name: u.name, email: u.email, role: u.role, is_active: u.is_active }); setModal({ user: u, open: true }); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={() => del(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal({ user: null, open: false })}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{modal.user ? 'Edit User' : 'Tambah User'}</h2>
              <button onClick={() => setModal({ user: null, open: false })}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Aktif
              </label>
              <button onClick={save} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

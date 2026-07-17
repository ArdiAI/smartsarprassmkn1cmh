import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Shield, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface AdminUser {
  id: string; name: string; email: string; role: string; is_active: boolean; created_at: string;
}
interface FormState { name: string; email: string; role: string; is_active: boolean; }
const emptyForm: FormState = { name: '', email: '', role: 'admin', is_active: true };
const roleColor: Record<string, string> = {
  superadmin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  operator: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

export default function TeamAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
    setUsers((data as AdminUser[]) || []);
    setLoading(false);
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(u: AdminUser) {
    setEditing(u);
    setForm({ name: u.name || '', email: u.email, role: u.role || 'admin', is_active: u.is_active });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = { name: form.name, email: form.email, role: form.role, is_active: form.is_active };
    if (editing) {
      await supabase.from('admin_users').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('admin_users').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetch();
  }

  async function toggleActive(u: AdminUser) {
    await supabase.from('admin_users').update({ is_active: !u.is_active }).eq('id', u.id);
    fetch();
  }

  async function remove(id: string) {
    if (!confirm('Hapus anggota tim ini?')) return;
    await supabase.from('admin_users').delete().eq('id', id);
    fetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tim Admin</h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola akun admin dan operator</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada anggota tim</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nama</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{u.name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                    <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', roleColor[u.role] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>{u.role}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(u)} className={cn('px-2 py-0.5 rounded-full text-xs font-medium', u.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400')}>
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(u)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(u.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Anggota' : 'Tambah Anggota'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="superadmin">Superadmin</option><option value="admin">Admin</option><option value="operator">Operator</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                Akun Aktif
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={save} disabled={saving || !form.email} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

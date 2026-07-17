import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { Plus, Pencil, Trash2, Users, X, AlertTriangle, Mail, Shield } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approver: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  viewer: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};
const ROLE_LABELS: Record<string, string> = { super_admin: 'Super Admin', admin: 'Admin', approver: 'Approver', viewer: 'Viewer' };

const EMPTY: Omit<AdminUser, 'id'> = { name: '', email: '', role: 'admin', is_active: true };

export default function TeamAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    if (data) setUsers(data as AdminUser[]);
    setLoading(false);
  }

  function openAdd() { setEditId(null); setForm(EMPTY); setError(''); setModalOpen(true); }
  function openEdit(u: AdminUser) { setEditId(u.id); setForm({ ...u }); setError(''); setModalOpen(true); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      if (!form.email.trim()) throw new Error('Email wajib diisi');
      if (editId) {
        const { error: e } = await supabase.from('admin_users').update(form).eq('id', editId);
        if (e) throw new Error(e.message);
      } else {
        const { error: e } = await supabase.from('admin_users').insert(form);
        if (e) throw new Error(e.message);
      }
      setModalOpen(false); fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus admin ini?')) return;
    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (error) alert(error.message); else fetchData();
  }

  async function toggleActive(u: AdminUser) {
    const { error } = await supabase.from('admin_users').update({ is_active: !u.is_active }).eq('id', u.id);
    if (error) alert(error.message); else fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-6 h-6 text-emerald-500" /> Kelola Tim Admin</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Tambah, ubah, dan kelola admin</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah Admin
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />)}</div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada admin</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold flex-shrink-0', u.is_active ? 'bg-gradient-to-br from-emerald-500 to-teal-400' : 'bg-slate-400')}>
                    {u.name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{u.name || '-'}</p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
                  </div>
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0', ROLE_COLORS[u.role] || 'bg-slate-100')}>
                  <Shield className="w-3 h-3" /> {ROLE_LABELS[u.role] || u.role}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => toggleActive(u)} className={cn('flex items-center gap-1.5 text-xs font-medium', u.is_active ? 'text-emerald-600' : 'text-slate-400')}>
                  <span className={cn('w-2 h-2 rounded-full', u.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                  {u.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-200"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editId ? 'Edit Admin' : 'Tambah Admin'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="approver">Approver</option><option value="viewer">Viewer</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>
              {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"><AlertTriangle className="w-4 h-4 text-red-500" /><p className="text-sm text-red-700 dark:text-red-400">{error}</p></div>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

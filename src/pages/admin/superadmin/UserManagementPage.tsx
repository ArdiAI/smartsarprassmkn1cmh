import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import {
  Plus, Search, Edit, Trash2, X, Users, Mail, Calendar,
  Shield, Check, ChevronDown, UserCheck, AlertCircle
} from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  created_at: string;
  roles?: Role[];
}

interface Role {
  id: string;
  name: string;
  level: number;
  description: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [usersRes, rolesRes] = await Promise.all([
      supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
      supabase.from('roles').select('*').order('level', { ascending: false }),
    ]);

    const rawUsers = usersRes.data || [];
    const fetchedRoles = rolesRes.data || [];
    setRoles(fetchedRoles);

    // Fetch role assignments for each user
    const { data: assignments } = await supabase
      .from('admin_user_roles')
      .select('admin_user_id, role_id, roles(id, name, level, description)');

    const assignMap: Record<string, Role[]> = {};
    (assignments || []).forEach((a: any) => {
      if (!assignMap[a.admin_user_id]) assignMap[a.admin_user_id] = [];
      if (a.roles) assignMap[a.admin_user_id].push(a.roles);
    });

    setUsers(rawUsers.map((u: any) => ({ ...u, roles: assignMap[u.id] || [] })));
    setLoading(false);
  }

  function openCreate() {
    setEditingUser(null);
    setFormData({ email: '', password: '', name: '' });
    setSelectedRoles([]);
    setError('');
    setShowModal(true);
  }

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setFormData({ email: user.email, password: '', name: user.name || '' });
    setSelectedRoles((user.roles || []).map(r => r.id));
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      let adminUserId = editingUser?.id;

      if (!editingUser) {
        // Create auth user
        const { data: authData, error: authErr } = await supabase.auth.admin
          ? { data: null, error: { message: 'admin.createUser not available on client' } }
          : { data: null, error: { message: 'use_service_role' } };

        // Fallback: create via sign-up
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { name: formData.name } },
        });

        if (signUpErr) throw new Error(signUpErr.message);
        const userId = signUpData.user?.id;
        if (!userId) throw new Error('Gagal membuat akun');

        const { data: adminData, error: adminErr } = await supabase
          .from('admin_users')
          .insert({ user_id: userId, email: formData.email, name: formData.name })
          .select()
          .single();

        if (adminErr) throw new Error(adminErr.message);
        adminUserId = adminData.id;
      } else {
        await supabase.from('admin_users')
          .update({ name: formData.name, email: formData.email })
          .eq('id', editingUser.id);
      }

      // Sync roles
      if (adminUserId) {
        await supabase.from('admin_user_roles').delete().eq('admin_user_id', adminUserId);
        if (selectedRoles.length > 0) {
          await supabase.from('admin_user_roles').insert(
            selectedRoles.map(rid => ({ admin_user_id: adminUserId, role_id: rid }))
          );
        }
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('admin_users').delete().eq('id', id);
    setDeleteId(null);
    fetchData();
  }

  function toggleRole(id: string) {
    setSelectedRoles(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getLevelColor = (level: number) => {
    if (level >= 100) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    if (level >= 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (level >= 50) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (level >= 30) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Pengguna</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola admin pengguna dan hak akses mereka</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium shadow-lg hover:shadow-blue-500/30 transition-all">
          <Plus className="w-4 h-4" /> Tambah Pengguna
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari pengguna..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Pengguna</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Email</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Role</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 hidden lg:table-cell">Terdaftar</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Tidak ada pengguna ditemukan</td></tr>
              ) : filtered.map((user, i) => (
                <motion.tr key={user.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {(user.name || user.email)?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{user.name || '-'}</div>
                        <div className="text-slate-500 text-xs md:hidden">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 hidden md:table-cell">{user.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(user.roles || []).length === 0 ? (
                        <span className="text-slate-400 text-xs">Tidak ada role</span>
                      ) : (user.roles || []).slice(0, 2).map(r => (
                        <span key={r.id} className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getLevelColor(r.level))}>{r.name}</span>
                      ))}
                      {(user.roles || []).length > 2 && (
                        <span className="text-xs text-slate-400">+{(user.roles || []).length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs hidden lg:table-cell">
                    {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(user.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama</label>
                  <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nama lengkap" required
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@domain.com" required
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                    <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                      placeholder="Minimal 8 karakter" required minLength={8}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Assign Role</label>
                  <div className="grid grid-cols-1 gap-2">
                    {roles.map(role => (
                      <label key={role.id} className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                        selectedRoles.includes(role.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                      )}>
                        <div className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          selectedRoles.includes(role.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                        )}>
                          {selectedRoles.includes(role.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={selectedRoles.includes(role.id)}
                          onChange={() => toggleRole(role.id)} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{role.name}</div>
                          <div className="text-xs text-slate-500">{role.description}</div>
                        </div>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getLevelColor(role.level))}>
                          Lv.{role.level}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium">Batal</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                    {saving ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat Pengguna'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">Hapus Pengguna?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium">Batal</button>
                <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium">Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

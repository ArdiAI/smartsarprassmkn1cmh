import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Users, Search, UserPlus, Trash2, Shield, Loader2, Mail, CheckCircle, XCircle, RefreshCw,
} from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number | null;
  is_system: boolean | null;
  is_active: boolean | null;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data admin', 'error');
    } else {
      setUsers((data as unknown as AdminUser[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  const handleAdd = async () => {
    if (!newEmail.trim()) {
      showToast('Email wajib diisi', 'warning');
      return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .insert({
          email: newEmail.trim(),
          name: newName.trim() || null,
          role: newRole || null,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      setUsers(prev => [data as unknown as AdminUser, ...prev]);
      showToast('Admin berhasil ditambahkan', 'success');
      setShowAdd(false);
      setNewEmail('');
      setNewName('');
      setNewRole('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menambah admin';
      showToast(msg, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Hapus admin ini?')) return;
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast('Admin dihapus', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus admin';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setUpdatingId(user.id);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      showToast('Status admin diperbarui', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal mengubah status';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleChange = async (user: AdminUser, role: string) => {
    setUpdatingId(user.id);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role })
        .eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u));
      showToast('Role diperbarui', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal mengubah role';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Manajemen Admin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengguna admin dan peran mereka dalam sistem
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Muat ulang"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Admin
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari berdasarkan nama, email, atau role..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Tidak ada admin ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(user => (
            <div
              key={user.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {user.name ?? 'Tanpa Nama'}
                    </p>
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        <XCircle className="w-3 h-3" /> Nonaktif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{user.email ?? '-'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={user.role ?? ''}
                  onChange={e => handleRoleChange(user, e.target.value)}
                  disabled={updatingId === user.id}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Pilih Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleToggleActive(user)}
                  disabled={updatingId === user.id}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50',
                    user.is_active
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                  )}
                >
                  {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>

                <button
                  onClick={() => handleRemove(user.id)}
                  disabled={updatingId === user.id}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                  title="Hapus admin"
                >
                  {updatingId === user.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tambah Admin Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nama lengkap admin"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

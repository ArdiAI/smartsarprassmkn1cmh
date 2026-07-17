import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Users,
  Search,
  UserPlus,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldX,
  Mail,
  Loader2,
  X,
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
  level: number | null;
  is_system: boolean | null;
  is_active: boolean | null;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data admin: ' + error.message, 'error');
    } else {
      setUsers((data ?? []) as unknown as AdminUser[]);
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level, is_system, is_active')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat roles: ' + error.message, 'error');
    } else {
      setRoles((data ?? []) as unknown as Role[]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const filteredUsers = users.filter(u => {
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
    const roleValue = newRole || 'admin';
    const { error } = await supabase.from('admin_users').insert({
      email: newEmail.trim(),
      name: newName.trim() || null,
      role: roleValue,
      user_id: null,
      is_active: true,
    });
    if (error) {
      showToast('Gagal menambah admin: ' + error.message, 'error');
    } else {
      showToast('Admin berhasil ditambahkan', 'success');
      setShowAddModal(false);
      setNewEmail('');
      setNewName('');
      setNewRole('');
      fetchUsers();
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Hapus admin ini?')) return;
    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus admin: ' + error.message, 'error');
    } else {
      showToast('Admin berhasil dihapus', 'success');
      fetchUsers();
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    const { error } = await supabase.from('admin_users').update({ role }).eq('id', id);
    if (error) {
      showToast('Gagal mengubah role: ' + error.message, 'error');
    } else {
      showToast('Role berhasil diperbarui', 'success');
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, role } : u)));
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    const next = !(user.is_active ?? false);
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: next })
      .eq('id', user.id);
    if (error) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
    } else {
      showToast('Status berhasil diperbarui', 'success');
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, is_active: next } : u)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Manajemen Admin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengguna admin dan rolenya
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Admin
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari berdasarkan nama, email, atau role..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Tidak ada admin ditemukan
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map(user => (
            <div
              key={user.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                      user.is_active
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-slate-100 dark:bg-slate-700'
                    )}
                  >
                    <Shield className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {user.name ?? 'Tanpa Nama'}
                      </p>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          user.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        )}
                      >
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                      <Mail className="w-3.5 h-3.5" />
                      {user.email ?? '-'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Dibuat: {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <select
                    value={user.role ?? ''}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Pilih Role</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleToggleActive(user)}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      user.is_active
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                    )}
                  >
                    {user.is_active ? <ShieldX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>

                  <button
                    onClick={() => handleRemove(user.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Admin Baru</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama (opsional)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Tambah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

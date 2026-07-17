import { useEffect, useState, useCallback } from 'react';
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
  Loader2,
  Mail,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ---- Types matching the `admin_users` + `roles` tables ----
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
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description, level, is_system, is_active')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat roles: ' + error.message, 'error');
      return;
    }
    setRoles((data ?? []) as unknown as Role[]);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, user_id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat admin users: ' + error.message, 'error');
    } else {
      setUsers((data ?? []) as unknown as AdminUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const filtered = users.filter(u => {
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
    setSaving(true);
    const roleValue = newRole || 'staff';
    const { error } = await supabase
      .from('admin_users')
      .insert({
        email: newEmail.trim(),
        name: newName.trim() || null,
        role: roleValue,
        is_active: true,
      });
    setSaving(false);
    if (error) {
      showToast('Gagal menambah admin: ' + error.message, 'error');
      return;
    }
    showToast('Admin berhasil ditambahkan', 'success');
    setNewEmail('');
    setNewName('');
    setNewRole('');
    setShowAdd(false);
    fetchUsers();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Hapus admin ini? Tindakan ini tidak dapat dibatalkan.')) return;
    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Admin dihapus', 'success');
    fetchUsers();
  };

  const handleToggleActive = async (user: AdminUser) => {
    const next = !(user.is_active ?? false);
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: next })
      .eq('id', user.id);
    if (error) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
      return;
    }
    showToast(next ? 'Admin diaktifkan' : 'Admin dinonaktifkan', 'success');
    setUsers(prev =>
      prev.map(u => (u.id === user.id ? { ...u, is_active: next } : u))
    );
  };

  const handleRoleChange = async (user: AdminUser, role: string) => {
    const { error } = await supabase
      .from('admin_users')
      .update({ role })
      .eq('id', user.id);
    if (error) {
      showToast('Gagal mengubah role: ' + error.message, 'error');
      return;
    }
    showToast('Role diperbarui', 'success');
    setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, role } : u)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Manajemen Admin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola akun admin dan peran mereka dalam sistem
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2 justify-center"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Admin
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari berdasarkan email, nama, atau role..."
            className="input pl-11"
          />
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Tidak ada admin ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-left text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Admin</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Dibuat</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map(user => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {user.name ?? 'Tanpa Nama'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email ?? '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role ?? ''}
                        onChange={e => handleRoleChange(user, e.target.value)}
                        className="input py-1.5 text-xs min-w-[140px]"
                      >
                        <option value="">Pilih role</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                          user.is_active
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        )}
                      >
                        {user.is_active ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                        {user.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(user.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Hapus admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Tambah Admin Baru
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Nama (opsional)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="input"
                >
                  <option value="">Pilih role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Tambah
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

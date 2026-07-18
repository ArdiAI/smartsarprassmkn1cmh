import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Users, UserPlus, Trash2, Search, Loader2, Shield, Mail,
  ToggleLeft, ToggleRight, X, Tag,
} from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  role: string | null;
  is_active: boolean;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
}

interface AdminUserRole {
  role_id: string;
}

export default function UserManagementPage() {
  const { hasPermission, refreshAdminProfile } = useAuth();
  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newRoleId, setNewRoleId] = useState('');

  // Role edit
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, user_id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data admin', 'error');
      setLoading(false);
      return;
    }
    setUsers((data as unknown as AdminUser[]) || []);
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level, is_active')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
      return;
    }
    setRoles((data as unknown as Role[]) || []);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  const handleAddAdmin = async () => {
    if (!canCreate) {
      showToast('Anda tidak memiliki izin untuk menambah admin', 'error');
      return;
    }
    if (!newEmail.trim() || !newName.trim()) {
      showToast('Email dan nama wajib diisi', 'warning');
      return;
    }
    setActionLoading('add');
    try {
      const email = newEmail.trim().toLowerCase();
      const name = newName.trim();
      const userId = newUserId.trim() || null;

      // Check if admin with this email already exists
      const { data: existing } = await supabase
        .from('admin_users')
        .select('id, user_id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        showToast('Admin dengan email tersebut sudah ada', 'warning');
        setActionLoading(null);
        return;
      }

      // If userId blank, try to look up existing admin_users by email to reuse user_id
      let finalUserId = userId;
      if (!finalUserId) {
        const { data: byEmail } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('email', email)
          .maybeSingle();
        if (byEmail && byEmail.user_id) {
          finalUserId = byEmail.user_id;
        }
      }

      let roleName: string | null = null;
      if (newRoleId) {
        const role = roles.find(r => r.id === newRoleId);
        if (role) roleName = role.name;
      }

      const { data: inserted, error } = await supabase
        .from('admin_users')
        .insert({
          user_id: finalUserId,
          email,
          name,
          role: roleName,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        showToast('Gagal menambah admin: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }

      // Upsert into admin_user_roles if a role was selected
      if (newRoleId && inserted) {
        const { error: roleErr } = await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: inserted.id, role_id: newRoleId },
            { onConflict: 'admin_user_id,role_id' },
          );
        if (roleErr) {
          showToast('Admin ditambahkan, tapi gagal menetapkan role: ' + roleErr.message, 'warning');
        }
      } else if (!finalUserId) {
        showToast('Admin ditambahkan. user_id kosong — minta admin login untuk melengkapi.', 'info');
      }

      showToast('Admin berhasil ditambahkan', 'success');
      setShowAddModal(false);
      setNewEmail('');
      setNewName('');
      setNewUserId('');
      setNewRoleId('');
      await fetchUsers();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Terjadi kesalahan saat menambah admin', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (user: AdminUser, roleId: string) => {
    if (!canUpdate) {
      showToast('Anda tidak memiliki izin untuk mengubah role', 'error');
      return;
    }
    setActionLoading(`role-${user.id}`);
    try {
      const role = roles.find(r => r.id === roleId);
      const roleName = role?.name ?? null;

      // 1. Update admin_users.role text column (backwards-compatible display)
      const { error: updErr } = await supabase
        .from('admin_users')
        .update({ role: roleName })
        .eq('id', user.id);
      if (updErr) {
        showToast('Gagal memperbarui role: ' + updErr.message, 'error');
        setActionLoading(null);
        return;
      }

      // 2. Delete existing role assignments for this admin user
      await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', user.id);

      // 3. Upsert new role assignment into admin_user_roles
      if (roleId) {
        const { error: roleErr } = await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: user.id, role_id: roleId },
            { onConflict: 'admin_user_id,role_id' },
          );
        if (roleErr) {
          showToast('Role diperbarui, tapi gagal menulis admin_user_roles: ' + roleErr.message, 'warning');
        }
      }

      showToast('Role berhasil diperbarui', 'success');
      setEditingRoleId(null);
      await fetchUsers();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Terjadi kesalahan saat memperbarui role', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (!canUpdate) {
      showToast('Anda tidak memiliki izin untuk mengubah status admin', 'error');
      return;
    }
    setActionLoading(`toggle-${user.id}`);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) {
        showToast('Gagal mengubah status: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast(user.is_active ? 'Admin dinonaktifkan' : 'Admin diaktifkan', 'success');
      await fetchUsers();
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAdmin = async (user: AdminUser) => {
    if (!canDelete) {
      showToast('Anda tidak memiliki izin untuk menghapus admin', 'error');
      return;
    }
    if (!confirm(`Hapus admin "${user.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setActionLoading(`del-${user.id}`);
    try {
      // 1. Delete from admin_user_roles first
      await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', user.id);

      // 2. Delete the admin_users row
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', user.id);
      if (error) {
        showToast('Gagal menghapus admin: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast('Admin berhasil dihapus', 'success');
      await fetchUsers();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Terjadi kesalahan saat menghapus admin', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Admin</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola akun admin dan role yang ditetapkan
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, email, atau role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Admin
          </button>
        )}
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada admin</p>
          <p className="text-sm text-slate-400 mt-1">Belum ada akun admin yang terdaftar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => (
            <div
              key={user.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {user.name ?? '—'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" />
                      {user.email ?? '—'}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    user.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
                  )}
                >
                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                    <Tag className="w-3 h-3" /> Role
                  </label>
                  {editingRoleId === user.id && canUpdate ? (
                    <div className="flex gap-2">
                      <select
                        defaultValue={(() => {
                          // Try to find current role id from roles list by matching name
                          const match = roles.find(r => r.name === user.role);
                          return match?.id ?? '';
                        })()}
                        onChange={e => handleUpdateRole(user, e.target.value)}
                        disabled={actionLoading === `role-${user.id}`}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">— Tanpa Role —</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} (Lvl {r.level})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setEditingRoleId(null)}
                        className="px-2 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {user.role ?? '—'}
                      </span>
                      {canUpdate && (
                        <button
                          onClick={() => setEditingRoleId(user.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Ubah
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-400 dark:text-slate-500">
                  Terdaftar: {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  {canUpdate && (
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={actionLoading === `toggle-${user.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      {user.is_active ? (
                        <ToggleRight className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                      )}
                      {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleRemoveAdmin(user)}
                      disabled={actionLoading === `del-${user.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Admin Baru</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nama lengkap admin"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  User ID (UUID) — opsional
                </label>
                <input
                  type="text"
                  value={newUserId}
                  onChange={e => setNewUserId(e.target.value)}
                  placeholder="Kosongkan untuk lookup otomatis"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Jika dikosongkan, sistem akan mencari user_id berdasarkan email.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={newRoleId}
                  onChange={e => setNewRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Level {r.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddAdmin}
                disabled={actionLoading === 'add'}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading === 'add' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

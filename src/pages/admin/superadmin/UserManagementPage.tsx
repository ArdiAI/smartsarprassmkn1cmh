import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Shield,
  UserCog,
  Mail,
  X,
  Loader2,
} from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
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
  const [showRoleModal, setShowRoleModal] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Add form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newRoleId, setNewRoleId] = useState('');

  // Role edit form
  const [editRoleId, setEditRoleId] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, user_id, email, name, role, is_active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers((data ?? []) as unknown as AdminUser[]);
    } catch (e) {
      showToast('Gagal memuat data admin', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, level, is_active')
        .eq('is_active', true)
        .order('level', { ascending: false });
      if (error) throw error;
      setRoles((data ?? []) as unknown as Role[]);
    } catch {
      showToast('Gagal memuat daftar role', 'error');
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  const handleAdd = async () => {
    if (!newEmail.trim() || !newName.trim()) {
      showToast('Email dan nama wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      let userIdToUse = newUserId.trim() || null;

      // If no user_id provided, try to find existing admin_users by email to reuse user_id
      if (!userIdToUse) {
        const { data: existing } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('email', newEmail.trim())
          .maybeSingle();
        if (existing?.user_id) {
          userIdToUse = existing.user_id;
        }
      }

      const insertPayload: Record<string, unknown> = {
        email: newEmail.trim(),
        name: newName.trim(),
        user_id: userIdToUse,
        is_active: true,
      };

      // Set role text column if a role was selected
      if (newRoleId) {
        const role = roles.find((r) => r.id === newRoleId);
        if (role) insertPayload.role = role.name;
      }

      const { data: inserted, error } = await supabase
        .from('admin_users')
        .insert(insertPayload)
        .select('id')
        .single();
      if (error) throw error;

      // Upsert into admin_user_roles if a role was selected
      if (newRoleId && inserted?.id) {
        const { error: roleErr } = await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: inserted.id, role_id: newRoleId },
            { onConflict: 'admin_user_id,role_id' }
          );
        if (roleErr) {
          showToast('Admin dibuat, tapi gagal menugaskan role', 'warning');
        }
      }

      if (!userIdToUse) {
        showToast('Admin dibuat tanpa user_id. User harus mendaftar akun auth terlebih dahulu agar dapat login.', 'info');
      } else {
        showToast('Admin berhasil ditambahkan', 'success');
      }
      setShowAddModal(false);
      setNewEmail('');
      setNewName('');
      setNewUserId('');
      setNewRoleId('');
      fetchUsers();
      await refreshAdminProfile();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menambah admin';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!showRoleModal) return;
    if (!editRoleId) {
      showToast('Pilih role terlebih dahulu', 'warning');
      return;
    }
    setSaving(true);
    try {
      const role = roles.find((r) => r.id === editRoleId);
      if (!role) throw new Error('Role tidak ditemukan');

      // 1. Update admin_users.role text column
      const { error: updErr } = await supabase
        .from('admin_users')
        .update({ role: role.name })
        .eq('id', showRoleModal.id);
      if (updErr) throw updErr;

      // 2. Delete existing role links then insert the new one
      const { error: delErr } = await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', showRoleModal.id);
      if (delErr) throw delErr;

      const { error: roleErr } = await supabase
        .from('admin_user_roles')
        .upsert(
          { admin_user_id: showRoleModal.id, role_id: role.id },
          { onConflict: 'admin_user_id,role_id' }
        );
      if (roleErr) throw roleErr;

      showToast('Role admin berhasil diperbarui', 'success');
      setShowRoleModal(null);
      setEditRoleId('');
      fetchUsers();
      await refreshAdminProfile();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal memperbarui role';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) throw error;
      showToast(user.is_active ? 'Admin dinonaktifkan' : 'Admin diaktifkan', 'success');
      fetchUsers();
      await refreshAdminProfile();
    } catch {
      showToast('Gagal mengubah status admin', 'error');
    }
  };

  const handleRemove = async (user: AdminUser) => {
    if (!confirm(`Hapus admin "${user.name}"? Ini juga akan menghapus penugasan role.`)) return;
    try {
      // Delete role links first
      const { error: delRoleErr } = await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', user.id);
      if (delRoleErr) throw delRoleErr;

      const { error } = await supabase.from('admin_users').delete().eq('id', user.id);
      if (error) throw error;
      showToast('Admin berhasil dihapus', 'success');
      fetchUsers();
      await refreshAdminProfile();
    } catch {
      showToast('Gagal menghapus admin', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Admin</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola akun admin dan penugasan role
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Admin
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berdasarkan nama, email, atau role..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Belum ada admin</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/30">
                    <UserCog className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{u.name ?? '(tanpa nama)'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.role ?? 'tanpa role'}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    u.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  )}
                >
                  {u.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  {u.email}
                </p>
                <p className="text-xs">Bergabung: {new Date(u.created_at).toLocaleDateString('id-ID')}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {canUpdate && (
                  <>
                    <button
                      onClick={() => {
                        setShowRoleModal(u);
                        const match = roles.find((r) => r.name === u.role);
                        setEditRoleId(match?.id ?? '');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Ubah Role
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleRemove(u)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Admin</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  User ID (opsional)
                </label>
                <input
                  type="text"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="UUID user dari auth (kosongkan untuk lookup otomatis)"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Jika dikosongkan, sistem akan mencari user_id berdasarkan email.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Pilih role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Level {r.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ubah Role</h2>
                <p className="text-sm text-slate-500">{showRoleModal.name} · {showRoleModal.email}</p>
              </div>
              <button
                onClick={() => setShowRoleModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
              <select
                value={editRoleId}
                onChange={(e) => setEditRoleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">Pilih role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Level {r.level})
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowRoleModal(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

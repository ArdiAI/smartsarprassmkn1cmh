import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  UserCog, Search, Plus, Trash2, Shield, Loader2, X, Mail, CheckCircle2, XCircle, Edit3,
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
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [addRoleId, setAddRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [editRoleId, setEditRoleId] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const handleAdd = async () => {
    if (!addEmail.trim()) {
      showToast('Email wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      let userIdToUse: string | null = addUserId.trim() || null;

      // If no user_id provided, try to reuse an existing admin_users row by email
      if (!userIdToUse) {
        const { data: existing } = await supabase
          .from('admin_users')
          .select('id, user_id')
          .eq('email', addEmail.trim())
          .maybeSingle();
        if (existing) {
          const existingRow = existing as unknown as { id: string; user_id: string | null };
          if (existingRow.user_id) userIdToUse = existingRow.user_id;
          showToast('User ID ditemukan dari record admin yang sudah ada', 'info');
        }
      }

      const role = roles.find(r => r.id === addRoleId);
      const { data, error } = await supabase
        .from('admin_users')
        .insert({
          email: addEmail.trim(),
          name: addAddName(addName),
          user_id: userIdToUse,
          role: role?.name ?? null,
          is_active: true,
        })
        .select('id, user_id, email, name, role, is_active, created_at')
        .single();

      if (error) {
        showToast(`Gagal menambah admin: ${error.message}`, 'error');
        setSaving(false);
        return;
      }

      const newRow = data as unknown as AdminUser;

      // Upsert into admin_user_roles if a role was selected
      if (role && newRow.id) {
        await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: newRow.id, role_id: role.id },
            { onConflict: 'admin_user_id,role_id' }
          );
      }

      if (!userIdToUse) {
        showToast('Admin ditambahkan. User ID kosong — user harus login agar terhubung otomatis.', 'info');
      } else {
        showToast('Admin berhasil ditambahkan', 'success');
      }
      setUsers(prev => [newRow, ...prev]);
      setShowAddModal(false);
      setAddEmail('');
      setAddName('');
      setAddUserId('');
      setAddRoleId('');
      await refreshAdminProfile();
    } catch (err) {
      showToast('Terjadi kesalahan', 'error');
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
      const role = roles.find(r => r.id === editRoleId);
      if (!role) {
        showToast('Role tidak ditemukan', 'error');
        setSaving(false);
        return;
      }

      // 1. Update admin_users.role text column (backwards-compatible display)
      const { error: updErr } = await supabase
        .from('admin_users')
        .update({ role: role.name })
        .eq('id', showRoleModal.id);
      if (updErr) {
        showToast(`Gagal update role: ${updErr.message}`, 'error');
        setSaving(false);
        return;
      }

      // 2. Delete existing role assignments then upsert the new one
      await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', showRoleModal.id);
      const { error: roleErr } = await supabase
        .from('admin_user_roles')
        .upsert(
          { admin_user_id: showRoleModal.id, role_id: role.id },
          { onConflict: 'admin_user_id,role_id' }
        );
      if (roleErr) {
        showToast(`Gagal menyimpan assignment role: ${roleErr.message}`, 'error');
        setSaving(false);
        return;
      }

      setUsers(prev =>
        prev.map(u => (u.id === showRoleModal.id ? { ...u, role: role.name } : u))
      );
      showToast('Role berhasil diperbarui', 'success');
      setShowRoleModal(null);
      setEditRoleId('');
      await refreshAdminProfile();
    } catch (err) {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) {
        showToast('Gagal mengubah status', 'error');
        setActionLoading(null);
        return;
      }
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      );
      showToast(`User ${!user.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (user: AdminUser) => {
    if (!confirm(`Hapus admin "${user.name || user.email}"?`)) return;
    setActionLoading(user.id);
    try {
      // 1. Delete role assignments
      await supabase.from('admin_user_roles').delete().eq('admin_user_id', user.id);
      // 2. Delete admin_users row
      const { error } = await supabase.from('admin_users').delete().eq('id', user.id);
      if (error) {
        showToast('Gagal menghapus admin', 'error');
        setActionLoading(null);
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast('Admin berhasil dihapus', 'success');
      await refreshAdminProfile();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-blue-500" />
            Manajemen User
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola admin dan role pengguna sistem</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah Admin
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau role..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <UserCog className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Tidak ada admin ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(user => (
            <div
              key={user.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">
                    {(user.name || user.email || 'A').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {user.name || '(tanpa nama)'}
                  </p>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {user.email}
                  </p>
                  {user.user_id && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">UID: {user.user_id}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {user.role && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-medium">
                    <Shield className="w-3 h-3" /> {user.role}
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium',
                    user.is_active
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500'
                  )}
                >
                  {user.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {canUpdate && (
                  <>
                    <button
                      onClick={() => {
                        setShowRoleModal(user);
                        setEditRoleId(roles.find(r => r.name === user.role)?.id ?? '');
                      }}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      title="Ubah Role"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={actionLoading === user.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleRemove(user)}
                    disabled={actionLoading === user.id}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                    title="Hapus Admin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Admin</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="admin@school.id"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">User ID (UUID, opsional)</label>
                <input
                  type="text"
                  value={addUserId}
                  onChange={e => setAddUserId(e.target.value)}
                  placeholder="Kosongkan untuk lookup otomatis"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">Jika kosong, sistem akan mencari user_id berdasarkan email.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                <select
                  value={addRoleId}
                  onChange={e => setAddRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ubah Role</h2>
                <p className="text-xs text-slate-500">{showRoleModal.name || showRoleModal.email}</p>
              </div>
              <button onClick={() => setShowRoleModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {roles.map(r => (
                <button
                  key={r.id}
                  onClick={() => setEditRoleId(r.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all',
                    editRoleId === r.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" /> {r.name}
                  </span>
                  <span className="text-xs text-slate-400">Level {r.level}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowRoleModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to ensure name is never undefined when inserting
function addAddName(name: string): string {
  return name.trim() || '';
}

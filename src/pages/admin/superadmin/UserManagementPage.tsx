import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Trash2, Search, Shield, Mail, X, UserCog } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../utils/cn';

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

  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [addRoleId, setAddRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRoleId, setEditRoleId] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level, is_active')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
      return;
    }
    setRoles((data ?? []) as unknown as Role[]);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, user_id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      showToast('Gagal memuat daftar admin user', 'error');
      return;
    }
    setUsers((data ?? []) as unknown as AdminUser[]);
  }, []);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [loadUsers, loadRoles]);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  const resetAddForm = () => {
    setAddEmail('');
    setAddName('');
    setAddUserId('');
    setAddRoleId('');
  };

  const handleAdd = async () => {
    const email = addEmail.trim();
    const name = addName.trim();
    if (!email) {
      showToast('Email wajib diisi', 'warning');
      return;
    }
    if (!addRoleId) {
      showToast('Role wajib dipilih', 'warning');
      return;
    }
    setSaving(true);
    try {
      const userIdValue = addUserId.trim() || null;

      // If no user_id provided, try to reuse an existing admin_users row by email.
      let finalUserId = userIdValue;
      if (!finalUserId) {
        const { data: existing } = await supabase
          .from('admin_users')
          .select('id, user_id')
          .eq('email', email)
          .maybeSingle();
        const existingRow = existing as unknown as { id: string; user_id: string | null } | null;
        if (existingRow) {
          // Reuse existing row: just update role/active.
          const role = roles.find((r) => r.id === addRoleId);
          const { error: updErr } = await supabase
            .from('admin_users')
            .update({ name: name || existingRow.id, role: role?.name ?? '', is_active: true })
            .eq('id', existingRow.id);
          if (updErr) throw updErr;
          const { error: linkErr } = await supabase
            .from('admin_user_roles')
            .upsert(
              { admin_user_id: existingRow.id, role_id: addRoleId },
              { onConflict: 'admin_user_id,role_id' }
            );
          if (linkErr) throw linkErr;
          showToast('Admin user diperbarui dari data yang sudah ada', 'success');
          await loadUsers();
          await refreshAdminProfile();
          setShowAdd(false);
          resetAddForm();
          setSaving(false);
          return;
        }
        showToast('User ID tidak diberikan; admin dibuat dengan user_id null', 'info');
      }

      const role = roles.find((r) => r.id === addRoleId);
      const insertPayload: Record<string, unknown> = {
        email,
        name: name || email,
        role: role?.name ?? '',
        is_active: true,
      };
      if (finalUserId) insertPayload.user_id = finalUserId;

      const { data: inserted, error: insErr } = await supabase
        .from('admin_users')
        .insert(insertPayload)
        .select('id')
        .single();
      if (insErr) throw insErr;
      const newRow = inserted as unknown as { id: string };

      const { error: linkErr } = await supabase
        .from('admin_user_roles')
        .upsert(
          { admin_user_id: newRow.id, role_id: addRoleId },
          { onConflict: 'admin_user_id,role_id' }
        );
      if (linkErr) throw linkErr;

      showToast('Admin user berhasil ditambahkan', 'success');
      await loadUsers();
      await refreshAdminProfile();
      setShowAdd(false);
      resetAddForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan admin user';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditRole = (user: AdminUser) => {
    const match = roles.find((r) => r.name === user.role);
    setEditingUser(user);
    setEditRoleId(match?.id ?? '');
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    if (!editRoleId) {
      showToast('Role wajib dipilih', 'warning');
      return;
    }
    setEditSaving(true);
    try {
      const role = roles.find((r) => r.id === editRoleId);
      if (!role) throw new Error('Role tidak valid');

      // 1. Update the denormalized role text column for backwards-compatible display.
      const { error: updErr } = await supabase
        .from('admin_users')
        .update({ role: role.name })
        .eq('id', editingUser.id);
      if (updErr) throw updErr;

      // 2. Remove previous role links for this admin and insert the new one so
      //    fetchUserPermissions() picks it up on the next login.
      const { error: delErr } = await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', editingUser.id);
      if (delErr) throw delErr;

      const { error: linkErr } = await supabase
        .from('admin_user_roles')
        .upsert(
          { admin_user_id: editingUser.id, role_id: role.id },
          { onConflict: 'admin_user_id,role_id' }
        );
      if (linkErr) throw linkErr;

      showToast('Role admin berhasil diperbarui', 'success');
      await loadUsers();
      await refreshAdminProfile();
      setEditingUser(null);
      setEditRoleId('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui role';
      showToast(msg, 'error');
    } finally {
      setEditSaving(false);
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
      await loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status';
      showToast(msg, 'error');
    }
  };

  const handleRemove = async (user: AdminUser) => {
    if (!confirm(`Hapus admin "${user.email}"? Tautan role juga akan dihapus.`)) return;
    try {
      // Remove role links first, then the admin row.
      const { error: delLinkErr } = await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', user.id);
      if (delLinkErr) throw delLinkErr;

      const { error: delErr } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', user.id);
      if (delErr) throw delErr;

      showToast('Admin user berhasil dihapus', 'success');
      await loadUsers();
      await refreshAdminProfile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus admin user';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen User Admin</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola akun admin, role, dan status aktif.
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <UserPlus className="h-4 w-4" />
            Tambah Admin
          </button>
        )}
      </div>

      <div className="card">
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, atau role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Tidak ada admin user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="pb-3 pr-4 font-semibold">Nama</th>
                  <th className="pb-3 pr-4 font-semibold">Email</th>
                  <th className="pb-3 pr-4 font-semibold">Role</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 pr-4 font-semibold">Dibuat</th>
                  <th className="pb-3 pr-4 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {u.name ?? '-'}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{u.email ?? '-'}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                        <Shield className="h-3 w-3" />
                        {u.role ?? '-'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => canUpdate && handleToggleActive(u)}
                        disabled={!canUpdate}
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                          canUpdate && 'cursor-pointer',
                        )}
                      >
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate && (
                          <button
                            onClick={() => openEditRole(u)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                            aria-label="Ubah role"
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleRemove(u)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            aria-label="Hapus admin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Admin</h3>
              <button
                onClick={() => {
                  setShowAdd(false);
                  resetAddForm();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="input"
                  placeholder="admin@sekolah.id"
                />
              </div>
              <div>
                <label className="label">Nama</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="input"
                  placeholder="Nama admin"
                />
              </div>
              <div>
                <label className="label">User ID (opsional)</label>
                <input
                  type="text"
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  className="input"
                  placeholder="UUID dari auth.users (kosongkan untuk auto-deteksi)"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Jika dikosongkan, sistem akan mencari admin_users dengan email yang sama.
                </p>
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={addRoleId}
                  onChange={(e) => setAddRoleId(e.target.value)}
                  className="input"
                >
                  <option value="">Pilih role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (level {r.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAdd(false);
                  resetAddForm();
                }}
                className="btn-secondary"
              >
                Batal
              </button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ubah Role</h3>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setEditRoleId('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <Mail className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {editingUser.name ?? '-'}
                  </p>
                  <p className="text-xs text-slate-500">{editingUser.email ?? '-'}</p>
                </div>
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  className="input"
                >
                  <option value="">Pilih role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (level {r.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setEditRoleId('');
                }}
                className="btn-secondary"
              >
                Batal
              </button>
              <button onClick={handleSaveRole} disabled={editSaving} className="btn-primary">
                {editSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

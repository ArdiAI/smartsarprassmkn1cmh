import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Trash2, Search, ShieldCheck, Mail, KeyRound } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

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

interface AdminUserRoleRow {
  admin_user_id: string;
  role_id: string;
}

export default function UserManagementPage() {
  const { hasPermission, refreshAdminProfile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleLinks, setRoleLinks] = useState<AdminUserRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [addRoleId, setAddRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRoleId, setEditRoleId] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, linksRes] = await Promise.all([
        supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name, level, is_active').eq('is_active', true).order('level', { ascending: false }),
        supabase.from('admin_user_roles').select('admin_user_id, role_id'),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (linksRes.error) throw linksRes.error;
      setUsers((usersRes.data ?? []) as unknown as AdminUser[]);
      setRoles((rolesRes.data ?? []) as unknown as Role[]);
      setRoleLinks((linksRes.data ?? []) as unknown as AdminUserRoleRow[]);
    } catch (err) {
      showToast('Gagal memuat data user: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const roleIdForUser = (adminId: string): string | null => {
    const link = roleLinks.find((l) => l.admin_user_id === adminId);
    return link ? link.role_id : null;
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  const handleAdd = async () => {
    const email = addEmail.trim();
    if (!email) {
      showToast('Email wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      let userIdToUse: string | null = addUserId.trim() || null;

      if (!userIdToUse) {
        const { data: existing } = await supabase
          .from('admin_users')
          .select('id, user_id')
          .eq('email', email)
          .maybeSingle();
        const existingRow = existing as unknown as { id: string; user_id: string | null } | null;
        if (existingRow && existingRow.user_id) {
          userIdToUse = existingRow.user_id;
        }
      }

      const insertPayload: { email: string; name: string; role: string; user_id: string | null; is_active: boolean } = {
        email,
        name: addName.trim() || email.split('@')[0],
        role: roles.find((r) => r.id === addRoleId)?.name ?? '',
        user_id: userIdToUse,
        is_active: true,
      };

      const { data: inserted, error: insErr } = await supabase
        .from('admin_users')
        .insert(insertPayload)
        .select('id')
        .single();
      if (insErr) throw insErr;
      const newAdmin = inserted as unknown as { id: string };

      if (addRoleId) {
        const { error: linkErr } = await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: newAdmin.id, role_id: addRoleId },
            { onConflict: 'admin_user_id,role_id' },
          );
        if (linkErr) throw linkErr;
      }

      if (!userIdToUse) {
        showToast('Admin ditambahkan. user_id kosong — minta user login sekali lalu hubungkan akun.', 'info');
      } else {
        showToast('Admin berhasil ditambahkan', 'success');
      }

      setShowAdd(false);
      setAddEmail('');
      setAddName('');
      setAddUserId('');
      setAddRoleId('');
      await loadData();
      await refreshAdminProfile();
    } catch (err) {
      showToast('Gagal menambah admin: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    const currentRoleId = roleIdForUser(u.id);
    setEditRoleId(currentRoleId ?? '');
  };

  const handleSaveRole = async () => {
    if (!editUser) return;
    setEditSaving(true);
    try {
      const roleName = roles.find((r) => r.id === editRoleId)?.name ?? '';

      // 1. Update admin_users.role text column (backwards-compatible display)
      const { error: updErr } = await supabase
        .from('admin_users')
        .update({ role: roleName })
        .eq('id', editUser.id);
      if (updErr) throw updErr;

      // 2. Remove existing role links, then upsert new one
      const { error: delErr } = await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', editUser.id);
      if (delErr) throw delErr;

      if (editRoleId) {
        const { error: linkErr } = await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: editUser.id, role_id: editRoleId },
            { onConflict: 'admin_user_id,role_id' },
          );
        if (linkErr) throw linkErr;
      }

      showToast('Role admin berhasil diperbarui', 'success');
      setEditUser(null);
      setEditRoleId('');
      await loadData();
      await refreshAdminProfile();
    } catch (err) {
      showToast('Gagal memperbarui role: ' + (err as Error).message, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleActive = async (u: AdminUser) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !u.is_active })
        .eq('id', u.id);
      if (error) throw error;
      showToast(`Admin ${!u.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      await loadData();
    } catch (err) {
      showToast('Gagal mengubah status: ' + (err as Error).message, 'error');
    }
  };

  const handleRemove = async (u: AdminUser) => {
    if (!confirm(`Hapus admin "${u.name ?? u.email}"? Ini juga menghapus assignment role.`)) return;
    try {
      // 1. Delete role links first
      const { error: linkErr } = await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', u.id);
      if (linkErr) throw linkErr;

      // 2. Delete admin_users row
      const { error } = await supabase.from('admin_users').delete().eq('id', u.id);
      if (error) throw error;

      showToast('Admin berhasil dihapus', 'success');
      await loadData();
      await refreshAdminProfile();
    } catch (err) {
      showToast('Gagal menghapus admin: ' + (err as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen User Admin</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola admin, role, dan status akun</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <UserPlus className="h-4 w-4" />
            Tambah Admin
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau role..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Tidak ada admin ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Admin</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Dibuat</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((u) => {
                  const roleId = roleIdForUser(u.id);
                  const roleName = roleId ? roles.find((r) => r.id === roleId)?.name ?? u.role : u.role;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                            {(u.name ?? u.email ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{u.name ?? '-'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{u.email ?? '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {roleName ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                            <ShieldCheck className="h-3 w-3" />
                            {roleName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Belum ada role</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => canUpdate && handleToggleActive(u)}
                          disabled={!canUpdate}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                            canUpdate && 'cursor-pointer hover:opacity-80',
                            !canUpdate && 'cursor-not-allowed opacity-70',
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', u.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate && (
                            <button
                              onClick={() => openEdit(u)}
                              className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleRemove(u)}
                              className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          {!canUpdate && !canDelete && (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Tambah Admin Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama</label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Nama lengkap (opsional)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">User ID (UUID) opsional</label>
                <input
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  placeholder="Kosongkan untuk lookup otomatis"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-slate-400">Jika kosong, sistem akan mencari user_id berdasarkan email.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select
                  value={addRoleId}
                  onChange={(e) => setAddRoleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Pilih role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} (Lv. {r.level})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowAdd(false); setAddEmail(''); setAddName(''); setAddUserId(''); setAddRoleId(''); }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Ubah Role Admin</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{editUser.name ?? editUser.email}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
              <select
                value={editRoleId}
                onChange={(e) => setEditRoleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Tanpa role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} (Lv. {r.level})</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-400">
                Perubahan role akan langsung aktif saat user login kembali.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setEditUser(null); setEditRoleId(''); }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRole}
                disabled={editSaving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {editSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Search, UserPlus, Trash2, ShieldCheck, X } from 'lucide-react';
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

  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name, level, is_active').eq('is_active', true).order('level', { ascending: false }),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;
      setUsers((usersRes.data ?? []) as unknown as AdminUser[]);
      setRoles((rolesRes.data ?? []) as unknown as Role[]);
    } catch (e) {
      showToast('Gagal memuat data user', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  const resetAdd = () => {
    setAddEmail('');
    setAddName('');
    setAddUserId('');
    setAddRoleId('');
    setShowAdd(false);
  };

  const handleAdd = async () => {
    if (!addEmail.trim() || !addName.trim()) {
      showToast('Email dan nama wajib diisi', 'warning');
      return;
    }
    if (!addRoleId) {
      showToast('Pilih role terlebih dahulu', 'warning');
      return;
    }
    setSaving(true);
    try {
      // If user_id blank, try to reuse existing admin_users row by email
      let userId: string | null = addUserId.trim() ? addUserId.trim() : null;

      if (!userId) {
        const { data: existing } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('email', addEmail.trim())
          .maybeSingle();
        if (existing && existing.user_id) {
          userId = existing.user_id as string;
        }
      }

      const role = roles.find((r) => r.id === addRoleId);
      const roleName = role ? role.name : '';

      const { data: inserted, error } = await supabase
        .from('admin_users')
        .insert({
          email: addEmail.trim(),
          name: addName.trim(),
          user_id: userId,
          role: roleName,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const adminRow = inserted as unknown as AdminUser;

      // Upsert into admin_user_roles so RBAC picks it up
      if (adminRow?.id) {
        const { error: linkErr } = await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: adminRow.id, role_id: addRoleId },
            { onConflict: 'admin_user_id,role_id' },
          );
        if (linkErr) throw linkErr;
      }

      if (!userId) {
        showToast('Admin ditambahkan. user_id kosong — user akan dapat role setelah mendaftar akun.', 'info');
      } else {
        showToast('Admin berhasil ditambahkan', 'success');
      }
      resetAdd();
      await loadData();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Gagal menambah admin: ' + (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    if (!newRoleId) return;
    const role = roles.find((r) => r.id === newRoleId);
    if (!role) return;
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role: role.name })
        .eq('id', userId);
      if (error) throw error;

      const { error: linkErr } = await supabase
        .from('admin_user_roles')
        .upsert(
          { admin_user_id: userId, role_id: role.id },
          { onConflict: 'admin_user_id,role_id' },
        );
      if (linkErr) throw linkErr;

      showToast('Role berhasil diperbarui', 'success');
      await loadData();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Gagal mengubah role: ' + (e as Error).message, 'error');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) throw error;
      showToast(user.is_active ? 'User dinonaktifkan' : 'User diaktifkan', 'success');
      await loadData();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Gagal mengubah status: ' + (e as Error).message, 'error');
    }
  };

  const handleRemove = async (user: AdminUser) => {
    if (!confirm(`Hapus admin "${user.name}"?`)) return;
    try {
      // Remove role links first
      const { error: delLinkErr } = await supabase
        .from('admin_user_roles')
        .delete()
        .eq('admin_user_id', user.id);
      if (delLinkErr) throw delLinkErr;

      const { error } = await supabase.from('admin_users').delete().eq('id', user.id);
      if (error) throw error;
      showToast('Admin dihapus', 'success');
      await loadData();
      await refreshAdminProfile();
    } catch (e) {
      showToast('Gagal menghapus: ' + (e as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen User</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola admin & role pengguna sistem</p>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau role…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Tidak ada user.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      {u.name ?? ''}
                      {u.user_id ? null : (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          no UID
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email ?? ''}</td>
                    <td className="px-4 py-3">
                      {canUpdate ? (
                        <select
                          value={roles.find((r) => r.name === u.role)?.id ?? ''}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="">{u.role ?? '— pilih —'}</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} (L{r.level})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
                          {u.role ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canUpdate ? (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-semibold transition',
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                          )}
                        >
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      ) : (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-semibold',
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                          )}
                        >
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canDelete && (
                        <button
                          onClick={() => handleRemove(u)}
                          className="inline-flex items-center gap-1 rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Admin</h2>
              <button onClick={resetAdd} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Nama *</label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Email *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  User ID (UUID, opsional)
                </label>
                <input
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  placeholder="Kosongkan untuk cari otomatis"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Jika kosong, sistem akan mencari admin_users dengan email yang sama untuk menggunakan user_id-nya.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Role *</label>
                <select
                  value={addRoleId}
                  onChange={(e) => setAddRoleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">— pilih role —</option>
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
                onClick={resetAdd}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

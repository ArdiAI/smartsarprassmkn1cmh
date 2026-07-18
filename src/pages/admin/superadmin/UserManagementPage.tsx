import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  UserPlus, Trash2, Loader2, Users, Search, Shield, Mail,
  ToggleLeft, ToggleRight, X, Check,
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

interface AdminUserRoleRow {
  admin_user_id: string;
  role_id: string;
}

export default function UserManagementPage() {
  const { hasPermission, refreshAdminProfile } = useAuth();
  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [addRoleId, setAddRoleId] = useState('');

  const fetchAdmins = useCallback(async () => {
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
    const list = (data as unknown as AdminUser[]) || [];
    setAdmins(list);

    const { data: links } = await supabase
      .from('admin_user_roles')
      .select('admin_user_id, role_id');
    const map: Record<string, string> = {};
    for (const l of (links as unknown as AdminUserRoleRow[]) || []) {
      map[l.admin_user_id] = l.role_id;
    }
    setRoleAssignments(map);
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
    fetchAdmins();
    fetchRoles();
  }, [fetchAdmins, fetchRoles]);

  const filtered = admins.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.email?.toLowerCase().includes(q) ||
      a.name?.toLowerCase().includes(q) ||
      a.role?.toLowerCase().includes(q)
    );
  });

  const handleAdd = async () => {
    if (!addEmail.trim()) {
      showToast('Email wajib diisi', 'warning');
      return;
    }
    setActionLoading('add');
    try {
      let userIdToInsert: string | null = addUserId.trim() || null;

      // If no user_id provided, try to reuse an existing admin_users row by email.
      if (!userIdToInsert) {
        const { data: existing } = await supabase
          .from('admin_users')
          .select('id, user_id, email')
          .eq('email', addEmail.trim())
          .maybeSingle();
        if (existing) {
          showToast('Admin dengan email tersebut sudah terdaftar', 'info');
          setActionLoading(null);
          setShowAddModal(false);
          setAddEmail('');
          setAddName('');
          setAddUserId('');
          setAddRoleId('');
          await fetchAdmins();
          return;
        }
      }

      const { data: inserted, error } = await supabase
        .from('admin_users')
        .insert({
          email: addEmail.trim(),
          name: addName.trim() || addEmail.trim().split('@')[0],
          user_id: userIdToInsert,
          role: addRoleId ? (roles.find(r => r.id === addRoleId)?.name ?? null) : null,
          is_active: true,
        })
        .select('id, user_id, email, name, role, is_active, created_at')
        .single();

      if (error) {
        showToast('Gagal menambah admin: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }

      const newAdmin = inserted as unknown as AdminUser;

      // Upsert role into admin_user_roles if a role was selected.
      if (addRoleId && newAdmin) {
        const { error: linkError } = await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: newAdmin.id, role_id: addRoleId },
            { onConflict: 'admin_user_id,role_id' }
          );
        if (linkError) {
          showToast('Admin dibuat, tapi gagal menugaskan role: ' + linkError.message, 'warning');
        }
      }

      if (!userIdToInsert) {
        showToast('Admin ditambahkan. User ID belum terhubung — akan terisi otomatis saat user login pertama kali.', 'info');
      } else {
        showToast('Admin berhasil ditambahkan', 'success');
      }

      setShowAddModal(false);
      setAddEmail('');
      setAddName('');
      setAddUserId('');
      setAddRoleId('');
      await fetchAdmins();
      await refreshAdminProfile();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (adminId: string, newRoleId: string) => {
    setActionLoading(`role-${adminId}`);
    try {
      const role = roles.find(r => r.id === newRoleId);
      const roleName = role?.name ?? null;

      // 1. Update the legacy role text column for backwards-compatible display.
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ role: roleName })
        .eq('id', adminId);
      if (updateError) {
        showToast('Gagal memperbarui role: ' + updateError.message, 'error');
        setActionLoading(null);
        return;
      }

      // 2. Delete any existing role assignments for this admin, then insert the new one.
      await supabase.from('admin_user_roles').delete().eq('admin_user_id', adminId);
      if (newRoleId) {
        const { error: linkError } = await supabase
          .from('admin_user_roles')
          .upsert(
            { admin_user_id: adminId, role_id: newRoleId },
            { onConflict: 'admin_user_id,role_id' }
          );
        if (linkError) {
          showToast('Role diperbarui, tapi gagal menulis admin_user_roles: ' + linkError.message, 'warning');
        }
      }

      showToast('Role admin berhasil diperbarui', 'success');
      await fetchAdmins();
      await refreshAdminProfile();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (admin: AdminUser) => {
    setActionLoading(`toggle-${admin.id}`);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !admin.is_active })
        .eq('id', admin.id);
      if (error) {
        showToast('Gagal mengubah status: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast(`Admin ${!admin.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      await fetchAdmins();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (admin: AdminUser) => {
    if (!confirm(`Hapus admin "${admin.name ?? admin.email}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setActionLoading(`remove-${admin.id}`);
    try {
      // 1. Delete role assignments first.
      await supabase.from('admin_user_roles').delete().eq('admin_user_id', admin.id);
      // 2. Then delete the admin_users row.
      const { error } = await supabase.from('admin_users').delete().eq('id', admin.id);
      if (error) {
        showToast('Gagal menghapus admin: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast('Admin berhasil dihapus', 'success');
      await fetchAdmins();
      await refreshAdminProfile();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" /> Manajemen Admin
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola akun admin, role, dan status aktif
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Tambah Admin
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari nama, email, atau role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-11"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada admin</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(admin => {
            const currentRoleId = roleAssignments[admin.id] || '';
            return (
              <div key={admin.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{admin.name ?? 'Tanpa Nama'}</h3>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            admin.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                          )}
                        >
                          {admin.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <Mail className="w-3.5 h-3.5" /> {admin.email ?? '-'}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Dibuat {new Date(admin.created_at).toLocaleDateString('id-ID')}
                        {admin.user_id ? ' · user_id terhubung' : ' · user_id belum terhubung'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {canUpdate && (
                      <>
                        <select
                          value={currentRoleId}
                          onChange={e => handleRoleChange(admin.id, e.target.value)}
                          disabled={actionLoading === `role-${admin.id}`}
                          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                        >
                          <option value="">— Pilih Role —</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} (Lvl {r.level})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleToggleActive(admin)}
                          disabled={actionLoading === `toggle-${admin.id}`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                          title={admin.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {actionLoading === `toggle-${admin.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : admin.is_active ? (
                            <ToggleRight className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                          {admin.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleRemove(admin)}
                        disabled={actionLoading === `remove-${admin.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `remove-${admin.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Admin Baru</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="label">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder="admin@sekolah.sch.id"
                className="input"
              />
            </div>
            <div>
              <label className="label">Nama</label>
              <input
                type="text"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="Nama lengkap admin"
                className="input"
              />
            </div>
            <div>
              <label className="label">User ID (UUID, opsional)</label>
              <input
                type="text"
                value={addUserId}
                onChange={e => setAddUserId(e.target.value)}
                placeholder="Kosongkan jika belum terdaftar di auth.users"
                className="input"
              />
              <p className="text-xs text-slate-400 mt-1">
                Jika dikosongkan, sistem akan mencoba mencari admin berdasarkan email.
              </p>
            </div>
            <div>
              <label className="label">Role</label>
              <select
                value={addRoleId}
                onChange={e => setAddRoleId(e.target.value)}
                className="input"
              >
                <option value="">— Pilih Role —</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Lvl {r.level})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={actionLoading === 'add'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

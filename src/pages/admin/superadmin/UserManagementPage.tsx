import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import {
  UserCog, Plus, Trash2, Loader2, Search, Shield, X, Mail, Save, Power,
} from 'lucide-react';

interface AdminUserRow {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface RoleRow {
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
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', name: '', role_id: '' });

  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: adminsData }, { data: rolesData }, { data: aurData }] = await Promise.all([
      supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
      supabase.from('roles').select('id, name, level, is_active').eq('is_active', true).order('level', { ascending: false }),
      supabase.from('admin_user_roles').select('admin_user_id, role_id'),
    ]);

    const admins = (adminsData as unknown as AdminUserRow[]) || [];
    const activeRoles = (rolesData as unknown as RoleRow[]) || [];
    const aurRows = (aurData as unknown as AdminUserRoleRow[]) || [];

    // Build a map admin_user_id → role_id (first role found)
    const roleMap: Record<string, string> = {};
    for (const row of aurRows) {
      if (!roleMap[row.admin_user_id]) roleMap[row.admin_user_id] = row.role_id;
    }

    setAdminUsers(admins);
    setRoles(activeRoles);
    setUserRoles(roleMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRoleName = (adminId: string): string => {
    const roleId = userRoles[adminId];
    if (roleId) {
      const role = roles.find(r => r.id === roleId);
      if (role) return role.name;
    }
    const admin = adminUsers.find(a => a.id === adminId);
    return admin?.role || '—';
  };

  const getRoleLevel = (adminId: string): number => {
    const roleId = userRoles[adminId];
    if (roleId) {
      const role = roles.find(r => r.id === roleId);
      if (role) return role.level;
    }
    return 0;
  };

  const filteredUsers = adminUsers.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      getRoleName(u.id).toLowerCase().includes(q)
    );
  });

  const handleRoleChange = async (adminId: string, newRoleId: string) => {
    if (!canUpdate) return;
    setSaving(true);
    try {
      const role = roles.find(r => r.id === newRoleId);
      if (!role) return;

      // 1. Delete existing admin_user_roles for this user
      await supabase.from('admin_user_roles').delete().eq('admin_user_id', adminId);

      // 2. Insert new role assignment into admin_user_roles
      const { error: aurError } = await supabase
        .from('admin_user_roles')
        .insert({ admin_user_id: adminId, role_id: newRoleId });
      if (aurError) throw aurError;

      // 3. Update the legacy admin_users.role text column for display
      const { error: auError } = await supabase
        .from('admin_users')
        .update({ role: role.name })
        .eq('id', adminId);
      if (auError) throw auError;

      // 4. Update local state
      setUserRoles(prev => ({ ...prev, [adminId]: newRoleId }));
      setAdminUsers(prev => prev.map(u => u.id === adminId ? { ...u, role: role.name } : u));

      showToast(`Role berhasil diubah menjadi "${role.name}"`, 'success');
      await refreshAdminProfile();
    } catch (e: any) {
      showToast(`Gagal mengubah role: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (admin: AdminUserRow) => {
    if (!canUpdate) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !admin.is_active })
        .eq('id', admin.id);
      if (error) throw error;
      setAdminUsers(prev => prev.map(u => u.id === admin.id ? { ...u, is_active: !u.is_active } : u));
      showToast(`User ${admin.is_active ? 'dinonaktifkan' : 'diaktifkan'}`, 'success');
    } catch (e: any) {
      showToast(`Gagal: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (admin: AdminUserRow) => {
    if (!canDelete) return;
    if (!confirm(`Hapus admin "${admin.email}"? Role assignment juga akan dihapus.`)) return;
    setSaving(true);
    try {
      // 1. Delete from admin_user_roles first
      await supabase.from('admin_user_roles').delete().eq('admin_user_id', admin.id);
      // 2. Delete the admin_users row
      const { error } = await supabase.from('admin_users').delete().eq('id', admin.id);
      if (error) throw error;
      setAdminUsers(prev => prev.filter(u => u.id !== admin.id));
      showToast('Admin berhasil dihapus', 'success');
    } catch (e: any) {
      showToast(`Gagal menghapus: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!canCreate) return;
    if (!addForm.email.trim()) {
      showToast('Email wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      // Check if admin_users row already exists for this email
      const { data: existing } = await supabase
        .from('admin_users')
        .select('id, user_id, email')
        .eq('email', addForm.email.trim())
        .maybeSingle();

      let adminId: string;
      let userId: string | null = null;

      if (existing) {
        // Reuse existing admin_users row
        const existingRow = existing as unknown as AdminUserRow;
        adminId = existingRow.id;
        userId = existingRow.user_id;
        showToast('Admin sudah ada, memperbarui role...', 'info');
      } else {
        // Try to find the auth user by email to link user_id
        const { data: authUser } = await supabase.auth.admin.listUsers();
        const found = (authUser?.users || []).find(u => u.email === addForm.email.trim());
        if (found) userId = found.id;

        // Insert new admin_users row
        const { data: newAdmin, error: insertError } = await supabase
          .from('admin_users')
          .insert({
            email: addForm.email.trim(),
            name: addForm.name.trim() || addForm.email.split('@')[0],
            role: roles.find(r => r.id === addForm.role_id)?.name || 'Viewer',
            user_id: userId,
            is_active: true,
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        adminId = (newAdmin as any).id;

        if (!userId) {
          showToast('User belum terdaftar di Supabase Auth. user_id akan terisi otomatis saat user login pertama kali.', 'info');
        }
      }

      // Assign role via admin_user_roles
      if (addForm.role_id) {
        // Delete existing role assignment first
        await supabase.from('admin_user_roles').delete().eq('admin_user_id', adminId);
        // Insert new role
        const { error: aurError } = await supabase
          .from('admin_user_roles')
          .insert({ admin_user_id: adminId, role_id: addForm.role_id });
        if (aurError) throw aurError;

        // Update legacy role column
        const roleName = roles.find(r => r.id === addForm.role_id)?.name || 'Viewer';
        await supabase.from('admin_users').update({ role: roleName }).eq('id', adminId);
      }

      showToast('Admin berhasil ditambahkan dengan role', 'success');
      setShowAddModal(false);
      setAddForm({ email: '', name: '', role_id: '' });
      await fetchData();
    } catch (e: any) {
      showToast(`Gagal menambah admin: ${e.message}`, 'error');
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen User</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola admin dan role — permission otomatis mengikuti role saat user login berikutnya
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Admin
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama, email, atau role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">User</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredUsers.map(admin => (
                <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {(admin.name || admin.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{admin.name || '—'}</p>
                        <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canUpdate ? (
                      <select
                        value={userRoles[admin.id] || ''}
                        onChange={e => handleRoleChange(admin.id, e.target.value)}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">— Pilih Role —</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (Lv.{r.level})</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <Shield className="w-3 h-3" />
                        {getRoleName(admin.id)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      admin.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${admin.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {admin.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {canUpdate && (
                        <button
                          onClick={() => handleToggleActive(admin)}
                          disabled={saving}
                          title={admin.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleRemoveUser(admin)}
                          disabled={saving}
                          title="Hapus"
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserCog className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">Tidak ada admin ditemukan</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Admin</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Email Admin</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  User harus sudah terdaftar di Supabase Auth dengan email ini.
                </p>
              </div>
              <div>
                <label className="label">Nama (opsional)</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Nama lengkap"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  value={addForm.role_id}
                  onChange={e => setAddForm({ ...addForm, role_id: e.target.value })}
                  className="input"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (Lv.{r.level})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Permission otomatis mengikuti role yang dipilih.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">Batal</button>
              <button
                onClick={handleAddAdmin}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

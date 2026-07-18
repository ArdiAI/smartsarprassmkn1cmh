import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Users, Plus, Trash2, X, Loader2, Search, Shield, Mail, UserCircle,
  CheckCircle2, XCircle, Pencil,
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
  is_active: boolean | null;
  is_system: boolean | null;
}

export default function UserManagementPage() {
  const { hasPermission, refreshAdminProfile } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', name: '', user_id: '' });
  const [adding, setAdding] = useState(false);

  const [roleEditing, setRoleEditing] = useState<AdminUser | null>(null);
  const [roleForm, setRoleForm] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, user_id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data admin', 'error');
    } else {
      setAdmins((data as unknown as AdminUser[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level, is_active, is_system')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchRoles();
  }, [fetchAdmins, fetchRoles]);

  const handleAdd = async () => {
    if (!addForm.email.trim()) {
      showToast('Email wajib diisi', 'error');
      return;
    }
    setAdding(true);

    let userIdToUse: string | null = addForm.user_id.trim() || null;

    // If no user_id provided, try to reuse an existing admin_users row by email.
    if (!userIdToUse) {
      const { data: existing, error: lookupErr } = await supabase
        .from('admin_users')
        .select('id, user_id, email')
        .eq('email', addForm.email.trim())
        .maybeSingle();
      if (lookupErr) {
        showToast('Gagal memeriksa admin yang ada', 'error');
        setAdding(false);
        return;
      }
      if (existing) {
        const existingAdmin = existing as unknown as AdminUser;
        if (existingAdmin.user_id) {
          userIdToUse = existingAdmin.user_id;
        }
        // If an admin_users row already exists for this email, just inform the user.
        showToast('Admin dengan email tersebut sudah ada. Tidak ada perubahan dibuat.', 'info');
        setAdding(false);
        setAddOpen(false);
        setAddForm({ email: '', name: '', user_id: '' });
        await fetchAdmins();
        return;
      }
    }

    const payload = {
      user_id: userIdToUse,
      email: addForm.email.trim(),
      name: addForm.name.trim() || null,
      role: 'staff',
      is_active: true,
    };

    const { error } = await supabase.from('admin_users').insert(payload);
    if (error) {
      showToast('Gagal menambah admin: ' + error.message, 'error');
    } else {
      if (!userIdToUse) {
        showToast('Admin ditambahkan tanpa user_id (user_id null). Hubungkan akun auth nanti.', 'info');
      } else {
        showToast('Admin ditambahkan', 'success');
      }
      setAddOpen(false);
      setAddForm({ email: '', name: '', user_id: '' });
      await fetchAdmins();
    }
    setAdding(false);
  };

  const openRoleEdit = (a: AdminUser) => {
    setRoleEditing(a);
    setRoleForm(a.role ?? '');
  };

  const handleRoleSave = async () => {
    if (!roleEditing) return;
    if (!roleForm) {
      showToast('Pilih role terlebih dahulu', 'error');
      return;
    }
    setSavingRole(true);
    const selectedRole = roles.find(r => r.id === roleForm || r.name === roleForm);
    const roleName = selectedRole?.name ?? roleForm;

    // 1. Update admin_users.role text column (backwards-compatible display).
    const { error: updateErr } = await supabase
      .from('admin_users')
      .update({ role: roleName })
      .eq('id', roleEditing.id);

    if (updateErr) {
      showToast('Gagal memperbarui role: ' + updateErr.message, 'error');
      setSavingRole(false);
      return;
    }

    // 2. Upsert into admin_user_roles so fetchUserPermissions() picks up the role.
    if (selectedRole) {
      const { error: upsertErr } = await supabase
        .from('admin_user_roles')
        .upsert(
          { admin_user_id: roleEditing.id, role_id: selectedRole.id },
          { onConflict: 'admin_user_id,role_id' }
        );
      if (upsertErr) {
        showToast('Role diperbarui di admin_users, tapi gagal menulis admin_user_roles: ' + upsertErr.message, 'warning');
      }
    } else {
      showToast('Role diperbarui di kolom teks, tetapi role_id tidak ditemukan di tabel roles.', 'warning');
    }

    showToast('Role admin diperbarui', 'success');
    setRoleEditing(null);
    setRoleForm('');
    setSavingRole(false);
    await fetchAdmins();
    // 3. Refresh current admin's own permissions in case they changed their own role.
    await refreshAdminProfile();
  };

  const handleToggleActive = async (a: AdminUser) => {
    const next = !(a.is_active ?? false);
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: next })
      .eq('id', a.id);
    if (error) {
      showToast('Gagal mengubah status aktif', 'error');
    } else {
      showToast(next ? 'Admin diaktifkan' : 'Admin dinonaktifkan', 'success');
      await fetchAdmins();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    // 1. Delete from admin_user_roles first.
    await supabase.from('admin_user_roles').delete().eq('admin_user_id', deleteTarget.id);

    // 2. Then delete the admin_users row.
    const { error } = await supabase.from('admin_users').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('Gagal menghapus admin: ' + error.message, 'error');
    } else {
      showToast('Admin dihapus', 'success');
      setDeleteTarget(null);
      await fetchAdmins();
      await refreshAdminProfile();
    }
    setDeleting(false);
  };

  const filtered = admins.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.email?.toLowerCase().includes(q) ||
      a.name?.toLowerCase().includes(q) ||
      a.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Admin</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola akun admin dan role mereka
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setAddOpen(true)}
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
          placeholder="Cari admin berdasarkan nama, email, atau role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada admin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {a.name ?? '(tanpa nama)'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{a.email ?? '-'}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    a.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}
                >
                  {a.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  {a.role ?? 'staff'}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                <button
                  onClick={() => handleToggleActive(a)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors"
                >
                  {a.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <div className="flex gap-1">
                  {canUpdate && (
                    <button
                      onClick={() => openRoleEdit(a)}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      title="Ubah Role"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteTarget(a)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Hapus Admin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Admin Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAddOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Admin</h2>
              <button onClick={() => setAddOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                  className="input"
                  placeholder="admin@sekolah.sch.id"
                />
              </div>
              <div>
                <label className="label">Nama</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="input"
                  placeholder="Nama lengkap admin"
                />
              </div>
              <div>
                <label className="label">User ID (opsional)</label>
                <input
                  type="text"
                  value={addForm.user_id}
                  onChange={e => setAddForm({ ...addForm, user_id: e.target.value })}
                  className="input"
                  placeholder="UUID dari auth.users (kosongkan untuk auto-deteksi)"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Jika dikosongkan, sistem akan mencari admin_users yang ada berdasarkan email. Jika tidak ada, user_id akan diisi null.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      {roleEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setRoleEditing(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ubah Role</h2>
              <button onClick={() => setRoleEditing(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Admin: <span className="font-medium text-slate-700 dark:text-slate-200">{roleEditing.name ?? roleEditing.email}</span>
              </div>
              <div>
                <label className="label">Pilih Role</label>
                <select
                  value={roleForm}
                  onChange={e => setRoleForm(e.target.value)}
                  className="input"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Level {r.level ?? '-'})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  Role akan ditulis ke tabel admin_user_roles agar langsung aktif pada login berikutnya.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setRoleEditing(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleRoleSave}
                disabled={savingRole}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {savingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Admin?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Admin <span className="font-medium">{deleteTarget.name ?? deleteTarget.email}</span> akan dihapus beserta assignment rolenya. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

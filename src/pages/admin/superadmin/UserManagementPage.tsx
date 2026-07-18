import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  UserCog, Plus, Trash2, X, Loader2, Search, Shield, Mail, Power, Crown,
} from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  level: number | null;
  is_active: boolean | null;
}

export default function UserManagementPage() {
  const { hasPermission, refreshAdminProfile } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', name: '', user_id: '', role_id: '' });
  const [adding, setAdding] = useState(false);
  const [roleModalAdmin, setRoleModalAdmin] = useState<AdminUser | null>(null);
  const [roleForm, setRoleForm] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [deleteAdmin, setDeleteAdmin] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
      showToast('Gagal memuat admin user', 'error');
    } else {
      setAdmins((data as unknown as AdminUser[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level, is_active')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat roles', 'error');
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

    let userId: string | null = addForm.user_id.trim() ? addForm.user_id.trim() : null;
    const roleName = roles.find(r => r.id === addForm.role_id)?.name ?? null;

    // If no user_id provided, try to reuse existing admin_users row by email
    if (!userId) {
      const { data: existing } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('email', addForm.email.trim())
        .limit(1);
      const existingRow = (existing as unknown as { user_id: string | null }[] | null)?.[0];
      if (existingRow?.user_id) {
        userId = existingRow.user_id;
      }
    }

    const payload: Record<string, unknown> = {
      email: addForm.email.trim(),
      name: addForm.name.trim() || null,
      role: roleName,
      is_active: true,
    };
    if (userId) payload.user_id = userId;

    const { data: inserted, error } = await supabase
      .from('admin_users')
      .insert(payload)
      .select('id')
      .single();
    const insertedRow = inserted as unknown as { id: string } | null;

    if (error) {
      showToast('Gagal menambah admin: ' + error.message, 'error');
      setAdding(false);
      return;
    }

    // Upsert role assignment into admin_user_roles
    if (insertedRow?.id && addForm.role_id) {
      await supabase
        .from('admin_user_roles')
        .upsert(
          { admin_user_id: insertedRow.id, role_id: addForm.role_id },
          { onConflict: 'admin_user_id,role_id' }
        );
    }

    if (!userId) {
      showToast('Admin ditambahkan (user_id kosong — user akan aktif setelah login pertama)', 'info');
    } else {
      showToast('Admin ditambahkan', 'success');
    }
    setAddOpen(false);
    setAddForm({ email: '', name: '', user_id: '', role_id: '' });
    setAdding(false);
    await fetchAdmins();
    await refreshAdminProfile();
  };

  const openRoleModal = (a: AdminUser) => {
    const matched = roles.find(r => r.name === a.role);
    setRoleForm(matched?.id ?? '');
    setRoleModalAdmin(a);
  };

  const handleSaveRole = async () => {
    if (!roleModalAdmin) return;
    if (!roleForm) {
      showToast('Pilih role', 'error');
      return;
    }
    setSavingRole(true);
    const role = roles.find(r => r.id === roleForm);
    const roleName = role?.name ?? null;

    // 1. Update admin_users.role text column
    const { error: updErr } = await supabase
      .from('admin_users')
      .update({ role: roleName })
      .eq('id', roleModalAdmin.id);

    if (updErr) {
      showToast('Gagal memperbarui role', 'error');
      setSavingRole(false);
      return;
    }

    // 2. Delete existing role assignments, then insert new
    await supabase
      .from('admin_user_roles')
      .delete()
      .eq('admin_user_id', roleModalAdmin.id);
    await supabase
      .from('admin_user_roles')
      .upsert(
        { admin_user_id: roleModalAdmin.id, role_id: roleForm },
        { onConflict: 'admin_user_id,role_id' }
      );

    showToast('Role diperbarui', 'success');
    setRoleModalAdmin(null);
    setSavingRole(false);
    await fetchAdmins();
    await refreshAdminProfile();
  };

  const handleToggleActive = async (a: AdminUser) => {
    setTogglingId(a.id);
    const newVal = !(a.is_active ?? false);
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: newVal })
      .eq('id', a.id);
    if (error) {
      showToast('Gagal mengubah status', 'error');
    } else {
      showToast(newVal ? 'Admin diaktifkan' : 'Admin dinonaktifkan', 'success');
      await fetchAdmins();
      await refreshAdminProfile();
    }
    setTogglingId(null);
  };

  const handleDelete = async () => {
    if (!deleteAdmin) return;
    setDeleting(true);
    // Remove role assignments first
    await supabase
      .from('admin_user_roles')
      .delete()
      .eq('admin_user_id', deleteAdmin.id);
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', deleteAdmin.id);
    if (error) {
      showToast('Gagal menghapus admin', 'error');
    } else {
      showToast('Admin dihapus', 'success');
      setDeleteAdmin(null);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen User</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola admin, role, dan status aktif
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
          placeholder="Cari nama, email, atau role..."
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
            <UserCog className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada admin user</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => {
            const roleMatch = roles.find(r => r.name === a.role);
            return (
              <div key={a.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">
                        {(a.name || a.email || 'A').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {a.name || '(tanpa nama)'}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Mail className="w-3 h-3" />
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

                <div className="flex items-center gap-2 flex-wrap">
                  {a.role ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      {roleMatch?.level != null && <Crown className="w-3 h-3" />}
                      {a.role}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs">
                      Tanpa role
                    </span>
                  )}
                  {roleMatch?.level != null && (
                    <span className="text-xs text-slate-400">Level {roleMatch.level}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  {canUpdate && (
                    <>
                      <button
                        onClick={() => openRoleModal(a)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" /> Ubah Role
                      </button>
                      <button
                        onClick={() => handleToggleActive(a)}
                        disabled={togglingId === a.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        {togglingId === a.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                        {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteAdmin(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
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
                  placeholder="admin@sekolah.id"
                />
              </div>
              <div>
                <label className="label">Nama</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="input"
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label className="label">User ID (UUID, opsional)</label>
                <input
                  type="text"
                  value={addForm.user_id}
                  onChange={e => setAddForm({ ...addForm, user_id: e.target.value })}
                  className="input"
                  placeholder="Kosongkan untuk lookup otomatis"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Jika dikosongkan, sistem akan mencari user_id berdasarkan email. Jika tidak ditemukan, user_id akan disimpan null.
                </p>
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
                    <option key={r.id} value={r.id}>
                      {r.name}{r.level != null ? ` (Level ${r.level})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setAddOpen(false)} className="btn-secondary">Batal</button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex items-center gap-2 btn-primary"
              >
                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role modal */}
      {roleModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setRoleModalAdmin(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ubah Role</h2>
              <button onClick={() => setRoleModalAdmin(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                User: <span className="font-medium text-slate-900 dark:text-white">{roleModalAdmin.name || roleModalAdmin.email}</span>
              </p>
              <div>
                <label className="label">Role</label>
                <select
                  value={roleForm}
                  onChange={e => setRoleForm(e.target.value)}
                  className="input"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.level != null ? ` (Level ${r.level})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setRoleModalAdmin(null)} className="btn-secondary">Batal</button>
              <button
                onClick={handleSaveRole}
                disabled={savingRole}
                className="flex items-center gap-2 btn-primary"
              >
                {savingRole && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteAdmin(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Admin?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {deleteAdmin.name || deleteAdmin.email} akan dihapus beserta assignment rolenya. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteAdmin(null)} className="btn-secondary">Batal</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

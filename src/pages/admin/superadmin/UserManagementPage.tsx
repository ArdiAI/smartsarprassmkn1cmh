import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  UserPlus, Trash2, Search, Loader2, Users, Shield, Mail, Pencil, Check, X,
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
  is_system: boolean | null;
  is_active: boolean | null;
}

export default function UserManagementPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState('');

  const [editRole, setEditRole] = useState('');

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
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
      .select('id, name, level, is_system, is_active')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat data role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
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
    if (!canCreate) {
      showToast('Anda tidak memiliki izin untuk menambah admin', 'error');
      return;
    }
    if (!newEmail.trim()) {
      showToast('Email wajib diisi', 'warning');
      return;
    }
    setActionLoading('add');
    try {
      let userIdToInsert = newUserId.trim() || null;

      if (!userIdToInsert) {
        const { data: existing } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('email', newEmail.trim())
          .maybeSingle();
        if (existing) {
          const ex = existing as unknown as { user_id: string | null };
          if (ex.user_id) userIdToInsert = ex.user_id;
        }
      }

      const { error } = await supabase.from('admin_users').insert({
        user_id: userIdToInsert,
        email: newEmail.trim(),
        name: newName.trim() || null,
        role: newRole || null,
        is_active: true,
      });

      if (error) {
        showToast(`Gagal menambah admin: ${error.message}`, 'error');
      } else {
        if (!userIdToInsert) {
          showToast('Admin ditambahkan. User ID belum tersedia — minta user login lalu hubungkan akunnya.', 'info');
        } else {
          showToast('Admin berhasil ditambahkan', 'success');
        }
        setShowAddModal(false);
        setNewEmail('');
        setNewName('');
        setNewUserId('');
        setNewRole('');
        await fetchAdmins();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menambah admin', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async () => {
    if (!canUpdate || !editingAdmin) {
      showToast('Anda tidak memiliki izin untuk mengubah role', 'error');
      return;
    }
    setActionLoading('edit');
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role: editRole || null })
        .eq('id', editingAdmin.id);
      if (error) {
        showToast(`Gagal mengubah role: ${error.message}`, 'error');
      } else {
        showToast('Role berhasil diperbarui', 'success');
        setEditingAdmin(null);
        await fetchAdmins();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat mengubah role', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (admin: AdminUser) => {
    if (!canUpdate) {
      showToast('Anda tidak memiliki izin untuk mengubah status admin', 'error');
      return;
    }
    setActionLoading(`toggle-${admin.id}`);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !admin.is_active })
        .eq('id', admin.id);
      if (error) {
        showToast(`Gagal mengubah status: ${error.message}`, 'error');
      } else {
        showToast('Status admin diperbarui', 'success');
        await fetchAdmins();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (admin: AdminUser) => {
    if (!canDelete) {
      showToast('Anda tidak memiliki izin untuk menghapus admin', 'error');
      return;
    }
    if (!confirm(`Hapus admin "${admin.name || admin.email || ''}"?`)) return;
    setActionLoading(`del-${admin.id}`);
    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', admin.id);
      if (error) {
        showToast(`Gagal menghapus admin: ${error.message}`, 'error');
      } else {
        showToast('Admin berhasil dihapus', 'success');
        await fetchAdmins();
      }
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
            Kelola akun admin dan role mereka
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Tambah Admin
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari nama, email, atau role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(admin => {
            const roleInfo = roles.find(r => r.name === admin.role);
            return (
              <div key={admin.id} className="card p-5 rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {admin.name || '(tanpa nama)'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{admin.email || '-'}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                      admin.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    )}
                  >
                    {admin.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {admin.role || 'Belum ada role'}
                  </span>
                  {roleInfo?.level != null && (
                    <span className="text-xs text-slate-400">· Level {roleInfo.level}</span>
                  )}
                </div>

                {admin.created_at && (
                  <p className="text-xs text-slate-400 mt-2">
                    Dibuat: {new Date(admin.created_at).toLocaleDateString('id-ID')}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  {canUpdate && (
                    <>
                      <button
                        onClick={() => {
                          setEditingAdmin(admin);
                          setEditRole(admin.role || '');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Ubah Role
                      </button>
                      <button
                        onClick={() => handleToggleActive(admin)}
                        disabled={actionLoading === `toggle-${admin.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `toggle-${admin.id}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : admin.is_active ? (
                          <X className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        {admin.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleRemove(admin)}
                      disabled={actionLoading === `del-${admin.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 ml-auto"
                    >
                      {actionLoading === `del-${admin.id}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Tambah Admin</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Nama
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nama admin"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  User ID (opsional)
                </label>
                <input
                  type="text"
                  value={newUserId}
                  onChange={e => setNewUserId(e.target.value)}
                  placeholder="UUID dari auth.users (kosongkan untuk cari otomatis)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Jika dikosongkan, sistem akan mencari berdasarkan email.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>
                      {r.name}{r.level != null ? ` (Level ${r.level})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={actionLoading === 'add'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Ubah Role</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {editingAdmin.name || editingAdmin.email || 'Admin'}
            </p>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Role
              </label>
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Tanpa role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.name}>
                    {r.name}{r.level != null ? ` (Level ${r.level})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingAdmin(null)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={actionLoading === 'edit'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'edit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

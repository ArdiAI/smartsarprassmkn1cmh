import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Loader2, UserPlus, Trash2, Search, ShieldCheck, ShieldOff,
  Mail, User as UserIcon, KeyRound, Users,
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
  is_system: boolean;
  is_active: boolean;
}

export default function UserManagementPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('');
  const [saving, setSaving] = useState(false);

  const [roleMenuFor, setRoleMenuFor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, user_id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data admin', 'error');
    } else {
      setAdmins((data as unknown as AdminUserRow[]) || []);
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
      showToast('Gagal memuat daftar role', 'error');
    } else {
      setRoles((data as unknown as RoleRow[]) || []);
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
    if (!addEmail.trim() || !addName.trim() || !addRole) {
      showToast('Email, nama, dan role wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      let userIdToInsert: string | null = addUserId.trim() || null;

      if (!userIdToInsert) {
        const { data: existing } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('email', addEmail.trim())
          .not('user_id', 'is', null)
          .limit(1);
        const existingRow = (existing as unknown as { user_id: string }[] | null)?.[0];
        if (existingRow?.user_id) {
          userIdToInsert = existingRow.user_id;
        }
      }

      const { error } = await supabase.from('admin_users').insert({
        user_id: userIdToInsert,
        email: addEmail.trim(),
        name: addName.trim(),
        role: addRole,
        is_active: true,
      });
      if (error) {
        showToast('Gagal menambahkan admin: ' + error.message, 'error');
        setSaving(false);
        return;
      }

      if (!userIdToInsert) {
        showToast('Admin ditambahkan tanpa user_id. Minta user login sekali untuk menautkan akun.', 'info');
      } else {
        showToast('Admin berhasil ditambahkan', 'success');
      }
      setShowAdd(false);
      setAddEmail('');
      setAddName('');
      setAddUserId('');
      setAddRole('');
      await fetchAdmins();
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (admin: AdminUserRow) => {
    if (!confirm(`Hapus admin "${admin.name}" (${admin.email})?`)) return;
    setActionLoading(admin.id);
    const { error } = await supabase.from('admin_users').delete().eq('id', admin.id);
    if (error) {
      showToast('Gagal menghapus admin', 'error');
    } else {
      showToast('Admin dihapus', 'success');
      await fetchAdmins();
    }
    setActionLoading(null);
  };

  const handleToggleActive = async (admin: AdminUserRow) => {
    setActionLoading(admin.id);
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: !admin.is_active })
      .eq('id', admin.id);
    if (error) {
      showToast('Gagal mengubah status', 'error');
    } else {
      showToast(`Admin ${admin.is_active ? 'dinonaktifkan' : 'diaktifkan'}`, 'success');
      await fetchAdmins();
    }
    setActionLoading(null);
  };

  const handleRoleChange = async (admin: AdminUserRow, newRole: string) => {
    setActionLoading(admin.id);
    setRoleMenuFor(null);
    const { error } = await supabase
      .from('admin_users')
      .update({ role: newRole })
      .eq('id', admin.id);
    if (error) {
      showToast('Gagal mengubah role', 'error');
    } else {
      showToast('Role diperbarui', 'success');
      await fetchAdmins();
    }
    setActionLoading(null);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Admin</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola akun admin, role, dan status aktif
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Admin
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(admin => {
            const roleObj = roles.find(r => r.name === admin.role);
            return (
              <div key={admin.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                      admin.is_active
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-700/50'
                    )}>
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{admin.name ?? ''}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{admin.email ?? ''}</span>
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    admin.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                  )}>
                    {admin.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
                    {admin.role ?? ''}
                  </span>
                  {roleObj && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">Level {roleObj.level}</span>
                  )}
                </div>

                {admin.user_id ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> {admin.user_id}
                  </p>
                ) : (
                  <p className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Belum terhubung ke akun auth
                  </p>
                )}

                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Dibuat: {new Date(admin.created_at).toLocaleDateString('id-ID')}
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  {canUpdate && (
                    <div className="relative">
                      <button
                        onClick={() => setRoleMenuFor(roleMenuFor === admin.id ? null : admin.id)}
                        disabled={actionLoading === admin.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        Ubah Role
                      </button>
                      {roleMenuFor === admin.id && (
                        <div className="absolute z-10 mt-1 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-60 overflow-y-auto">
                          {roles.map(r => (
                            <button
                              key={r.id}
                              onClick={() => handleRoleChange(admin, r.name)}
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50',
                                r.name === admin.role
                                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                                  : 'text-slate-700 dark:text-slate-200'
                              )}
                            >
                              {r.name} (Lvl {r.level})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {canUpdate && (
                    <button
                      onClick={() => handleToggleActive(admin)}
                      disabled={actionLoading === admin.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      {admin.is_active ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      {admin.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleRemove(admin)}
                      disabled={actionLoading === admin.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors ml-auto"
                    >
                      {actionLoading === admin.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Admin</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Email *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="admin@sekolah.sch.id"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Nama *</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  User ID (UUID, opsional)
                </label>
                <input
                  type="text"
                  value={addUserId}
                  onChange={e => setAddUserId(e.target.value)}
                  placeholder="Kosongkan untuk cari otomatis"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Jika kosong, sistem akan mencari admin_users dengan email yang sama untuk menggunakan user_id-nya.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Role *</label>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Pilih role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name} (Level {r.level})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

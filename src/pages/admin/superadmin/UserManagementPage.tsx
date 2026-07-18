import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Users, Search, UserPlus, Trash2, Loader2, Shield, Mail,
  CheckCircle, XCircle, ChevronDown, ShieldCheck, RefreshCw,
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
  description: string | null;
  level: number | null;
  is_system: boolean | null;
  is_active: boolean | null;
}

export default function UserManagementPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState<string | null>(null);

  const fetchAdminUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data admin', 'error');
    } else {
      setAdminUsers((data as unknown as AdminUser[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat data role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchAdminUsers();
    fetchRoles();
  }, [fetchAdminUsers, fetchRoles]);

  const filteredUsers = adminUsers.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  const handleAddAdmin = async () => {
    if (!newEmail.trim()) {
      showToast('Email wajib diisi', 'warning');
      return;
    }
    setAddLoading(true);
    try {
      const { data: existing } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', newEmail.trim())
        .maybeSingle();

      if (existing) {
        showToast('Admin dengan email ini sudah ada', 'warning');
        setAddLoading(false);
        return;
      }

      const { data: authUser } = await supabase.auth.admin.listUsers();
      const matched = (authUser?.users || []).find(
        u => (u.email ?? '').toLowerCase() === newEmail.trim().toLowerCase()
      );

      const insertPayload: Record<string, unknown> = {
        email: newEmail.trim(),
        name: newName.trim() || null,
        role: newRole || null,
        is_active: true,
      };
      if (matched) {
        insertPayload.user_id = matched.id;
      }

      const { error } = await supabase.from('admin_users').insert(insertPayload);
      if (error) {
        showToast('Gagal menambah admin: ' + error.message, 'error');
      } else {
        showToast('Admin berhasil ditambahkan', 'success');
        setShowAddModal(false);
        setNewEmail('');
        setNewName('');
        setNewRole('');
        fetchAdminUsers();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menambah admin', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (!confirm('Hapus admin ini?')) return;
    setActionLoading(id);
    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) {
        showToast('Gagal menghapus admin', 'error');
      } else {
        showToast('Admin berhasil dihapus', 'success');
        fetchAdminUsers();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !(user.is_active ?? false) })
        .eq('id', user.id);
      if (error) {
        showToast('Gagal mengubah status', 'error');
      } else {
        showToast('Status admin diperbarui', 'success');
        fetchAdminUsers();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (user: AdminUser, roleName: string) => {
    setActionLoading(user.id);
    setRoleMenuOpen(null);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role: roleName })
        .eq('id', user.id);
      if (error) {
        showToast('Gagal mengubah role', 'error');
      } else {
        showToast('Role admin diperbarui', 'success');
        fetchAdminUsers();
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-500" />
            Manajemen User Admin
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola admin, role, dan status akun
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Admin
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, email, atau role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
          />
        </div>
        <button
          onClick={fetchAdminUsers}
          className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada admin</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map(user => {
            const userRole = roles.find(r => r.name === user.role);
            const isMenuOpen = roleMenuOpen === user.id;
            return (
              <div
                key={user.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {user.name ?? 'Tanpa Nama'}
                        </h3>
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-xs font-medium',
                            user.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          )}
                        >
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{user.email ?? '-'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Dibuat: {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <button
                        onClick={() => setRoleMenuOpen(isMenuOpen ? null : user.id)}
                        disabled={actionLoading === user.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                        <span>{user.role ?? 'Tanpa Role'}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-10 max-h-60 overflow-y-auto">
                          {roles.map(role => (
                            <button
                              key={role.id}
                              onClick={() => handleUpdateRole(user, role.name)}
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors',
                                role.name === user.role
                                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                                  : 'text-slate-700 dark:text-slate-200'
                              )}
                            >
                              {role.name}
                              {role.is_system && (
                                <span className="text-xs text-slate-400 ml-1">(sistem)</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={actionLoading === user.id}
                      className={cn(
                        'p-2 rounded-lg border transition-colors disabled:opacity-50',
                        user.is_active
                          ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20'
                      )}
                      title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : user.is_active ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleRemoveAdmin(user.id)}
                      disabled={actionLoading === user.id}
                      className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      title="Hapus"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {userRole && userRole.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pl-14">
                    {userRole.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Tambah Admin Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Nama
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                >
                  <option value="">Pilih Role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddAdmin}
                disabled={addLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Users,
  Search,
  UserPlus,
  Trash2,
  Shield,
  Mail,
  Loader2,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

// ---- Types ----

interface Role {
  id: string;
  name: string;
  level: number;
  description: string;
}

interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AdminUserWithRole extends AdminUser {
  role_level?: number;
  role_description?: string;
}

// ---- Component ----

export default function UserManagementPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add form state
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState('');
  const [adding, setAdding] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ found: boolean; name?: string; message?: string } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('level', { ascending: true });

      if (rolesError) throw rolesError;

      const typedUsers = (usersData || []) as unknown as AdminUser[];
      const typedRoles = (rolesData || []) as unknown as Role[];

      const roleMap = new Map(typedRoles.map(r => [r.name, r]));
      const enriched: AdminUserWithRole[] = typedUsers.map(u => ({
        ...u,
        role_level: roleMap.get(u.role)?.level,
        role_description: roleMap.get(u.role)?.description,
      }));

      setAdminUsers(enriched);
      setRoles(typedRoles);
    } catch (err) {
      console.error('Error fetching admin users:', err);
      showToast('Gagal memuat data admin', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lookup email in admin_users (profiles table doesn't exist; check admin_users)
  const handleEmailLookup = async (email: string) => {
    if (!email || !email.includes('@')) {
      setLookupResult(null);
      return;
    }
    setLookingUp(true);
    try {
      const { data } = await supabase
        .from('admin_users')
        .select('id, email, name')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (data) {
        const typed = data as unknown as { id: string; email: string; name: string };
        setLookupResult({ found: true, name: typed.name });
        if (typed.name && !addName) setAddName(typed.name);
      } else {
        setLookupResult({ found: false, message: 'Email belum terdaftar di sistem. Admin akan dibuat dengan data ini.' });
      }
    } catch {
      setLookupResult(null);
    } finally {
      setLookingUp(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!addEmail || !addRole) {
      showToast('Email dan role wajib diisi', 'warning');
      return;
    }
    setAdding(true);
    try {
      const email = addEmail.toLowerCase().trim();
      const { data: existing } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        showToast('Admin dengan email ini sudah ada', 'warning');
        setAdding(false);
        return;
      }

      const { error } = await supabase
        .from('admin_users')
        .insert({
          email,
          name: addName.trim() || email.split('@')[0],
          role: addRole,
          is_active: true,
        });

      if (error) throw error;

      showToast('Admin berhasil ditambahkan', 'success');
      setShowAddModal(false);
      setAddEmail('');
      setAddName('');
      setAddRole('');
      setLookupResult(null);
      fetchData();
    } catch (err) {
      console.error('Error adding admin:', err);
      showToast('Gagal menambahkan admin', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAdmin = async (id: string, email: string) => {
    if (!confirm(`Hapus admin "${email}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) throw error;
      showToast('Admin berhasil dihapus', 'success');
      fetchData();
    } catch (err) {
      console.error('Error removing admin:', err);
      showToast('Gagal menghapus admin', 'error');
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !current })
        .eq('id', id);
      if (error) throw error;
      showToast(`Admin ${!current ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      fetchData();
    } catch (err) {
      console.error('Error toggling active:', err);
      showToast('Gagal mengubah status', 'error');
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role: newRole })
        .eq('id', id);
      if (error) throw error;
      showToast('Role berhasil diperbarui', 'success');
      fetchData();
    } catch (err) {
      console.error('Error updating role:', err);
      showToast('Gagal memperbarui role', 'error');
    }
  };

  const filtered = adminUsers.filter(u => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const getRoleBadgeColor = (level?: number) => {
    if (level === undefined) return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    if (level >= 90) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (level >= 70) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
    if (level >= 40) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Manajemen Admin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengguna admin dan role mereka
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Admin
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari berdasarkan email, nama, atau role..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada admin ditemukan</p>
            <p className="text-sm text-slate-400 mt-1">Coba ubah kata kunci pencarian</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Admin</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dibuat</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {(user.name || user.email)[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{user.name || user.email}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={e => handleUpdateRole(user.id, e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                      <span className={cn('ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', getRoleBadgeColor(user.role_level))}>
                        <Shield className="w-3 h-3" />
                        Lv. {user.role_level ?? '?'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className="inline-flex items-center gap-2 group"
                      >
                        <span className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          user.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        )}>
                          <span className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            user.is_active ? 'translate-x-6' : 'translate-x-1'
                          )} />
                        </span>
                        <span className={cn(
                          'text-xs font-medium',
                          user.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        )}>
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveAdmin(user.id, user.email)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Tambah Admin Baru
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Email */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Email Admin</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={addEmail}
                    onChange={e => {
                      setAddEmail(e.target.value);
                      setLookupResult(null);
                    }}
                    onBlur={e => handleEmailLookup(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  {lookingUp && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />}
                </div>
                {lookupResult && (
                  <div className={cn(
                    'mt-2 flex items-start gap-2 p-2.5 rounded-lg text-xs',
                    lookupResult.found
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                  )}>
                    {lookupResult.found ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    <span>
                      {lookupResult.found
                        ? `Ditemukan: ${lookupResult.name || '(tanpa nama)'}`
                        : lookupResult.message}
                    </span>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Nama (opsional)</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Nama lengkap admin"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Role</label>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Pilih role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>
                      {r.name} (Level {r.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddAdmin}
                disabled={adding || !addEmail || !addRole}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Tambah Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

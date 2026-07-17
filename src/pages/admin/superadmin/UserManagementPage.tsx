import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Users,
  Search,
  UserPlus,
  Trash2,
  Shield,
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react';

// ---- Types ----
interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string | null;
}

interface Role {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
}

// ---- Component ----
export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        supabase
          .from('admin_users')
          .select('id, user_id, email, name, role, is_active, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('roles')
          .select('id, name, level, is_active')
          .eq('is_active', true)
          .order('level', { ascending: true }),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setUsers((usersRes.data ?? []) as unknown as AdminUser[]);
      setRoles((rolesRes.data ?? []) as unknown as Role[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  const roleLabel = (roleName: string | null): string => {
    if (!roleName) return '—';
    const r = roles.find(x => x.name === roleName);
    return r ? `${r.name} (Lv ${r.level})` : roleName;
  };

  const handleAdd = async () => {
    if (!newEmail.trim()) {
      showToast('Email wajib diisi', 'warning');
      return;
    }
    setAdding(true);
    try {
      const payload: { email: string; name: string; role: string } = {
        email: newEmail.trim(),
        name: newName.trim(),
        role: newRole || 'admin',
      };
      const { error } = await supabase.from('admin_users').insert(payload);
      if (error) throw error;
      showToast('Admin berhasil ditambahkan', 'success');
      setShowAdd(false);
      setNewEmail('');
      setNewName('');
      setNewRole('');
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambah admin';
      showToast(msg, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string, email: string) => {
    if (!confirm(`Hapus admin "${email}"?`)) return;
    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) throw error;
      showToast('Admin dihapus', 'success');
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus';
      showToast(msg, 'error');
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role })
        .eq('id', id);
      if (error) throw error;
      showToast('Role diperbarui', 'success');
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, role } : u)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui role';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !current })
        .eq('id', id);
      if (error) throw error;
      showToast(`Admin ${!current ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, is_active: !current } : u))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Manajemen Admin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola admin, role, dan status aktif
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
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
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            Tidak ada admin ditemukan
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map(user => (
              <div
                key={user.id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      user.is_active
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                    )}
                  >
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {user.name || user.email}
                      </p>
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <XCircle className="w-3.5 h-3.5" />
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Role select */}
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <select
                      value={user.role ?? ''}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      disabled={updatingId === user.id}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                    >
                      <option value="">— Pilih Role —</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>
                          {roleLabel(r.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    disabled={updatingId === user.id}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50',
                      user.is_active ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                    )}
                    title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        user.is_active ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(user.id, user.email)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Hapus admin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Tambah Admin
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>
                      {r.name} (Lv {r.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

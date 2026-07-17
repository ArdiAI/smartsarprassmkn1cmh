import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Users, Search, UserPlus, Trash2, ShieldCheck, ShieldOff,
  RefreshCw, Mail, Crown, Loader2, ChevronUp, ChevronDown,
} from 'lucide-react';

/* ----------------------------- Types ----------------------------- */
interface Role {
  id: string;
  name: string;
  level: number;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
}
interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
}
interface NewAdmin {
  email: string;
  name: string;
  role: string;
}

/* --------------------------- Component ---------------------------- */
export default function UserManagementPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newAdmin, setNewAdmin] = useState<NewAdmin>({ email: '', name: '', role: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [adminRes, rolesRes] = await Promise.all([
        supabase.from('admin_users').select('*').order('created_at', { ascending: sortAsc }),
        supabase.from('roles').select('*').order('level', { ascending: true }),
      ]);
      if (adminRes.error) throw adminRes.error;
      if (rolesRes.error) throw rolesRes.error;
      setAdminUsers((adminRes.data as unknown as AdminUser[]) || []);
      setRoles((rolesRes.data as unknown as Role[]) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load admin users';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [sortAsc]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filtered = adminUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name?.toLowerCase().includes(q) ?? false) ||
      (u.role?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleAdd = async () => {
    if (!newAdmin.email.trim() || !newAdmin.role) {
      showToast('Email and role are required', 'warning');
      return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .insert({
          email: newAdmin.email.trim(),
          name: newAdmin.name.trim() || null,
          role: newAdmin.role,
          is_active: true,
        })
        .select('*')
        .single();
      if (error) throw error;
      setAdminUsers((prev) => [...(prev as AdminUser[]), data as unknown as AdminUser]);
      setNewAdmin({ email: '', name: '', role: '' });
      setShowAdd(false);
      showToast('Admin user added', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add admin';
      showToast(msg, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this admin user?')) return;
    setSavingId(id);
    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) throw error;
      setAdminUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('Admin user removed', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove admin';
      showToast(msg, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setSavingId(user.id);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) throw error;
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      );
      showToast(`Admin ${!user.is_active ? 'activated' : 'deactivated'}`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update admin';
      showToast(msg, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleRoleChange = async (user: AdminUser, role: string) => {
    setSavingId(user.id);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role })
        .eq('id', user.id);
      if (error) throw error;
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role } : u))
      );
      showToast('Role updated', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      showToast(msg, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const activeRoles = roles.filter((r) => r.is_active);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage admin users, roles, and access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadData()}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              <UserPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Admin</span>
            </button>
          </div>
        </div>

        {/* Add panel */}
        {showAdd && (
          <div className="mb-6 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
              Add new admin user
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="email"
                placeholder="Email address"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin((s) => ({ ...s, email: e.target.value }))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Display name (optional)"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin((s) => ({ ...s, name: e.target.value }))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newAdmin.role}
                onChange={(e) => setNewAdmin((s) => ({ ...s, role: e.target.value }))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select role…</option>
                {activeRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} (L{r.level})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAdd()}
                disabled={adding}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        )}

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email, name, or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setSortAsc((s) => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="text-sm">Created {sortAsc ? '↑' : '↓'}</span>
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No admin users found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((user) => {
              const role = roles.find((r) => r.name === user.role);
              return (
                <div
                  key={user.id}
                  className={cn(
                    'p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md',
                    user.is_active
                      ? 'border-slate-200 dark:border-slate-700'
                      : 'border-slate-200 dark:border-slate-700 opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'p-2 rounded-xl flex-shrink-0',
                          user.is_active
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        )}
                      >
                        {user.is_active ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    {savingId === user.id && <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                        Role
                      </label>
                      <select
                        value={user.role ?? ''}
                        onChange={(e) => void handleRoleChange(user, e.target.value)}
                        disabled={savingId === user.id}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No role</option>
                        {activeRoles.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name} (L{r.level})
                          </option>
                        ))}
                      </select>
                    </div>

                    {role?.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        {role.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => void handleToggleActive(user)}
                        disabled={savingId === user.id}
                        className={cn(
                          'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors',
                          user.is_active
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        {user.is_active ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => void handleRemove(user.id)}
                        disabled={savingId === user.id}
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary footer */}
        {!loading && adminUsers.length > 0 && (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>
              {adminUsers.length} admin user{adminUsers.length !== 1 ? 's' : ''} ·{' '}
              {adminUsers.filter((u) => u.is_active).length} active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

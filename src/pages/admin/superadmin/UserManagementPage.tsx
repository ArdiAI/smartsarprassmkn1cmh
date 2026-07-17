import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldX,
  Mail,
  UserCircle,
  RefreshCw,
} from 'lucide-react';

// ---- Types matching DB schema ----
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

type NewAdminForm = {
  email: string;
  name: string;
  role: string;
};

export default function UserManagementPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewAdminForm>({ email: '', name: '', role: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
        supabase.from('roles').select('*').order('level', { ascending: true }),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setAdminUsers((usersRes.data ?? []) as unknown as AdminUser[]);
      setRoles((rolesRes.data ?? []) as unknown as Role[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = adminUsers.filter(u => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  const handleAdd = async () => {
    if (!form.email.trim()) {
      showToast('Email is required', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        email: form.email.trim(),
        name: form.name.trim() || null,
        role: form.role || null,
        user_id: null,
        is_active: true,
      };
      const { error } = await supabase.from('admin_users').insert(payload);
      if (error) throw error;
      showToast('Admin user added', 'success');
      setForm({ email: '', name: '', role: '' });
      setShowAdd(false);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add admin';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this admin user? This cannot be undone.')) return;
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) throw error;
      showToast('Admin user removed', 'success');
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove admin';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('admin_users').update({ role }).eq('id', id);
      if (error) throw error;
      showToast('Role updated', 'success');
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    setUpdatingId(user.id);
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) throw error;
      showToast(`User ${!user.is_active ? 'activated' : 'deactivated'}`, 'success');
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle status';
      showToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeRoles = roles.filter(r => r.is_active !== false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            User Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage admin users, roles, and access status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Admin
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm animate-slide-up">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-blue-500" />
            Add New Admin User
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Role
              </label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">— No role —</option>
                {activeRoles.map(r => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                    {r.level != null ? ` (L${r.level})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setShowAdd(false);
                setForm({ email: '', name: '', role: '' });
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save Admin
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or role..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No admin users found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search ? 'Try a different search term' : 'Add your first admin user to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {filtered.map(user => {
              const isUpdating = updatingId === user.id;
              return (
                <div
                  key={user.id}
                  className="flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  {/* Avatar + name/email */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        user.is_active
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-slate-100 dark:bg-slate-700/50'
                      )}
                    >
                      <Shield
                        className={cn(
                          'w-5 h-5',
                          user.is_active
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400'
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {user.name ?? 'Unnamed'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {user.email ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* Role select */}
                  <div className="md:w-52">
                    <select
                      value={user.role ?? ''}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                    >
                      <option value="">— No role —</option>
                      {activeRoles.map(r => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                          {r.level != null ? ` (L${r.level})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={isUpdating}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50',
                        user.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                          : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      {user.is_active ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <ShieldX className="w-4 h-4" />
                      )}
                      {user.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleRemove(user.id)}
                      disabled={isUpdating}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      title="Remove admin"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          Showing {filtered.length} of {adminUsers.length} admin users
        </p>
      )}
    </div>
  );
}

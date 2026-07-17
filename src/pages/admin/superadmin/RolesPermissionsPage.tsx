import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Shield, Plus, Pencil, Trash2, X, Loader2, RefreshCw,
  Lock, Crown, Star, ShieldCheck,
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
type RoleForm = Omit<Role, 'id' | 'is_system'> & { is_system?: boolean };

const emptyForm: RoleForm = {
  name: '',
  level: 1,
  description: '',
  is_active: true,
};

/* --------------------------- Component ---------------------------- */
export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('level', { ascending: true });
      if (error) throw error;
      setRoles((data as unknown as Role[]) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load roles';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRoles(); }, [loadRoles]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setForm({
      name: role.name,
      level: role.level,
      description: role.description ?? '',
      is_active: role.is_active,
      is_system: role.is_system,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Role name is required', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        level: Number(form.level) || 1,
        description: form.description?.trim() || null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase
          .from('roles')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        setRoles((prev) =>
          prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r))
        );
        showToast('Role updated', 'success');
      } else {
        const { data, error } = await supabase
          .from('roles')
          .insert(payload)
          .select('*')
          .single();
        if (error) throw error;
        setRoles((prev) => [...(prev as Role[]), data as unknown as Role]);
        showToast('Role created', 'success');
      }
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save role';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system) {
      showToast('System roles cannot be deleted', 'warning');
      return;
    }
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      showToast('Role deleted', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete role';
      showToast(msg, 'error');
    }
  };

  const levelIcon = (level: number) => {
    if (level >= 90) return Crown;
    if (level >= 50) return Star;
    if (level >= 10) return ShieldCheck;
    return Shield;
  };

  const levelColor = (level: number) => {
    if (level >= 90) return 'from-amber-500 to-orange-500 text-white';
    if (level >= 50) return 'from-purple-500 to-pink-500 text-white';
    if (level >= 10) return 'from-blue-500 to-cyan-500 text-white';
    return 'from-slate-400 to-slate-500 text-white';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Define roles and their permission levels
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadRoles()}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Role</span>
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No roles defined yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const Icon = levelIcon(role.level);
              return (
                <div
                  key={role.id}
                  className={cn(
                    'p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md',
                    role.is_active
                      ? 'border-slate-200 dark:border-slate-700'
                      : 'border-slate-200 dark:border-slate-700 opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        'p-2.5 rounded-xl bg-gradient-to-br shadow-sm',
                        levelColor(role.level)
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      {role.is_system && (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          <Lock className="w-3 h-3" /> System
                        </span>
                      )}
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-1 rounded-md',
                          role.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        )}
                      >
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                    {role.name}
                  </h3>
                  <p className="text-xs font-medium text-blue-500 dark:text-blue-400 mb-2">
                    Level {role.level}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
                    {role.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openEdit(role)}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDelete(role)}
                      disabled={role.is_system}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Role' : 'New Role'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  disabled={editing?.is_system}
                  placeholder="e.g. superadmin"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Level (1–100)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.level}
                  onChange={(e) => setForm((s) => ({ ...s, level: Number(e.target.value) }))}
                  disabled={editing?.is_system}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Higher level = more privileges (e.g. 100 = top).
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Description
                </label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  rows={3}
                  placeholder="What can this role do?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, is_active: !s.is_active }))}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors',
                    form.is_active ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      form.is_active && 'translate-x-5'
                    )}
                  />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

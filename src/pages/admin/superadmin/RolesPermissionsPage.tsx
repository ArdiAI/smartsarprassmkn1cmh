import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Lock,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// ---- Types matching DB schema ----
interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number | null;
  is_system: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
}

type RoleForm = {
  name: string;
  description: string;
  level: string;
  is_active: boolean;
};

const EMPTY_FORM: RoleForm = { name: '', description: '', level: '', is_active: true };

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('level', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setRoles((data ?? []) as unknown as Role[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load roles';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setForm({
      name: role.name ?? '',
      description: role.description ?? '',
      level: role.level != null ? String(role.level) : '',
      is_active: role.is_active !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
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
        description: form.description.trim() || null,
        level: form.level === '' ? null : Number(form.level),
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase.from('roles').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Role updated', 'success');
      } else {
        const { error } = await supabase.from('roles').insert({ ...payload, is_system: false });
        if (error) throw error;
        showToast('Role created', 'success');
      }
      closeModal();
      loadRoles();
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
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    setDeletingId(role.id);
    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;
      showToast('Role deleted', 'success');
      loadRoles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete role';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Define roles and access levels for the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRoles}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Role
          </button>
        </div>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No roles defined yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first role to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div
              key={role.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      role.is_system
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    {role.is_system ? (
                      <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{role.name}</h3>
                    {role.level != null && (
                      <span className="text-xs text-slate-400">Level {role.level}</span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    role.is_active !== false
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500'
                  )}
                >
                  {role.is_active !== false ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {role.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 min-h-[2.5rem] line-clamp-2">
                {role.description ?? 'No description'}
              </p>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  onClick={() => openEdit(role)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(role)}
                  disabled={role.is_system || deletingId === role.id}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    role.is_system
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  )}
                  title={role.is_system ? 'System roles cannot be deleted' : 'Delete role'}
                >
                  {deletingId === role.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 dark:border-slate-700 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Role' : 'Add Role'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Approver, Reviewer"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What does this role do?"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Level (number, optional)
                </label>
                <input
                  type="number"
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                  placeholder="e.g. 1, 2, 3"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors',
                    form.is_active ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
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
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editing ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

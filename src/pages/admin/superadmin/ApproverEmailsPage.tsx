import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  MailCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Mail,
  User,
  Info,
  Shield,
} from 'lucide-react';

// ---- Types matching DB schema ----
// NOTE: columns are `approver_email` and `approver_name` (NOT email/name)
interface RoleApproverEmail {
  id: string;
  role_id: string | null;
  role_name: string | null;
  approver_email: string | null;
  approver_name: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Role {
  id: string;
  name: string;
  level: number | null;
}

type ApproverForm = {
  role_id: string;
  role_name: string;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
};

const EMPTY_FORM: ApproverForm = {
  role_id: '',
  role_name: '',
  approver_email: '',
  approver_name: '',
  is_active: true,
};

export default function ApproverEmailsPage() {
  const [approvers, setApprovers] = useState<RoleApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RoleApproverEmail | null>(null);
  const [form, setForm] = useState<ApproverForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [apprRes, roleRes] = await Promise.all([
        supabase.from('role_approver_emails').select('*').order('role_name', { ascending: true }),
        supabase.from('roles').select('id, name, level').order('level', { ascending: true, nullsFirst: false }),
      ]);

      if (apprRes.error) throw apprRes.error;
      if (roleRes.error) throw roleRes.error;

      setApprovers((apprRes.data ?? []) as unknown as RoleApproverEmail[]);
      setRoles((roleRes.data ?? []) as unknown as Role[]);
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

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (appr: RoleApproverEmail) => {
    setEditing(appr);
    setForm({
      role_id: appr.role_id ?? '',
      role_name: appr.role_name ?? '',
      approver_email: appr.approver_email ?? '',
      approver_name: appr.approver_name ?? '',
      is_active: appr.is_active !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleRoleSelect = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    setForm(f => ({
      ...f,
      role_id: roleId,
      role_name: role?.name ?? '',
    }));
  };

  const handleSave = async () => {
    if (!form.role_id) {
      showToast('Please select a role', 'warning');
      return;
    }
    if (!form.approver_email.trim()) {
      showToast('Approver email is required', 'warning');
      return;
    }
    // Basic email validation
    const emailTrim = form.approver_email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      showToast('Please enter a valid email address', 'warning');
      return;
    }

    setSaving(true);
    try {
      // NOTE: uses approver_email and approver_name columns
      const payload = {
        role_id: form.role_id,
        role_name: form.role_name || null,
        approver_email: emailTrim,
        approver_name: form.approver_name.trim() || null,
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase
          .from('role_approver_emails')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw error;
        showToast('Approver updated', 'success');
      } else {
        const { error } = await supabase.from('role_approver_emails').insert(payload);
        if (error) throw error;
        showToast('Approver added', 'success');
      }
      closeModal();
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save approver';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (appr: RoleApproverEmail) => {
    if (!confirm(`Remove approver ${appr.approver_email ?? ''}?`)) return;
    setDeletingId(appr.id);
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', appr.id);
      if (error) throw error;
      showToast('Approver removed', 'success');
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove approver';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Group by role_name for display
  const grouped = approvers.reduce<Record<string, RoleApproverEmail[]>>((acc, a) => {
    const g = a.role_name ?? 'Unassigned Role';
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MailCheck className="w-6 h-6 text-blue-500" />
            Approver Emails
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Map roles to approver email addresses for notifications
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
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Approver
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">How approver emails work</p>
          <p className="text-blue-600 dark:text-blue-400">
            Each role can have one or more approver email addresses. When a request reaches a step
            that requires a role's approval, notifications are sent to all active emails assigned
            to that role.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : approvers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <MailCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No approver emails configured</p>
          <p className="text-sm text-slate-400 mt-1">Add an approver email to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([roleName, items]) => (
            <div
              key={roleName}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              {/* Role header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700/50">
                <Shield className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">{roleName}</h3>
                <span className="text-xs text-slate-400">
                  {items.length} approver{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Approvers list */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {items.map(appr => (
                  <div
                    key={appr.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {appr.approver_name ?? 'Unnamed'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          {appr.approver_email ?? '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          appr.is_active !== false
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500'
                        )}
                      >
                        {appr.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => openEdit(appr)}
                        className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(appr)}
                        disabled={deletingId === appr.id}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Remove"
                      >
                        {deletingId === appr.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 dark:border-slate-700 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Approver' : 'Add Approver Email'}
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
                  Role *
                </label>
                <select
                  value={form.role_id}
                  onChange={e => handleRoleSelect(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">— Select role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.level != null ? ` (L${r.level})` : ''}
                    </option>
                  ))}
                </select>
                {form.role_name && (
                  <p className="text-xs text-slate-400 mt-1">
                    Role name: <span className="font-mono">{form.role_name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Approver Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.approver_email}
                    onChange={e => setForm(f => ({ ...f, approver_email: e.target.value }))}
                    placeholder="approver@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Approver Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.approver_name}
                    onChange={e => setForm(f => ({ ...f, approver_name: e.target.value }))}
                    placeholder="Full name (optional)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
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
                {editing ? 'Save Changes' : 'Add Approver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

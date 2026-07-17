import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Mail, Plus, Pencil, Trash2, X, Loader2, RefreshCw,
  Info, User, Shield, Search,
} from 'lucide-react';

/* ----------------------------- Types ----------------------------- */
interface Role {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
}
interface RoleApproverEmail {
  id: string;
  role_name: string;
  email: string;
  name: string | null;
}
type ApproverForm = Omit<RoleApproverEmail, 'id'>;

const emptyForm: ApproverForm = {
  role_name: '',
  email: '',
  name: '',
};

/* --------------------------- Component ---------------------------- */
export default function ApproverEmailsPage() {
  const [approvers, setApprovers] = useState<RoleApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RoleApproverEmail | null>(null);
  const [form, setForm] = useState<ApproverForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, rolesRes] = await Promise.all([
        supabase.from('role_approver_emails').select('*').order('role_name', { ascending: true }),
        supabase.from('roles').select('id, name, level, is_active').order('level', { ascending: true }),
      ]);
      if (appRes.error) throw appRes.error;
      if (rolesRes.error) throw rolesRes.error;
      setApprovers((appRes.data as unknown as RoleApproverEmail[]) || []);
      setRoles((rolesRes.data as unknown as Role[]) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load approver emails';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const filtered = approvers.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.role_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.name?.toLowerCase().includes(q) ?? false)
    );
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: RoleApproverEmail) => {
    setEditing(a);
    setForm({
      role_name: a.role_name,
      email: a.email,
      name: a.name ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.role_name || !form.email.trim()) {
      showToast('Role and email are required', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        role_name: form.role_name,
        email: form.email.trim(),
        name: (form.name ?? '').trim() || null,
      };
      if (editing) {
        const { error } = await supabase
          .from('role_approver_emails')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        setApprovers((prev) =>
          prev.map((a) => (a.id === editing.id ? { ...a, ...payload } : a))
        );
        showToast('Approver updated', 'success');
      } else {
        const { data, error } = await supabase
          .from('role_approver_emails')
          .insert(payload)
          .select('*')
          .single();
        if (error) throw error;
        setApprovers((prev) => [...(prev as RoleApproverEmail[]), data as unknown as RoleApproverEmail]);
        showToast('Approver added', 'success');
      }
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save approver';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: RoleApproverEmail) => {
    if (!confirm(`Remove ${a.email} from ${a.role_name}?`)) return;
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', a.id);
      if (error) throw error;
      setApprovers((prev) => prev.filter((x) => x.id !== a.id));
      showToast('Approver removed', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove approver';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approver Emails</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Map emails to roles for approval notifications
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
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Approver</span>
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-4 flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            These emails receive approval requests based on the assigned role. When a workflow
            step requires a role's approval, all approvers mapped to that role are notified.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by role, email, or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No approver emails configured.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {a.name || a.email}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{a.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-medium px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    {a.role_name}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => openEdit(a)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDelete(a)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Approver' : 'Add Approver'}
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
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role_name}
                  onChange={(e) => setForm((s) => ({ ...s, role_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select role…</option>
                  {roles.filter((r) => r.is_active).map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name} (L{r.level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="approver@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Display name (optional)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                {editing ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

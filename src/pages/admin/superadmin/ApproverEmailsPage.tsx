import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Mail,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  XCircle,
  Info,
  Shield,
  User,
} from 'lucide-react';

// ---- Types ----
interface RoleApproverEmail {
  id: string;
  role_id: string | null;
  role_name: string;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
  created_at: string | null;
}

interface Role {
  id: string;
  name: string;
  level: number;
}

interface ApproverForm {
  role_id: string;
  role_name: string;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
}

const emptyForm: ApproverForm = {
  role_id: '',
  role_name: '',
  approver_email: '',
  approver_name: '',
  is_active: true,
};

// ---- Component ----
export default function ApproverEmailsPage() {
  const [approvers, setApprovers] = useState<RoleApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RoleApproverEmail | null>(null);
  const [form, setForm] = useState<ApproverForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [apprRes, rolesRes] = await Promise.all([
        supabase
          .from('role_approver_emails')
          .select(
            'id, role_id, role_name, approver_email, approver_name, is_active, created_at'
          )
          .order('role_name', { ascending: true })
          .order('approver_email', { ascending: true }),
        supabase
          .from('roles')
          .select('id, name, level')
          .eq('is_active', true)
          .order('level', { ascending: true }),
      ]);
      if (apprRes.error) throw apprRes.error;
      if (rolesRes.error) throw rolesRes.error;
      setApprovers((apprRes.data ?? []) as unknown as RoleApproverEmail[]);
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

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: RoleApproverEmail) => {
    setEditing(a);
    setForm({
      role_id: a.role_id ?? '',
      role_name: a.role_name,
      approver_email: a.approver_email,
      approver_name: a.approver_name,
      is_active: a.is_active,
    });
    setShowModal(true);
  };

  const handleRoleSelect = (roleId: string) => {
    const r = roles.find(x => x.id === roleId);
    setForm(prev => ({
      ...prev,
      role_id: roleId,
      role_name: r ? r.name : '',
    }));
  };

  const handleSave = async () => {
    if (!form.role_name.trim()) {
      showToast('Role wajib dipilih', 'warning');
      return;
    }
    if (!form.approver_email.trim()) {
      showToast('Email approver wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        role_id: form.role_id || null,
        role_name: form.role_name.trim(),
        approver_email: form.approver_email.trim(),
        approver_name: form.approver_name.trim(),
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase
          .from('role_approver_emails')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        showToast('Approver diperbarui', 'success');
      } else {
        const { error } = await supabase
          .from('role_approver_emails')
          .insert(payload);
        if (error) throw error;
        showToast('Approver ditambahkan', 'success');
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: RoleApproverEmail) => {
    if (!confirm(`Hapus approver "${a.approver_email}"?`)) return;
    try {
      const { error } = await supabase
        .from('role_approver_emails')
        .delete()
        .eq('id', a.id);
      if (error) throw error;
      showToast('Approver dihapus', 'success');
      setApprovers(prev => prev.filter(x => x.id !== a.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-500" />
            Email Approver per Role
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola daftar email approver untuk tiap role
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Approver
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Email approver digunakan sistem untuk mengirim notifikasi persetujuan
          ke pihak yang berwenang sesuai role-nya. Pastikan email yang
          dimasukkan aktif dan valid.
        </p>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : approvers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            Belum ada email approver
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {approvers.map(a => (
              <div
                key={a.id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {a.approver_name || a.approver_email}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {a.approver_email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-300">
                    <Shield className="w-4 h-4 text-slate-400" />
                    {a.role_name}
                  </span>
                  {a.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-500">
                      Nonaktif
                    </span>
                  )}
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Approver' : 'Tambah Approver'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role_id}
                  onChange={e => handleRoleSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Lv {r.level})
                    </option>
                  ))}
                </select>
                {form.role_name && (
                  <p className="text-xs text-slate-400 mt-1">
                    Role: <span className="font-mono">{form.role_name}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Approver
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.approver_name}
                    onChange={e =>
                      setForm({ ...form, approver_name: e.target.value })
                    }
                    placeholder="Nama lengkap approver"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.approver_email}
                    onChange={e =>
                      setForm({ ...form, approver_email: e.target.value })
                    }
                    placeholder="approver@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, is_active: !form.is_active })
                  }
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.is_active ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Approver aktif
                </span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

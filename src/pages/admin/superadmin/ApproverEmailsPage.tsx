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
  X,
  User,
  Shield,
  Info,
  CheckCircle2,
} from 'lucide-react';

// ---- Types matching the `role_approver_emails` table ----
// NOTE: columns are `approver_email` and `approver_name` (NOT `email` and `name`)
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

export default function ApproverEmailsPage() {
  const [approvers, setApprovers] = useState<RoleApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RoleApproverEmail | null>(null);
  const [form, setForm] = useState<ApproverForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchApprovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_approver_emails')
      .select(
        'id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at'
      )
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat approver emails: ' + error.message, 'error');
    } else {
      setApprovers((data ?? []) as unknown as RoleApproverEmail[]);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat roles: ' + error.message, 'error');
      return;
    }
    setRoles((data ?? []) as unknown as Role[]);
  }, []);

  useEffect(() => {
    fetchApprovers();
    fetchRoles();
  }, [fetchApprovers, fetchRoles]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: RoleApproverEmail) => {
    setEditing(a);
    setForm({
      role_id: a.role_id ?? '',
      role_name: a.role_name ?? '',
      approver_email: a.approver_email ?? '',
      approver_name: a.approver_name ?? '',
      is_active: a.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleRoleSelect = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    setForm(prev => ({
      ...prev,
      role_id: roleId,
      role_name: role?.name ?? '',
    }));
  };

  const handleSave = async () => {
    if (!form.role_id) {
      showToast('Role wajib dipilih', 'warning');
      return;
    }
    if (!form.approver_email.trim()) {
      showToast('Email approver wajib diisi', 'warning');
      return;
    }
    if (!form.approver_name.trim()) {
      showToast('Nama approver wajib diisi', 'warning');
      return;
    }

    const payload = {
      role_id: form.role_id,
      role_name: form.role_name,
      approver_email: form.approver_email.trim(),
      approver_name: form.approver_name.trim(),
      is_active: form.is_active,
    };

    setSaving(true);
    let error: { message: string } | null = null;
    if (editing) {
      const res = await supabase
        .from('role_approver_emails')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editing.id);
      error = res.error;
    } else {
      const res = await supabase.from('role_approver_emails').insert(payload);
      error = res.error;
    }
    setSaving(false);

    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
      return;
    }
    showToast(editing ? 'Approver diperbarui' : 'Approver ditambahkan', 'success');
    setShowModal(false);
    fetchApprovers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus approver email ini?')) return;
    const { error } = await supabase.from('role_approver_emails').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Approver dihapus', 'success');
    fetchApprovers();
  };

  const handleToggleActive = async (a: RoleApproverEmail) => {
    const next = !(a.is_active ?? false);
    const { error } = await supabase
      .from('role_approver_emails')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', a.id);
    if (error) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
      return;
    }
    showToast(next ? 'Approver diaktifkan' : 'Approver dinonaktifkan', 'success');
    setApprovers(prev =>
      prev.map(x => (x.id === a.id ? { ...x, is_active: next } : x))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-500" />
            Approver Emails
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola email approver untuk setiap role dalam alur persetujuan
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 justify-center">
          <Plus className="w-4 h-4" />
          Tambah Approver
        </button>
      </div>

      {/* Info banner */}
      <div className="card p-4 border-l-4 border-l-blue-500 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Tentang Approver Emails
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Email approver digunakan untuk mengirim notifikasi persetujuan. Setiap role dapat
            memiliki satu atau beberapa approver. Pilih role dari dropdown — field
            <span className="font-mono text-xs"> role_name </span>
            akan terisi otomatis.
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : approvers.length === 0 ? (
        <div className="card py-16 text-center text-slate-500 dark:text-slate-400">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Belum ada approver email</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {approvers.map(a => (
            <div
              key={a.id}
              className={cn(
                'card p-5 flex flex-col gap-3 transition-shadow hover:shadow-md',
                !(a.is_active ?? false) && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {a.role_name ?? 'Role tidak diketahui'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {a.role_id ?? '-'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(a)}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-medium transition-colors flex-shrink-0',
                    a.is_active
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  )}
                >
                  {a.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {a.approver_name ?? 'Tanpa nama'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400 truncate">
                    {a.approver_email ?? '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  onClick={() => openEdit(a)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editing ? 'Edit Approver' : 'Tambah Approver'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Role</label>
                <select
                  value={form.role_id}
                  onChange={e => handleRoleSelect(e.target.value)}
                  className="input"
                >
                  <option value="">Pilih role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  role_name akan diisi otomatis: <span className="font-mono">{form.role_name || '-'}</span>
                </p>
              </div>
              <div>
                <label className="label">Nama Approver</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.approver_name}
                    onChange={e => setForm({ ...form, approver_name: e.target.value })}
                    placeholder="Nama lengkap approver"
                    className="input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="label">Email Approver</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.approver_email}
                    onChange={e => setForm({ ...form, approver_email: e.target.value })}
                    placeholder="approver@example.com"
                    className="input pl-10"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {editing ? 'Simpan' : 'Tambah'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
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
  Info,
  ShieldCheck,
} from 'lucide-react';

interface ApproverEmail {
  id: string;
  role_id: string;
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
  const [approvers, setApprovers] = useState<ApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ApproverEmail | null>(null);
  const [form, setForm] = useState<ApproverForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [apprRes, roleRes] = await Promise.all([
      supabase.from('role_approver_emails').select('*').order('created_at', { ascending: false }),
      supabase.from('roles').select('id, name').eq('is_active', true).order('name', { ascending: true }),
    ]);

    if (apprRes.error) {
      showToast('Gagal memuat approver emails: ' + apprRes.error.message, 'error');
    } else {
      setApprovers((apprRes.data ?? []) as unknown as ApproverEmail[]);
    }
    if (roleRes.error) {
      showToast('Gagal memuat roles: ' + roleRes.error.message, 'error');
    } else {
      setRoles((roleRes.data ?? []) as unknown as Role[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: ApproverEmail) => {
    setEditing(a);
    setForm({
      role_id: a.role_id,
      role_name: a.role_name ?? '',
      approver_email: a.approver_email ?? '',
      approver_name: a.approver_name ?? '',
      is_active: a.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleRoleSelect = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    setForm(f => ({ ...f, role_id: roleId, role_name: role?.name ?? '' }));
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
    setSaving(true);
    const payload = {
      role_id: form.role_id,
      role_name: form.role_name,
      approver_email: form.approver_email.trim(),
      approver_name: form.approver_name.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from('role_approver_emails').update(payload).eq('id', editing.id);
      if (error) {
        showToast('Gagal memperbarui: ' + error.message, 'error');
      } else {
        showToast('Approver diperbarui', 'success');
        setShowModal(false);
        fetchAll();
      }
    } else {
      const insertPayload = { ...payload, created_at: new Date().toISOString() };
      const { error } = await supabase.from('role_approver_emails').insert(insertPayload);
      if (error) {
        showToast('Gagal menambah approver: ' + error.message, 'error');
      } else {
        showToast('Approver ditambahkan', 'success');
        setShowModal(false);
        fetchAll();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus approver email ini?')) return;
    const { error } = await supabase.from('role_approver_emails').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
    } else {
      showToast('Approver dihapus', 'success');
      fetchAll();
    }
  };

  const handleToggleActive = async (a: ApproverEmail) => {
    const next = !(a.is_active ?? false);
    const { error } = await supabase
      .from('role_approver_emails')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', a.id);
    if (error) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
    } else {
      showToast('Status diperbarui', 'success');
      setApprovers(prev => prev.map(x => (x.id === a.id ? { ...x, is_active: next } : x)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-500" />
            Approver Emails
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola email approver untuk setiap role
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Approver
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Email approver digunakan sistem untuk mengirim notifikasi persetujuan. Pastikan email yang
          terdaftar adalah email aktif dari pejabat yang berwenang.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : approvers.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Belum ada approver email
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {approvers.map(a => (
            <div
              key={a.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    a.is_active
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-slate-100 dark:bg-slate-700'
                  )}
                >
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                </div>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    a.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}
                >
                  {a.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  {a.role_name ?? 'Unknown Role'}
                </span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {a.approver_name ?? 'Tanpa Nama'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 flex-1">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{a.approver_email ?? '-'}</span>
              </p>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleToggleActive(a)}
                  className={cn(
                    'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    a.is_active
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                  )}
                >
                  {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button
                  onClick={() => openEdit(a)}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Approver' : 'Tambah Approver'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Role
                </label>
                <select
                  value={form.role_id}
                  onChange={e => handleRoleSelect(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih Role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Nama role akan otomatis terisi
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Approver
                </label>
                <input
                  type="text"
                  value={form.approver_name}
                  onChange={e => setForm({ ...form, approver_name: e.target.value })}
                  placeholder="Nama lengkap approver"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Approver
                </label>
                <input
                  type="email"
                  value={form.approver_email}
                  onChange={e => setForm({ ...form, approver_email: e.target.value })}
                  placeholder="approver@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

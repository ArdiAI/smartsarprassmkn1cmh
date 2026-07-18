import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Mail, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../utils/cn';

interface ApproverEmail {
  id: string;
  role_id: string | null;
  role_name: string | null;
  approver_email: string;
  approver_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<ApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ApproverEmail | null>(null);
  const [form, setForm] = useState<ApproverForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const canCreate = hasPermission('approver_emails', 'create');
  const canUpdate = hasPermission('approver_emails', 'update');
  const canDelete = hasPermission('approver_emails', 'delete');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aeRes, rolesRes] = await Promise.all([
        supabase.from('role_approver_emails').select('*').order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name').eq('is_active', true).order('name'),
      ]);
      if (aeRes.error) throw aeRes.error;
      if (rolesRes.error) throw rolesRes.error;
      setRows((aeRes.data ?? []) as unknown as ApproverEmail[]);
      setRoles((rolesRes.data ?? []) as unknown as Role[]);
    } catch (e) {
      showToast('Gagal memuat email approver', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (r: ApproverEmail) => {
    setEditing(r);
    setForm({
      role_id: r.role_id ?? '',
      role_name: r.role_name ?? '',
      approver_email: r.approver_email ?? '',
      approver_name: r.approver_name ?? '',
      is_active: r.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleRoleSelect = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    setForm((prev) => ({ ...prev, role_id: roleId, role_name: role?.name ?? '' }));
  };

  const handleSave = async () => {
    if (!form.approver_email.trim()) {
      showToast('Email approver wajib diisi', 'warning');
      return;
    }
    if (!form.role_id) {
      showToast('Pilih role terlebih dahulu', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        role_id: form.role_id,
        role_name: form.role_name.trim() || null,
        approver_email: form.approver_email.trim(),
        approver_name: form.approver_name.trim() || null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase
          .from('role_approver_emails')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        showToast('Email approver diperbarui', 'success');
      } else {
        const { error } = await supabase.from('role_approver_emails').insert(payload);
        if (error) throw error;
        showToast('Email approver ditambahkan', 'success');
      }
      closeModal();
      await loadData();
    } catch (e) {
      showToast('Gagal menyimpan: ' + (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: ApproverEmail) => {
    if (!confirm(`Hapus approver "${r.approver_email}"?`)) return;
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', r.id);
      if (error) throw error;
      showToast('Email approver dihapus', 'success');
      await loadData();
    } catch (e) {
      showToast('Gagal menghapus: ' + (e as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Approver</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola email approver per role</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Approver
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-800/40 dark:bg-brand-900/20 dark:text-brand-200">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Email approver digunakan untuk mengirim notifikasi persetujuan. Pilih role, dan email approver akan menerima
          permintaan persetujuan terkait.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Belum ada email approver.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Nama Approver</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      {r.role_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.approver_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {r.approver_email ?? ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-semibold',
                          r.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                        )}
                      >
                        {r.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <button
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-1 rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(r)}
                            className="inline-flex items-center gap-1 rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Approver' : 'Tambah Approver'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Role *</label>
                <select
                  value={form.role_id}
                  onChange={(e) => handleRoleSelect(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">— pilih role —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name ?? ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Nama Approver
                </label>
                <input
                  value={form.approver_name}
                  onChange={(e) => setForm({ ...form, approver_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Email Approver *
                </label>
                <input
                  type="email"
                  value={form.approver_email}
                  onChange={(e) => setForm({ ...form, approver_email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Aktif
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

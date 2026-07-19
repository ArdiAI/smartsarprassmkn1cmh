import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Mail, Info, X } from 'lucide-react';
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
  const canCreate = hasPermission('approver_emails', 'create');
  const canUpdate = hasPermission('approver_emails', 'update');
  const canDelete = hasPermission('approver_emails', 'delete');

  const [approvers, setApprovers] = useState<ApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ApproverEmail | null>(null);
  const [form, setForm] = useState<ApproverForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
      return;
    }
    setRoles((data ?? []) as unknown as Role[]);
  }, []);

  const loadApprovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_approver_emails')
      .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      showToast('Gagal memuat daftar email approver', 'error');
      return;
    }
    setApprovers((data ?? []) as unknown as ApproverEmail[]);
  }, []);

  useEffect(() => {
    loadApprovers();
    loadRoles();
  }, [loadApprovers, loadRoles]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: ApproverEmail) => {
    setEditing(a);
    setForm({
      role_id: a.role_id ?? '',
      role_name: a.role_name ?? '',
      approver_email: a.approver_email ?? '',
      approver_name: a.approver_name ?? '',
      is_active: a.is_active,
    });
    setShowModal(true);
  };

  const handleRoleChange = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    setForm({ ...form, role_id: roleId, role_name: role?.name ?? '' });
  };

  const handleSave = async () => {
    if (!form.approver_email.trim()) {
      showToast('Email approver wajib diisi', 'warning');
      return;
    }
    if (!form.role_id) {
      showToast('Role wajib dipilih', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        role_id: form.role_id,
        role_name: form.role_name,
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
        showToast('Email approver berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('role_approver_emails').insert(payload);
        if (error) throw error;
        showToast('Email approver berhasil ditambahkan', 'success');
      }
      await loadApprovers();
      setShowModal(false);
      setForm(emptyForm);
      setEditing(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan email approver';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: ApproverEmail) => {
    if (!confirm(`Hapus email approver "${a.approver_email}"?`)) return;
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', a.id);
      if (error) throw error;
      showToast('Email approver berhasil dihapus', 'success');
      await loadApprovers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus email approver';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Email Approver</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola daftar email approver per role.
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Tambah Email
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-300" />
        <p className="text-sm text-brand-800 dark:text-brand-200">
          Email approver akan menerima notifikasi ketika ada pengajuan yang memerlukan persetujuan
          sesuai role yang ditugaskan.
        </p>
      </div>

      <div className="card">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat...</p>
        ) : approvers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Belum ada email approver.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="pb-3 pr-4 font-semibold">Role</th>
                  <th className="pb-3 pr-4 font-semibold">Nama Approver</th>
                  <th className="pb-3 pr-4 font-semibold">Email</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 pr-4 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {approvers.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                        {a.role_name ?? '-'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100">
                      {a.approver_name ?? '-'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {a.approver_email ?? '-'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          a.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        {a.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate && (
                          <button
                            onClick={() => openEdit(a)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                            aria-label="Edit email approver"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(a)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            aria-label="Hapus email approver"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Email Approver' : 'Tambah Email Approver'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(emptyForm);
                  setEditing(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Role</label>
                <select
                  value={form.role_id}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="input"
                >
                  <option value="">Pilih role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nama Approver</label>
                <input
                  type="text"
                  value={form.approver_name}
                  onChange={(e) => setForm({ ...form, approver_name: e.target.value })}
                  className="input"
                  placeholder="Nama lengkap approver"
                />
              </div>
              <div>
                <label className="label">Email Approver</label>
                <input
                  type="email"
                  value={form.approver_email}
                  onChange={(e) => setForm({ ...form, approver_email: e.target.value })}
                  className="input"
                  placeholder="approver@sekolah.id"
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
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(emptyForm);
                  setEditing(null);
                }}
                className="btn-secondary"
              >
                Batal
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

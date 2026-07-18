import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Mail, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

interface ApproverEmail {
  id: string;
  role_id: string | null;
  role_name: string | null;
  approver_email: string;
  approver_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface Role {
  id: string;
  name: string;
  level: number;
}

interface ApproverForm {
  role_id: string;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
}

const emptyForm: ApproverForm = { role_id: '', approver_email: '', approver_name: '', is_active: true };

export default function ApproverEmailsPage() {
  const { hasPermission } = useAuth();
  const [approvers, setApprovers] = useState<ApproverEmail[]>([]);
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
      const [apprRes, rolesRes] = await Promise.all([
        supabase.from('role_approver_emails').select('*').order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name, level').eq('is_active', true).order('level', { ascending: false }),
      ]);
      if (apprRes.error) throw apprRes.error;
      if (rolesRes.error) throw rolesRes.error;
      setApprovers((apprRes.data ?? []) as unknown as ApproverEmail[]);
      setRoles((rolesRes.data ?? []) as unknown as Role[]);
    } catch (err) {
      showToast('Gagal memuat email approver: ' + (err as Error).message, 'error');
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

  const openEdit = (a: ApproverEmail) => {
    setEditing(a);
    setForm({
      role_id: a.role_id ?? '',
      approver_email: a.approver_email ?? '',
      approver_name: a.approver_name ?? '',
      is_active: a.is_active ?? true,
    });
    setShowModal(true);
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
      const role = roles.find((r) => r.id === form.role_id);
      const payload = {
        role_id: form.role_id,
        role_name: role?.name ?? null,
        approver_email: form.approver_email.trim(),
        approver_name: form.approver_name.trim() || null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('role_approver_emails').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Email approver berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('role_approver_emails').insert(payload);
        if (error) throw error;
        showToast('Email approver berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditing(null);
      await loadData();
    } catch (err) {
      showToast('Gagal menyimpan: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: ApproverEmail) => {
    if (!confirm(`Hapus approver "${a.approver_name ?? a.approver_email}"?`)) return;
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', a.id);
      if (error) throw error;
      showToast('Email approver berhasil dihapus', 'success');
      await loadData();
    } catch (err) {
      showToast('Gagal menghapus: ' + (err as Error).message, 'error');
    }
  };

  const handleToggle = async (a: ApproverEmail) => {
    try {
      const { error } = await supabase
        .from('role_approver_emails')
        .update({ is_active: !a.is_active, updated_at: new Date().toISOString() })
        .eq('id', a.id);
      if (error) throw error;
      showToast(`Approver ${!a.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      await loadData();
    } catch (err) {
      showToast('Gagal mengubah status: ' + (err as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Approver</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola email approver per role untuk notifikasi</p>
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

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-900/20">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
        <p className="text-sm text-brand-800 dark:text-brand-200">
          Email approver akan menerima notifikasi ketika ada pengajuan yang membutuhkan persetujuan pada role terkait.
        </p>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Memuat...</div>
        ) : approvers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada email approver.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Approver</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {approvers.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{a.approver_name ?? '-'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{a.approver_email ?? '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {a.role_name ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                          {a.role_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => canUpdate && handleToggle(a)}
                        disabled={!canUpdate}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          a.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                          canUpdate && 'cursor-pointer hover:opacity-80',
                          !canUpdate && 'cursor-not-allowed opacity-70',
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', a.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                        {a.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate && (
                          <button
                            onClick={() => openEdit(a)}
                            className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(a)}
                            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {!canUpdate && !canDelete && <span className="text-xs text-slate-400">-</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? 'Edit Approver' : 'Tambah Approver'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role <span className="text-red-500">*</span></label>
                <select
                  value={form.role_id}
                  onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Pilih role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} (Lv. {r.level})</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">Role name akan otomatis terisi sesuai role dipilih.</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email Approver <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.approver_email}
                    onChange={(e) => setForm({ ...form, approver_email: e.target.value })}
                    placeholder="approver@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Approver</label>
                <input
                  value={form.approver_name}
                  onChange={(e) => setForm({ ...form, approver_name: e.target.value })}
                  placeholder="Nama lengkap (opsional)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Approver aktif
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); setEditing(null); }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

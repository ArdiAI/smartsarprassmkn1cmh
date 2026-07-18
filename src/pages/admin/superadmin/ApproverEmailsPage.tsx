import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Mail, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

interface ApproverEmail {
  id: string;
  role_id: string;
  role_name: string;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
}

const emptyForm = {
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
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const canCreate = hasPermission('approver_emails', 'create');
  const canUpdate = hasPermission('approver_emails', 'update');
  const canDelete = hasPermission('approver_emails', 'delete');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_approver_emails')
        .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as unknown as ApproverEmail[]);
    } catch {
      showToast('Gagal memuat data approver', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('level', { ascending: false });
      if (error) throw error;
      setRoles((data ?? []) as unknown as Role[]);
    } catch {
      showToast('Gagal memuat daftar role', 'error');
    }
  };

  useEffect(() => {
    load();
    loadRoles();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (row: ApproverEmail) => {
    setEditing(row);
    setForm({
      role_id: row.role_id ?? '',
      role_name: row.role_name ?? '',
      approver_email: row.approver_email ?? '',
      approver_name: row.approver_name ?? '',
      is_active: row.is_active,
    });
    setShowModal(true);
  };

  const handleRoleChange = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    setForm({ ...form, role_id: roleId, role_name: role?.name ?? '' });
  };

  const handleSave = async () => {
    const approverEmail = form.approver_email.trim();
    const approverName = form.approver_name.trim();
    if (!approverEmail || !form.role_id) {
      showToast('Role dan email approver wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        role_id: form.role_id,
        role_name: form.role_name,
        approver_email: approverEmail,
        approver_name: approverName,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('role_approver_emails').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Approver berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('role_approver_emails').insert(payload);
        if (error) throw error;
        showToast('Approver berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      await load();
    } catch {
      showToast('Gagal menyimpan approver', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ApproverEmail) => {
    if (!confirm(`Hapus approver "${row.approver_email}"?`)) return;
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', row.id);
      if (error) throw error;
      showToast('Approver berhasil dihapus', 'success');
      await load();
    } catch {
      showToast('Gagal menghapus approver', 'error');
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Approver</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola daftar email approver per role.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Approver
          </button>
        )}
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Email approver akan menerima notifikasi persetujuan untuk role yang dipilih. Pastikan role yang dipilih sudah aktif.
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Nama Approver</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada data.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {r.role_name ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{r.approver_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {r.approver_email ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.is_active
                          ? 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }
                    >
                      {r.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {canUpdate && (
                        <button
                          onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(r)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Approver' : 'Tambah Approver'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Role</span>
                <select value={form.role_id} onChange={(e) => handleRoleChange(e.target.value)} className={inputCls}>
                  <option value="">— Pilih Role —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Nama Approver</span>
                <input
                  value={form.approver_name}
                  onChange={(e) => setForm({ ...form, approver_name: e.target.value })}
                  className={inputCls}
                  placeholder="Nama lengkap approver"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Email Approver</span>
                <input
                  type="email"
                  value={form.approver_email}
                  onChange={(e) => setForm({ ...form, approver_email: e.target.value })}
                  className={inputCls}
                  placeholder="approver@example.com"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Aktif</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Batal</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

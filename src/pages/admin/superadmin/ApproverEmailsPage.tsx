import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Mail,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  Info,
  User,
} from 'lucide-react';

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
  level: number;
}

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
  const [saving, setSaving] = useState(false);

  const [roleId, setRoleId] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [approverName, setApproverName] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [apvRes, roleRes] = await Promise.all([
        supabase
          .from('role_approver_emails')
          .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name, level').eq('is_active', true).order('level', { ascending: false }),
      ]);
      if (apvRes.error) throw apvRes.error;
      if (roleRes.error) throw roleRes.error;
      setApprovers((apvRes.data ?? []) as unknown as ApproverEmail[]);
      setRoles((roleRes.data ?? []) as unknown as Role[]);
    } catch {
      showToast('Gagal memuat data approver email', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditing(null);
    setRoleId('');
    setApproverEmail('');
    setApproverName('');
    setIsActive(true);
    setShowModal(true);
  };

  const openEdit = (a: ApproverEmail) => {
    setEditing(a);
    setRoleId(a.role_id);
    setApproverEmail(a.approver_email ?? '');
    setApproverName(a.approver_name ?? '');
    setIsActive(a.is_active);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!roleId) {
      showToast('Role wajib dipilih', 'warning');
      return;
    }
    if (!approverEmail.trim()) {
      showToast('Email approver wajib diisi', 'warning');
      return;
    }
    if (!approverName.trim()) {
      showToast('Nama approver wajib diisi', 'warning');
      return;
    }
    const role = roles.find((r) => r.id === roleId);
    if (!role) {
      showToast('Role tidak valid', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        role_id: role.id,
        role_name: role.name,
        approver_email: approverEmail.trim(),
        approver_name: approverName.trim(),
        is_active: isActive,
      };
      if (editing) {
        const { error } = await supabase.from('role_approver_emails').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Approver email berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('role_approver_emails').insert(payload);
        if (error) throw error;
        showToast('Approver email berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan approver email';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: ApproverEmail) => {
    if (!confirm(`Hapus approver email "${a.approver_email}" untuk role "${a.role_name}"?`)) return;
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', a.id);
      if (error) throw error;
      showToast('Approver email berhasil dihapus', 'success');
      fetchData();
    } catch {
      showToast('Gagal menghapus approver email', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approver Emails</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola email approver untuk setiap role
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Approver
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
        <p className="text-sm text-brand-800 dark:text-brand-300">
          Email approver digunakan untuk mengirim notifikasi persetujuan. Pastikan email yang terdaftar adalah email aktif dari pemangku role terkait.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : approvers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <Mail className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Belum ada approver email</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approvers.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/30">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{a.approver_name ?? '(tanpa nama)'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{a.role_name ?? 'tanpa role'}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    a.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  )}
                >
                  {a.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  {a.approver_email ?? '-'}
                </p>
                <p className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  {a.approver_name ?? '-'}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {canUpdate && (
                  <button
                    onClick={() => openEdit(a)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(a)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Approver Email' : 'Tambah Approver Email'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Pilih role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Level {r.level})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Approver</label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="Nama lengkap approver"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email Approver</label>
                <input
                  type="email"
                  value={approverEmail}
                  onChange={(e) => setApproverEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="approver@example.com"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="approver-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="approver-active" className="text-sm text-slate-700 dark:text-slate-300">
                  Aktif
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

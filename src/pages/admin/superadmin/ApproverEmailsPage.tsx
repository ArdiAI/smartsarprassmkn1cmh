import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Plus, Trash2, Loader2, Mail, Pencil, Check, Info, AtSign,
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
  level: number | null;
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
  const [editingApprover, setEditingApprover] = useState<ApproverEmail | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formRoleId, setFormRoleId] = useState('');
  const [formRoleName, setFormRoleName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchApprovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_approver_emails')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data approver email', 'error');
    } else {
      setApprovers((data as unknown as ApproverEmail[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat data role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchApprovers();
    fetchRoles();
  }, [fetchApprovers, fetchRoles]);

  const openCreate = () => {
    setEditingApprover(null);
    setFormRoleId('');
    setFormRoleName('');
    setFormEmail('');
    setFormName('');
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEdit = (approver: ApproverEmail) => {
    setEditingApprover(approver);
    setFormRoleId(approver.role_id);
    setFormRoleName(approver.role_name ?? '');
    setFormEmail(approver.approver_email ?? '');
    setFormName(approver.approver_name ?? '');
    setFormIsActive(approver.is_active ?? true);
    setShowModal(true);
  };

  const handleRoleChange = (roleId: string) => {
    setFormRoleId(roleId);
    const role = roles.find(r => r.id === roleId);
    setFormRoleName(role?.name ?? '');
  };

  const handleSave = async () => {
    if (editingApprover && !canUpdate) {
      showToast('Anda tidak memiliki izin untuk mengubah approver email', 'error');
      return;
    }
    if (!editingApprover && !canCreate) {
      showToast('Anda tidak memiliki izin untuk menambah approver email', 'error');
      return;
    }
    if (!formRoleId) {
      showToast('Role wajib dipilih', 'warning');
      return;
    }
    if (!formEmail.trim()) {
      showToast('Email approver wajib diisi', 'warning');
      return;
    }
    setActionLoading('save');
    try {
      const payload = {
        role_id: formRoleId,
        role_name: formRoleName || null,
        approver_email: formEmail.trim(),
        approver_name: formName.trim() || null,
        is_active: formIsActive,
      };

      if (editingApprover) {
        const { error } = await supabase
          .from('role_approver_emails')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingApprover.id);
        if (error) {
          showToast(`Gagal mengubah: ${error.message}`, 'error');
        } else {
          showToast('Approver email berhasil diperbarui', 'success');
          setShowModal(false);
          await fetchApprovers();
        }
      } else {
        const { error } = await supabase.from('role_approver_emails').insert(payload);
        if (error) {
          showToast(`Gagal menambah: ${error.message}`, 'error');
        } else {
          showToast('Approver email berhasil ditambahkan', 'success');
          setShowModal(false);
          await fetchApprovers();
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (approver: ApproverEmail) => {
    if (!canDelete) {
      showToast('Anda tidak memiliki izin untuk menghapus approver email', 'error');
      return;
    }
    if (!confirm(`Hapus approver email untuk "${approver.role_name ?? 'role'}"?`)) return;
    setActionLoading(`del-${approver.id}`);
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', approver.id);
      if (error) {
        showToast(`Gagal menghapus: ${error.message}`, 'error');
      } else {
        showToast('Approver email berhasil dihapus', 'success');
        await fetchApprovers();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AtSign className="w-6 h-6 text-blue-500" /> Approver Emails
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola email approver per role untuk notifikasi workflow
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Approver
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Email approver digunakan oleh sistem workflow untuk mengirim notifikasi ke pemberi persetujuan
          pada step yang sesuai dengan role. Pastikan email yang dimasukkan valid dan aktif.
        </p>
      </div>

      {approvers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <AtSign className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada approver email</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approvers.map(a => (
            <div key={a.id} className="card p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {a.approver_name ?? '(tanpa nama)'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{a.approver_email ?? '-'}</span>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                    a.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}
                >
                  {a.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-400">Role:</span>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {a.role_name ?? 'Role tidak dikenal'}
                </span>
              </div>

              {a.updated_at && (
                <p className="text-xs text-slate-400 mt-2">
                  Diperbarui: {new Date(a.updated_at).toLocaleDateString('id-ID')}
                </p>
              )}

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                {canUpdate && (
                  <button
                    onClick={() => openEdit(a)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(a)}
                    disabled={actionLoading === `del-${a.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 ml-auto"
                  >
                    {actionLoading === `del-${a.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingApprover ? 'Edit Approver Email' : 'Tambah Approver Email'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formRoleId}
                  onChange={e => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.level != null ? ` (Level ${r.level})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Nama role akan otomatis terisi: {formRoleName || '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Approver
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="contoh: Budi Santoso"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Email Approver <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="approver@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Approver aktif</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading === 'save'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

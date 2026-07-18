import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Plus, Pencil, Trash2, Loader2, Mail, User, Info, X, Check, MailCheck,
} from 'lucide-react';

interface ApproverEmail {
  id: string;
  role_id: string;
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
  is_active: boolean;
}

export default function ApproverEmailsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('approver_emails', 'create');
  const canUpdate = hasPermission('approver_emails', 'update');
  const canDelete = hasPermission('approver_emails', 'delete');

  const [approvers, setApprovers] = useState<ApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ApproverEmail | null>(null);
  const [formRoleId, setFormRoleId] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formActive, setFormActive] = useState(true);

  const fetchApprovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_approver_emails')
      .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data approver email', 'error');
      setLoading(false);
      return;
    }
    setApprovers((data as unknown as ApproverEmail[]) || []);
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level, is_active')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
      return;
    }
    setRoles((data as unknown as Role[]) || []);
  }, []);

  useEffect(() => {
    fetchApprovers();
    fetchRoles();
  }, [fetchApprovers, fetchRoles]);

  const openAdd = () => {
    setEditing(null);
    setFormRoleId('');
    setFormEmail('');
    setFormName('');
    setFormActive(true);
    setShowModal(true);
  };

  const openEdit = (a: ApproverEmail) => {
    setEditing(a);
    setFormRoleId(a.role_id ?? '');
    setFormEmail(a.approver_email ?? '');
    setFormName(a.approver_name ?? '');
    setFormActive(a.is_active);
    setShowModal(true);
  };

  const handleSave = async () => {
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
      const role = roles.find(r => r.id === formRoleId);
      const roleName = role?.name ?? null;
      const payload = {
        role_id: formRoleId,
        role_name: roleName,
        approver_email: formEmail.trim(),
        approver_name: formName.trim() || null,
        is_active: formActive,
      };

      if (editing) {
        const { error } = await supabase.from('role_approver_emails').update(payload).eq('id', editing.id);
        if (error) {
          showToast('Gagal memperbarui approver: ' + error.message, 'error');
          setActionLoading(null);
          return;
        }
        showToast('Approver berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('role_approver_emails').insert(payload);
        if (error) {
          showToast('Gagal menambah approver: ' + error.message, 'error');
          setActionLoading(null);
          return;
        }
        showToast('Approver berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      await fetchApprovers();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (a: ApproverEmail) => {
    if (!confirm(`Hapus approver "${a.approver_name ?? a.approver_email}"?`)) return;
    setActionLoading(`delete-${a.id}`);
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', a.id);
      if (error) {
        showToast('Gagal menghapus approver: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast('Approver berhasil dihapus', 'success');
      await fetchApprovers();
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
            <MailCheck className="w-6 h-6 text-blue-500" /> Email Approver
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola daftar email approver untuk setiap role
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Approver
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Email approver digunakan oleh sistem workflow untuk mengirim notifikasi ke pihak yang berwenang menyetujui peminjaman. Pastikan role dan email sesuai.
        </p>
      </div>

      {approvers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada approver email</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {approvers.map(a => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {a.approver_name ?? 'Tanpa Nama'}
                      </h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          a.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                        )}
                      >
                        {a.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {a.approver_email ?? '-'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Role: <span className="font-medium">{a.role_name ?? 'Tidak dikenal'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(a)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(a)}
                      disabled={actionLoading === `delete-${a.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === `delete-${a.id}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Approver' : 'Tambah Approver'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="label">Role <span className="text-red-500">*</span></label>
              <select
                value={formRoleId}
                onChange={e => setFormRoleId(e.target.value)}
                className="input"
              >
                <option value="">— Pilih Role —</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Lvl {r.level})</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Memilih role akan otomatis mengisi kolom role_name.
              </p>
            </div>
            <div>
              <label className="label">Email Approver <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder="approver@sekolah.sch.id"
                className="input"
              />
            </div>
            <div>
              <label className="label">Nama Approver</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Nama lengkap approver"
                className="input"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formActive}
                onChange={e => setFormActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Approver aktif</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
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

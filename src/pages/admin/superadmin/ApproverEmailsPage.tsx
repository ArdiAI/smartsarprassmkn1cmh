import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Mail, Plus, Search, Pencil, Trash2, X, Loader2, MailCheck, User, Shield, Info, MailOpen,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  level: number | null;
  is_active: boolean;
}

interface ApproverEmail {
  id: string;
  role_id: string;
  role_name: string;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface FormState {
  role_id: string;
  role_name: string;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
}

const emptyForm: FormState = {
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
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ApproverEmail | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    const { data } = await supabase
      .from('roles')
      .select('id, name, level, is_active')
      .eq('is_active', true)
      .order('level', { ascending: true, nullsFirst: false });
    if (data) setRoles(data as unknown as Role[]);
  }, []);

  const fetchApprovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_approver_emails')
      .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data approver', 'error');
      setLoading(false);
      return;
    }
    setApprovers((data as unknown as ApproverEmail[]) || []);
    setLoading(false);
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

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    setForm(f => ({
      ...f,
      role_id: roleId,
      role_name: role?.name ?? '',
    }));
  };

  const handleSave = async () => {
    if (!form.role_id || !form.role_name) {
      showToast('Role wajib dipilih', 'warning');
      return;
    }
    if (!form.approver_email.trim() || !form.approver_name.trim()) {
      showToast('Email dan nama approver wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        role_id: form.role_id,
        role_name: form.role_name,
        approver_email: form.approver_email.trim(),
        approver_name: form.approver_name.trim(),
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('role_approver_emails').update({
          ...payload,
          updated_at: new Date().toISOString(),
        }).eq('id', editing.id);
        if (error) {
          showToast('Gagal memperbarui approver: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        showToast('Approver berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('role_approver_emails').insert(payload);
        if (error) {
          showToast('Gagal menambahkan approver: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        showToast('Approver berhasil ditambahkan', 'success');
      }
      closeModal();
      await fetchApprovers();
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (a: ApproverEmail) => {
    setActionLoading(a.id);
    const { error } = await supabase
      .from('role_approver_emails')
      .update({ is_active: !a.is_active, updated_at: new Date().toISOString() })
      .eq('id', a.id);
    if (error) {
      showToast('Gagal mengubah status approver', 'error');
      setActionLoading(null);
      return;
    }
    showToast(`Approver ${!a.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    await fetchApprovers();
    setActionLoading(null);
  };

  const handleDelete = async (a: ApproverEmail) => {
    if (!confirm(`Hapus approver "${a.approver_name}" (${a.role_name})?`)) return;
    setActionLoading(a.id);
    const { error } = await supabase.from('role_approver_emails').delete().eq('id', a.id);
    if (error) {
      showToast('Gagal menghapus approver', 'error');
      setActionLoading(null);
      return;
    }
    showToast('Approver berhasil dihapus', 'success');
    await fetchApprovers();
    setActionLoading(null);
  };

  const filtered = approvers.filter(a => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      a.role_name?.toLowerCase().includes(q) ||
      a.approver_email?.toLowerCase().includes(q) ||
      a.approver_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MailCheck className="w-7 h-7 text-cyan-600" />
            Approver Emails
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola email approver untuk setiap role dalam alur persetujuan SMART SARPRAS
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={roles.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Tambah Approver
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">Cara kerja Approver Emails</p>
          <p className="text-xs mt-1">
            Saat pengajuan masuk ke langkah dengan role tertentu, sistem akan mencari approver aktif
            berdasarkan role tersebut dan mengirim notifikasi email ke alamat yang terdaftar di sini.
            Pastikan email yang dimasukkan valid dan aktif.
          </p>
        </div>
      </div>

      {roles.length === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Belum ada role aktif. Tambahkan role terlebih dahulu sebelum menambahkan approver.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari role, nama, atau email approver..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center">
          <MailCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada approver ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(a => (
            <div
              key={a.id}
              className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{a.approver_name || '-'}</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 mt-0.5">
                      <Shield className="w-3 h-3" /> {a.role_name || '-'}
                    </span>
                  </div>
                </div>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                  a.is_active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400',
                )}>
                  {a.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MailOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 truncate text-xs">{a.approver_email || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 truncate text-xs">{a.approver_name || '-'}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openEdit(a)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleToggleActive(a)}
                  disabled={actionLoading === a.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                >
                  {actionLoading === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                    a.is_active ? <Mail className="w-3.5 h-3.5" /> : <MailCheck className="w-3.5 h-3.5" />}
                  {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button
                  onClick={() => handleDelete(a)}
                  disabled={actionLoading === a.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MailCheck className="w-5 h-5 text-cyan-600" />
                {editing ? 'Edit Approver' : 'Tambah Approver Baru'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Shield className="w-4 h-4 text-slate-400" /> Role
                </label>
                <select
                  value={form.role_id}
                  onChange={e => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.level != null ? ` · L${r.level}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Memilih role akan otomatis mengisi nama role.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <User className="w-4 h-4 text-slate-400" /> Nama Approver
                </label>
                <input
                  type="text"
                  value={form.approver_name}
                  onChange={e => setForm(f => ({ ...f, approver_name: e.target.value }))}
                  placeholder="contoh: Budi Santoso"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Mail className="w-4 h-4 text-slate-400" /> Email Approver
                </label>
                <input
                  type="email"
                  value={form.approver_email}
                  onChange={e => setForm(f => ({ ...f, approver_email: e.target.value }))}
                  placeholder="approver@sekolah.sch.id"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.is_active ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600',
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    form.is_active ? 'translate-x-6' : 'translate-x-1',
                  )} />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">Approver aktif</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
                {editing ? 'Simpan Perubahan' : 'Tambah Approver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

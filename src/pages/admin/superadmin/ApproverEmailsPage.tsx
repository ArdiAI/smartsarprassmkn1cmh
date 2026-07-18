import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Mail, Plus, Pencil, Trash2, Loader2, RefreshCw, X, Info, User, CheckCircle, XCircle,
} from 'lucide-react';

interface ApproverEmail {
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
  const [approvers, setApprovers] = useState<ApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ApproverEmail | null>(null);
  const [form, setForm] = useState<ApproverForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchApprovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_approver_emails')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data approver', 'error');
    } else {
      setApprovers((data as unknown as ApproverEmail[]) || []);
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
      showToast('Gagal memuat daftar role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
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
      is_active: a.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleRoleSelect = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    setForm(f => ({
      ...f,
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
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw error;
        setApprovers(prev => prev.map(a => a.id === editing.id ? { ...a, ...payload } : a));
        showToast('Approver diperbarui', 'success');
      } else {
        const { data, error } = await supabase
          .from('role_approver_emails')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setApprovers(prev => [data as unknown as ApproverEmail, ...prev]);
        showToast('Approver ditambahkan', 'success');
      }
      setShowModal(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan approver';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: ApproverEmail) => {
    if (!confirm('Hapus approver ini?')) return;
    setDeletingId(a.id);
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', a.id);
      if (error) throw error;
      setApprovers(prev => prev.filter(x => x.id !== a.id));
      showToast('Approver dihapus', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus approver';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-500" />
            Email Approver
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola daftar email approver untuk setiap role
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchApprovers}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Muat ulang"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Approver
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Email approver digunakan sistem untuk mengirim notifikasi otomatis saat ada pengajuan
          yang memerlukan persetujuan. Pastikan email yang terdaftar adalah email aktif penanggung jawab.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : approvers.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada email approver terdaftar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {approvers.map(a => (
            <div
              key={a.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {a.approver_name ?? 'Tanpa Nama'}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      {a.role_name ?? 'Role tidak dikenal'}
                    </span>
                    {a.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        <XCircle className="w-3 h-3" /> Nonaktif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{a.approver_email ?? '-'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(a)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(a)}
                  disabled={deletingId === a.id}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                  title="Hapus"
                >
                  {deletingId === a.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Approver' : 'Tambah Approver'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role_id}
                  onChange={e => handleRoleSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih role</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {form.role_name && (
                  <p className="text-xs text-slate-400 mt-1">Nama role: {form.role_name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Approver
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.approver_name}
                    onChange={e => setForm(f => ({ ...f, approver_name: e.target.value }))}
                    placeholder="Nama lengkap approver"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Approver <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.approver_email}
                    onChange={e => setForm(f => ({ ...f, approver_email: e.target.value }))}
                    placeholder="approver@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Approver aktif</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

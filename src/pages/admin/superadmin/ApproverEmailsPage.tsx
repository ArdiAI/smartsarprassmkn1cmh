import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Mail, Plus, Trash2, Edit3, Loader2, X, CheckCircle2, Info, Shield, User,
} from 'lucide-react';

interface ApproverEmail {
  id: string;
  role_id: string | null;
  role_name: string | null;
  approver_email: string;
  approver_name: string;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchApprovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_approver_emails')
      .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data email approver', 'error');
      setLoading(false);
      return;
    }
    setApprovers((data as unknown as ApproverEmail[]) || []);
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
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
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: ApproverEmail) => {
    setEditing(a);
    setForm({
      role_id: a.role_id ?? '',
      approver_email: a.approver_email,
      approver_name: a.approver_name,
      is_active: a.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.approver_email.trim() || !form.approver_name.trim()) {
      showToast('Email dan nama approver wajib diisi', 'warning');
      return;
    }
    if (!form.role_id) {
      showToast('Pilih role terlebih dahulu', 'warning');
      return;
    }
    setSaving(true);
    try {
      const role = roles.find(r => r.id === form.role_id);
      const payload = {
        role_id: form.role_id,
        role_name: role?.name ?? null,
        approver_email: form.approver_email.trim(),
        approver_name: form.approver_name.trim(),
        is_active: form.is_active,
      };

      if (editing) {
        const { data, error } = await supabase
          .from('role_approver_emails')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
          .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at')
          .single();
        if (error) {
          showToast(`Gagal update: ${error.message}`, 'error');
          setSaving(false);
          return;
        }
        const updated = data as unknown as ApproverEmail;
        setApprovers(prev => prev.map(a => (a.id === editing.id ? updated : a)));
        showToast('Email approver diperbarui', 'success');
      } else {
        const { data, error } = await supabase
          .from('role_approver_emails')
          .insert(payload)
          .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at')
          .single();
        if (error) {
          showToast(`Gagal menambah: ${error.message}`, 'error');
          setSaving(false);
          return;
        }
        const created = data as unknown as ApproverEmail;
        setApprovers(prev => [created, ...prev]);
        showToast('Email approver ditambahkan', 'success');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: ApproverEmail) => {
    if (!confirm(`Hapus email approver "${a.approver_name}"?`)) return;
    setDeletingId(a.id);
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', a.id);
      if (error) {
        showToast('Gagal menghapus', 'error');
        setDeletingId(null);
        return;
      }
      setApprovers(prev => prev.filter(x => x.id !== a.id));
      showToast('Email approver dihapus', 'success');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (a: ApproverEmail) => {
    try {
      const { error } = await supabase
        .from('role_approver_emails')
        .update({ is_active: !a.is_active, updated_at: new Date().toISOString() })
        .eq('id', a.id);
      if (error) {
        showToast('Gagal mengubah status', 'error');
        return;
      }
      setApprovers(prev =>
        prev.map(x => (x.id === a.id ? { ...x, is_active: !x.is_active } : x))
      );
    } catch {
      showToast('Terjadi kesalahan', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-500" />
            Email Approver
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola email penanggung jawab approval per role</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah Email
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm">
          Email approver digunakan sistem workflow untuk mengirim notifikasi approval ke pihak yang berwenang sesuai role-nya.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : approvers.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada email approver</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {approvers.map(a => (
            <div
              key={a.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate flex items-center gap-2">
                    {a.approver_name}
                    {!a.is_active && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">Nonaktif</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{a.approver_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {a.role_name && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-medium">
                    <Shield className="w-3 h-3" /> {a.role_name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canUpdate && (
                  <>
                    <button
                      onClick={() => handleToggleActive(a)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(a)}
                    disabled={deletingId === a.id}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                    title="Hapus"
                  >
                    {deletingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Email Approver' : 'Tambah Email Approver'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Role *</label>
                <select
                  value={form.role_id}
                  onChange={e => setForm(prev => ({ ...prev, role_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Role akan otomatis mengisi role_name.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama Approver *</label>
                <input
                  type="text"
                  value={form.approver_name}
                  onChange={e => setForm(prev => ({ ...prev, approver_name: e.target.value }))}
                  placeholder="Nama lengkap approver"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email Approver *</label>
                <input
                  type="email"
                  value={form.approver_email}
                  onChange={e => setForm(prev => ({ ...prev, approver_email: e.target.value }))}
                  placeholder="approver@school.id"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Email aktif</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

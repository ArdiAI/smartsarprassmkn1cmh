import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Mail, Plus, Pencil, Trash2, X, Loader2, Search, Info, Shield,
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
  role?: { name: string } | null;
}

interface Role {
  id: string;
  name: string;
}

const emptyForm = {
  role_id: '',
  approver_email: '',
  approver_name: '',
  is_active: true,
};

export default function ApproverEmailsPage() {
  const { hasPermission } = useAuth();
  const [approvers, setApprovers] = useState<ApproverEmail[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ApproverEmail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission('approver_emails', 'create');
  const canUpdate = hasPermission('approver_emails', 'update');
  const canDelete = hasPermission('approver_emails', 'delete');

  const fetchApprovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_approver_emails')
      .select(`
        id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at,
        role:roles(name)
      `)
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
      .order('level', { ascending: false });
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

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (a: ApproverEmail) => {
    setForm({
      role_id: a.role_id ?? '',
      approver_email: a.approver_email ?? '',
      approver_name: a.approver_name ?? '',
      is_active: a.is_active ?? true,
    });
    setEditingId(a.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.role_id) {
      showToast('Role wajib dipilih', 'error');
      return;
    }
    if (!form.approver_email.trim()) {
      showToast('Email approver wajib diisi', 'error');
      return;
    }
    const selectedRole = roles.find(r => r.id === form.role_id);
    if (!selectedRole) {
      showToast('Role tidak valid', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      role_id: form.role_id,
      role_name: selectedRole.name,
      approver_email: form.approver_email.trim(),
      approver_name: form.approver_name.trim() || null,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from('role_approver_emails').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui approver: ' + error.message, 'error');
      } else {
        showToast('Approver diperbarui', 'success');
        setModalOpen(false);
        await fetchApprovers();
      }
    } else {
      const { error } = await supabase.from('role_approver_emails').insert(payload);
      if (error) {
        showToast('Gagal menambah approver: ' + error.message, 'error');
      } else {
        showToast('Approver ditambahkan', 'success');
        setModalOpen(false);
        await fetchApprovers();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('role_approver_emails').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('Gagal menghapus approver: ' + error.message, 'error');
    } else {
      showToast('Approver dihapus', 'success');
      setDeleteTarget(null);
      await fetchApprovers();
    }
    setDeleting(false);
  };

  const filtered = approvers.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.approver_email?.toLowerCase().includes(q) ||
      a.approver_name?.toLowerCase().includes(q) ||
      a.role_name?.toLowerCase().includes(q) ||
      a.role?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Approver</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola email penerima notifikasi persetujuan per role
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Approver
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Email approver akan menerima notifikasi ketika ada pengajuan yang memerlukan persetujuan pada role terkait. Pastikan email yang dimasukkan aktif dan valid.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari approver berdasarkan email, nama, atau role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada approver</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {a.approver_name ?? '(tanpa nama)'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {a.approver_email ?? '-'}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    a.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}
                >
                  {a.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  {a.role?.name ?? a.role_name ?? 'Role tidak diketahui'}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-end gap-1 border-t border-slate-100 dark:border-slate-700 pt-3">
                {canUpdate && (
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    title="Edit Approver"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setDeleteTarget(a)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Hapus Approver"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Approver' : 'Tambah Approver'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Role <span className="text-red-500">*</span></label>
                <select
                  value={form.role_id}
                  onChange={e => setForm({ ...form, role_id: e.target.value })}
                  className="input"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  Memilih role akan mengisi role_id dan role_name secara otomatis.
                </p>
              </div>
              <div>
                <label className="label">Email Approver <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.approver_email}
                  onChange={e => setForm({ ...form, approver_email: e.target.value })}
                  className="input"
                  placeholder="approver@sekolah.sch.id"
                />
              </div>
              <div>
                <label className="label">Nama Approver</label>
                <input
                  type="text"
                  value={form.approver_name}
                  onChange={e => setForm({ ...form, approver_name: e.target.value })}
                  className="input"
                  placeholder="Nama lengkap approver (opsional)"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Approver aktif</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Approver?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Approver <span className="font-medium">{deleteTarget.approver_name ?? deleteTarget.approver_email}</span> akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

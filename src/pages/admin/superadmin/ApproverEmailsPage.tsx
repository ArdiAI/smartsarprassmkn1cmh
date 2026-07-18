import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Mail, Plus, Pencil, Trash2, X, Loader2, Search, Info, User, Shield,
} from 'lucide-react';

interface ApproverEmail {
  id: string;
  role_id: string | null;
  role_name: string | null;
  approver_email: string | null;
  approver_name: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: string;
  name: string;
  level: number | null;
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
  const [deleteApprover, setDeleteApprover] = useState<ApproverEmail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission('approver_emails', 'create');
  const canUpdate = hasPermission('approver_emails', 'update');
  const canDelete = hasPermission('approver_emails', 'delete');

  const fetchApprovers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_approver_emails')
      .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat approver emails', 'error');
    } else {
      setApprovers((data as unknown as ApproverEmail[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat roles', 'error');
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
    setSaving(true);
    const role = roles.find(r => r.id === form.role_id);
    const payload = {
      role_id: form.role_id,
      role_name: role?.name ?? null,
      approver_email: form.approver_email.trim(),
      approver_name: form.approver_name.trim() || null,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from('role_approver_emails').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui approver', 'error');
      } else {
        showToast('Approver diperbarui', 'success');
        setModalOpen(false);
        await fetchApprovers();
      }
    } else {
      const { error } = await supabase.from('role_approver_emails').insert(payload);
      if (error) {
        showToast('Gagal menambah approver', 'error');
      } else {
        showToast('Approver ditambahkan', 'success');
        setModalOpen(false);
        await fetchApprovers();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteApprover) return;
    setDeleting(true);
    const { error } = await supabase.from('role_approver_emails').delete().eq('id', deleteApprover.id);
    if (error) {
      showToast('Gagal menghapus approver', 'error');
    } else {
      showToast('Approver dihapus', 'success');
      setDeleteApprover(null);
      await fetchApprovers();
    }
    setDeleting(false);
  };

  const filtered = approvers.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.role_name?.toLowerCase().includes(q) ||
      a.approver_email?.toLowerCase().includes(q) ||
      a.approver_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Approver</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola email approver per role untuk notifikasi approval
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
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Email approver digunakan sistem untuk mengirim notifikasi saat ada pengajuan yang memerlukan approval sesuai role.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari role, nama, atau email..."
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada approver email</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => {
            const isActive = a.is_active ?? false;
            return (
              <div key={a.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {a.approver_name || '(tanpa nama)'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {a.approver_email ?? '-'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                      isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    )}
                  >
                    {isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {a.role_name ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      <Shield className="w-3 h-3" /> {a.role_name}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs">
                      Tanpa role
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteApprover(a)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
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
                    <option key={r.id} value={r.id}>
                      {r.name}{r.level != null ? ` (Level ${r.level})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Memilih role akan otomatis mengisi role_name.
                </p>
              </div>
              <div>
                <label className="label">Nama Approver</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.approver_name}
                    onChange={e => setForm({ ...form, approver_name: e.target.value })}
                    className="input pl-10"
                    placeholder="Nama lengkap approver"
                  />
                </div>
              </div>
              <div>
                <label className="label">Email Approver <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.approver_email}
                    onChange={e => setForm({ ...form, approver_email: e.target.value })}
                    className="input pl-10"
                    placeholder="approver@sekolah.id"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                  />
                  Aktif
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 btn-primary"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteApprover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteApprover(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Approver?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Approver <span className="font-medium text-slate-900 dark:text-white">{deleteApprover.approver_name || deleteApprover.approver_email}</span> untuk role {deleteApprover.role_name ?? '-'} akan dihapus.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteApprover(null)} className="btn-secondary">Batal</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

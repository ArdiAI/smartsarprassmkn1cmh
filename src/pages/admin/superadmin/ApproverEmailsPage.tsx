import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  MailCheck, Plus, Trash2, Loader2, Search, X, Save, Pencil, Info, ShieldCheck, Power,
} from 'lucide-react';

interface RoleRow {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
}

interface ApproverEmailRow {
  id: string;
  role_id: string;
  role_name: string | null;
  approver_email: string;
  approver_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export default function ApproverEmailsPage() {
  const { hasPermission } = useAuth();
  const [approvers, setApprovers] = useState<ApproverEmailRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    role_id: '',
    approver_email: '',
    approver_name: '',
    is_active: true,
  });

  const canCreate = hasPermission('approver_emails', 'create');
  const canUpdate = hasPermission('approver_emails', 'update');
  const canDelete = hasPermission('approver_emails', 'delete');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: apprData }, { data: roleData }] = await Promise.all([
      supabase
        .from('role_approver_emails')
        .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at')
        .order('created_at', { ascending: false }),
      supabase.from('roles').select('id, name, level, is_active').eq('is_active', true).order('level', { ascending: false }),
    ]);

    setApprovers((apprData as unknown as ApproverEmailRow[]) || []);
    setRoles((roleData as unknown as RoleRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRoleName = (roleId: string, fallback: string | null): string => {
    const r = roles.find(x => x.id === roleId);
    return r?.name ?? fallback ?? '—';
  };

  const filteredApprovers = approvers.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.approver_email?.toLowerCase().includes(q) ||
      a.approver_name?.toLowerCase().includes(q) ||
      (a.role_name ?? '').toLowerCase().includes(q) ||
      getRoleName(a.role_id, a.role_name).toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setForm({ role_id: '', approver_email: '', approver_name: '', is_active: true });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (a: ApproverEmailRow) => {
    setEditingId(a.id);
    setForm({
      role_id: a.role_id,
      approver_email: a.approver_email ?? '',
      approver_name: a.approver_name ?? '',
      is_active: a.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (editingId && !canUpdate) return;
    if (!editingId && !canCreate) return;
    if (!form.role_id) {
      showToast('Role wajib dipilih', 'error');
      return;
    }
    if (!form.approver_email.trim()) {
      showToast('Email approver wajib diisi', 'error');
      return;
    }
    if (!form.approver_name.trim()) {
      showToast('Nama approver wajib diisi', 'error');
      return;
    }
    // basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.approver_email.trim())) {
      showToast('Format email tidak valid', 'error');
      return;
    }

    const role = roles.find(r => r.id === form.role_id);
    const roleName = role?.name ?? '';

    setSaving(true);
    try {
      const payload = {
        role_id: form.role_id,
        role_name: roleName,
        approver_email: form.approver_email.trim(),
        approver_name: form.approver_name.trim(),
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from('role_approver_emails')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        setApprovers(prev => prev.map(x => (x.id === editingId ? { ...x, ...payload, updated_at: new Date().toISOString() } : x)));
        showToast('Approver berhasil diperbarui', 'success');
      } else {
        const { data: newRow, error } = await supabase
          .from('role_approver_emails')
          .insert(payload)
          .select('id, role_id, role_name, approver_email, approver_name, is_active, created_at, updated_at')
          .single();
        if (error) throw error;
        const created = newRow as unknown as ApproverEmailRow;
        setApprovers(prev => [created, ...prev]);
        showToast('Approver berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      showToast(`Gagal menyimpan: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (a: ApproverEmailRow) => {
    if (!canUpdate) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('role_approver_emails')
        .update({ is_active: !a.is_active, updated_at: new Date().toISOString() })
        .eq('id', a.id);
      if (error) throw error;
      setApprovers(prev => prev.map(x => (x.id === a.id ? { ...x, is_active: !x.is_active } : x)));
      showToast(`Approver ${!a.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } catch (e: any) {
      showToast(`Gagal: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: ApproverEmailRow) => {
    if (!canDelete) return;
    if (!confirm(`Hapus approver "${a.approver_name}" (${a.approver_email})?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('role_approver_emails').delete().eq('id', a.id);
      if (error) throw error;
      setApprovers(prev => prev.filter(x => x.id !== a.id));
      showToast('Approver berhasil dihapus', 'success');
    } catch (e: any) {
      showToast(`Gagal menghapus: ${e.message}`, 'error');
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Email Approver</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola daftar email approver per role untuk notifikasi workflow
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

      <div className="flex items-start gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Email approver digunakan sistem untuk mengirim notifikasi ke langkah berikutnya dalam workflow approval. Pilih role, dan nama serta email role akan terisi otomatis.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama, email, atau role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Approver</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">
                    <MailCheck className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Belum ada email approver
                  </td>
                </tr>
              ) : (
                filteredApprovers.map(a => (
                  <tr key={a.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{a.approver_name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{a.approver_email ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <ShieldCheck className="w-3 h-3" /> {getRoleName(a.role_id, a.role_name)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-medium',
                        a.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                      )}>
                        {a.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {canUpdate && (
                          <>
                            <button
                              onClick={() => openEdit(a)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(a)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs font-medium transition-colors disabled:opacity-50"
                              title={a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(a)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
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
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Approver' : 'Tambah Approver'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                <select
                  value={form.role_id}
                  onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Approver *</label>
                <input
                  type="text"
                  value={form.approver_name}
                  onChange={e => setForm(f => ({ ...f, approver_name: e.target.value }))}
                  placeholder="Nama lengkap approver"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Approver *</label>
                <input
                  type="email"
                  value={form.approver_email}
                  onChange={e => setForm(f => ({ ...f, approver_email: e.target.value }))}
                  placeholder="approver@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50',
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Perbarui' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Shield, Plus, Search, Pencil, Trash2, X, Loader2, Lock, ShieldCheck, ShieldOff, Layers,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

interface FormState {
  name: string;
  description: string;
  level: string;
  is_active: boolean;
}

const emptyForm: FormState = { name: '', description: '', level: '', is_active: true };

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description, level, is_system, is_active, created_at')
      .order('level', { ascending: true, nullsFirst: false });
    if (error) {
      showToast('Gagal memuat data role', 'error');
      setLoading(false);
      return;
    }
    setRoles((data as unknown as Role[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setForm({
      name: r.name ?? '',
      description: r.description ?? '',
      level: r.level != null ? String(r.level) : '',
      is_active: r.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama role wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        level: form.level.trim() !== '' ? Number(form.level) : null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('roles').update(payload).eq('id', editing.id);
        if (error) {
          showToast('Gagal memperbarui role: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        showToast('Role berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('roles').insert({ ...payload, is_system: false });
        if (error) {
          showToast('Gagal menambahkan role: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        showToast('Role berhasil ditambahkan', 'success');
      }
      closeModal();
      await fetchRoles();
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (r: Role) => {
    setActionLoading(r.id);
    const { error } = await supabase.from('roles').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) {
      showToast('Gagal mengubah status role', 'error');
      setActionLoading(null);
      return;
    }
    showToast(`Role ${!r.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    await fetchRoles();
    setActionLoading(null);
  };

  const handleDelete = async (r: Role) => {
    if (r.is_system) {
      showToast('Role sistem tidak dapat dihapus', 'warning');
      return;
    }
    if (!confirm(`Hapus role "${r.name}"?`)) return;
    setActionLoading(r.id);
    const { error } = await supabase.from('roles').delete().eq('id', r.id);
    if (error) {
      showToast('Gagal menghapus role: ' + error.message, 'error');
      setActionLoading(null);
      return;
    }
    showToast('Role berhasil dihapus', 'success');
    await fetchRoles();
    setActionLoading(null);
  };

  const filtered = roles.filter(r => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  });

  const levelColor = (level: number | null) => {
    if (level == null) return 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300';
    if (level >= 90) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    if (level >= 70) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (level >= 50) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-cyan-600" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola daftar role dan level akses dalam sistem SMART SARPRAS
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Tambah Role
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau deskripsi role..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada role ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(r => (
            <div
              key={r.id}
              className={cn(
                'rounded-2xl bg-white dark:bg-slate-800 border p-5 shadow-sm hover:shadow-md transition-shadow',
                r.is_active
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-slate-200 dark:border-slate-700 opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0',
                    r.is_system
                      ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
                  )}>
                    {r.is_system ? <Lock className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{r.name || '-'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {r.level != null && (
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', levelColor(r.level))}>
                          Level {r.level}
                        </span>
                      )}
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        r.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400',
                      )}>
                        {r.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
                {r.description || 'Tidak ada deskripsi'}
              </p>

              <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openEdit(r)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleToggleActive(r)}
                  disabled={actionLoading === r.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                >
                  {actionLoading === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                    r.is_active ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {r.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button
                  onClick={() => handleDelete(r)}
                  disabled={actionLoading === r.id || r.is_system}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title={r.is_system ? 'Role sistem tidak dapat dihapus' : 'Hapus role'}
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
                <Shield className="w-5 h-5 text-cyan-600" />
                {editing ? 'Edit Role' : 'Tambah Role Baru'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Role</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="contoh: wakasek sarpras"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi singkat role..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Layers className="w-4 h-4 text-slate-400" /> Level (angka, semakin tinggi semakin tinggi aksesnya)
                </label>
                <input
                  type="number"
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                  placeholder="contoh: 50"
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
                <span className="text-sm text-slate-700 dark:text-slate-300">Role aktif</span>
              </label>

              {editing?.is_system && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Role sistem. Nama dan level dapat diubah, namun role tidak dapat dihapus.
                  </p>
                </div>
              )}
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {editing ? 'Simpan Perubahan' : 'Tambah Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

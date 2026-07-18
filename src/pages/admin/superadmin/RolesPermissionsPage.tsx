import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Shield, Plus, Pencil, Trash2, Loader2, RefreshCw, Lock, X, Layers,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number | null;
  is_system: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface RoleForm {
  name: string;
  description: string;
  level: number;
  is_active: boolean;
}

const emptyForm: RoleForm = {
  name: '',
  description: '',
  level: 0,
  is_active: true,
};

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
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

  const openEdit = (role: Role) => {
    setEditing(role);
    setForm({
      name: role.name ?? '',
      description: role.description ?? '',
      level: role.level ?? 0,
      is_active: role.is_active ?? true,
    });
    setShowModal(true);
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
        level: form.level,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase
          .from('roles')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        setRoles(prev => prev.map(r => r.id === editing.id ? { ...r, ...payload } : r));
        showToast('Role diperbarui', 'success');
      } else {
        const { data, error } = await supabase
          .from('roles')
          .insert({ ...payload, is_system: false })
          .select()
          .single();
        if (error) throw error;
        setRoles(prev => [...prev, data as unknown as Role]);
        showToast('Role ditambahkan', 'success');
      }
      setShowModal(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan role';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system) {
      showToast('Role sistem tidak dapat dihapus', 'warning');
      return;
    }
    if (!confirm(`Hapus role "${role.name}"?`)) return;
    setDeletingId(role.id);
    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;
      setRoles(prev => prev.filter(r => r.id !== role.id));
      showToast('Role dihapus', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus role';
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
            <Shield className="w-6 h-6 text-blue-500" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola peran dan tingkat akses dalam sistem
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchRoles}
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
            Tambah Role
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada role</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div
              key={role.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    role.is_system
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  )}>
                    {role.is_system ? (
                      <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {role.name ?? 'Tanpa Nama'}
                    </h3>
                    <p className="text-xs text-slate-400">Level {role.level ?? 0}</p>
                  </div>
                </div>
                {role.is_active ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex-shrink-0">
                    Aktif
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 flex-shrink-0">
                    Nonaktif
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 min-h-[2.5rem]">
                {role.description ?? 'Tidak ada deskripsi'}
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openEdit(role)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm font-medium"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(role)}
                  disabled={role.is_system || deletingId === role.id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  title={role.is_system ? 'Role sistem tidak dapat dihapus' : 'Hapus role'}
                >
                  {deletingId === role.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Hapus
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
                {editing ? 'Edit Role' : 'Tambah Role Baru'}
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
                  Nama Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: sarpras_admin"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Deskripsi singkat role"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Level</label>
                <input
                  type="number"
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Role aktif</span>
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

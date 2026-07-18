import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Lock, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../utils/cn';

interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

interface RoleForm {
  name: string;
  description: string;
  level: number;
  is_active: boolean;
}

const emptyForm: RoleForm = { name: '', description: '', level: 1, is_active: true };

export default function RolesPermissionsPage() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const canCreate = hasPermission('roles', 'create');
  const canUpdate = hasPermission('roles', 'update');
  const canDelete = hasPermission('roles', 'delete');

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('level', { ascending: false });
      if (error) throw error;
      setRoles((data ?? []) as unknown as Role[]);
    } catch (e) {
      showToast('Gagal memuat roles', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

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
      level: r.level ?? 1,
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
        level: Number(form.level) || 1,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('roles').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Role diperbarui', 'success');
      } else {
        const { error } = await supabase.from('roles').insert({ ...payload, is_system: false });
        if (error) throw error;
        showToast('Role ditambahkan', 'success');
      }
      closeModal();
      await loadRoles();
    } catch (e) {
      showToast('Gagal menyimpan: ' + (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: Role) => {
    if (r.is_system) {
      showToast('Role sistem tidak dapat dihapus', 'warning');
      return;
    }
    if (!confirm(`Hapus role "${r.name}"?`)) return;
    try {
      const { error } = await supabase.from('roles').delete().eq('id', r.id);
      if (error) throw error;
      showToast('Role dihapus', 'success');
      await loadRoles();
    } catch (e) {
      showToast('Gagal menghapus: ' + (e as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola role admin dan level aksesnya</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Role
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Memuat…
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Belum ada role.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{r.name ?? ''}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Level {r.level ?? 0}</p>
                  </div>
                </div>
                {r.is_system && (
                  <Lock className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <p className="mt-3 min-h-[2.5rem] text-sm text-slate-600 dark:text-slate-300">
                {r.description ?? '—'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-semibold',
                    r.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                  )}
                >
                  {r.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                {r.is_system && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Sistem
                  </span>
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {canUpdate && (
                  <button
                    onClick={() => openEdit(r)}
                    className="inline-flex items-center gap-1 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {canDelete && !r.is_system && (
                  <button
                    onClick={() => handleDelete(r)}
                    className="inline-flex items-center gap-1 rounded-lg p-2 text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Role' : 'Tambah Role'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Nama Role *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={editing?.is_system}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Level</label>
                <input
                  type="number"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Aktif
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

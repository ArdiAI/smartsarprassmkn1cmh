import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

const emptyForm = { name: '', description: '', level: 0, is_active: true };

export default function RolesPermissionsPage() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const canCreate = hasPermission('roles', 'create');
  const canUpdate = hasPermission('roles', 'update');
  const canDelete = hasPermission('roles', 'delete');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, level, is_system, is_active, created_at')
        .order('level', { ascending: false });
      if (error) throw error;
      setRoles((data ?? []) as unknown as Role[]);
    } catch {
      showToast('Gagal memuat data role', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
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
      is_active: role.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      showToast('Nama role wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('roles')
          .update({
            name,
            description: form.description.trim(),
            level: Number(form.level) || 0,
            is_active: form.is_active,
          })
          .eq('id', editing.id);
        if (error) throw error;
        showToast('Role berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('roles').insert({
          name,
          description: form.description.trim(),
          level: Number(form.level) || 0,
          is_active: form.is_active,
          is_system: false,
        });
        if (error) throw error;
        showToast('Role berhasil dibuat', 'success');
      }
      setShowModal(false);
      await load();
    } catch {
      showToast('Gagal menyimpan role', 'error');
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
    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;
      showToast('Role berhasil dihapus', 'success');
      await load();
    } catch {
      showToast('Gagal menghapus role', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola role yang tersedia untuk admin.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Role
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-slate-400">Memuat…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {role.name ?? '—'}
                  </h3>
                  <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    Level {role.level ?? 0}
                  </span>
                </div>
                {role.is_system && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Lock className="h-3 w-3" /> Sistem
                  </span>
                )}
              </div>
              <p className="mb-4 min-h-[2.5rem] text-sm text-slate-500 dark:text-slate-400">
                {role.description ?? 'Tidak ada deskripsi.'}
              </p>
              <div className="flex items-center justify-between">
                <span
                  className={
                    role.is_active
                      ? 'inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400'
                      : 'inline-flex items-center gap-1 text-xs font-medium text-slate-400'
                  }
                >
                  {role.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <div className="flex gap-2">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(role)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                  {canDelete && !role.is_system && (
                    <button
                      onClick={() => handleDelete(role)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Role' : 'Tambah Role'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Nama Role</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="Mis. Super Admin"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Deskripsi</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="Deskripsi singkat role"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Level</span>
                <input
                  type="number"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Aktif</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Batal</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Lock, ShieldCheck, X } from 'lucide-react';
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
  level: string;
  is_active: boolean;
}

const emptyForm: RoleForm = { name: '', description: '', level: '0', is_active: true };

export default function RolesPermissionsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('roles', 'create');
  const canUpdate = hasPermission('roles', 'update');
  const canDelete = hasPermission('roles', 'delete');

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description, level, is_system, is_active, created_at')
      .order('level', { ascending: false });
    setLoading(false);
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
      return;
    }
    setRoles((data ?? []) as unknown as Role[]);
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

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
      level: String(role.level ?? 0),
      is_active: role.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama role wajib diisi', 'warning');
      return;
    }
    const levelNum = Number(form.level);
    if (Number.isNaN(levelNum)) {
      showToast('Level harus berupa angka', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        level: levelNum,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('roles').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Role berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('roles').insert({ ...payload, is_system: false });
        if (error) throw error;
        showToast('Role berhasil ditambahkan', 'success');
      }
      await loadRoles();
      setShowModal(false);
      setForm(emptyForm);
      setEditing(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan role';
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
    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;
      showToast('Role berhasil dihapus', 'success');
      await loadRoles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus role';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Roles &amp; Permissions</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola daftar role yang tersedia untuk admin.
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Tambah Role
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Memuat...</p>
      ) : roles.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">Belum ada role.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={role.id} className="card flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{role.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Level {role.level}</p>
                  </div>
                </div>
                {role.is_system && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Lock className="h-3 w-3" />
                    Sistem
                  </span>
                )}
              </div>

              <p className="mt-3 flex-1 text-sm text-slate-600 dark:text-slate-300">
                {role.description ?? '-'}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    role.is_active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                  )}
                >
                  {role.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <div className="flex items-center gap-1">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(role)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                      aria-label="Edit role"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && !role.is_system && (
                    <button
                      onClick={() => handleDelete(role)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      aria-label="Hapus role"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Role' : 'Tambah Role'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(emptyForm);
                  setEditing(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nama Role</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="contoh: Operator"
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Deskripsi singkat role"
                />
              </div>
              <div>
                <label className="label">Level</label>
                <input
                  type="number"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  className="input"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-slate-400">Semakin tinggi level, semakin tinggi hierarki.</p>
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
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(emptyForm);
                  setEditing(null);
                }}
                className="btn-secondary"
              >
                Batal
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

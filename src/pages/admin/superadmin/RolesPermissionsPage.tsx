import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Lock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

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

const emptyForm: RoleForm = { name: '', description: '', level: 0, is_active: true };

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
    } catch (err) {
      showToast('Gagal memuat roles: ' + (err as Error).message, 'error');
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
      level: r.level ?? 0,
      is_active: r.is_active ?? true,
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
        level: Number(form.level) || 0,
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
      setShowModal(false);
      setForm(emptyForm);
      setEditing(null);
      await loadRoles();
    } catch (err) {
      showToast('Gagal menyimpan role: ' + (err as Error).message, 'error');
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
      showToast('Role berhasil dihapus', 'success');
      await loadRoles();
    } catch (err) {
      showToast('Gagal menghapus role: ' + (err as Error).message, 'error');
    }
  };

  const levelColor = (level: number): string => {
    if (level >= 80) return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (level >= 50) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    if (level >= 20) return 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles &amp; Permissions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola role admin dan tingkat aksesnya</p>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Memuat...
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Belum ada role.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <div
              key={r.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {r.is_system ? (
                    <Lock className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-brand-500" />
                  )}
                  <h3 className="font-semibold text-slate-900 dark:text-white">{r.name ?? '-'}</h3>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', levelColor(r.level ?? 0))}>
                  Lv. {r.level ?? 0}
                </span>
              </div>

              <p className="mb-4 flex-1 text-sm text-slate-500 dark:text-slate-400">
                {r.description ?? 'Tidak ada deskripsi'}
              </p>

              <div className="mb-4 flex items-center gap-2">
                {r.is_system && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <Lock className="h-3 w-3" /> Sistem
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    r.is_active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', r.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                  {r.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {canUpdate && (
                  <button
                    onClick={() => openEdit(r)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                {canDelete && !r.is_system && (
                  <button
                    onClick={() => handleDelete(r)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </button>
                )}
                {canDelete && r.is_system && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <ShieldAlert className="h-3.5 w-3.5" /> Terkunci
                  </span>
                )}
                {!canUpdate && !canDelete && (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? 'Edit Role' : 'Tambah Role'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Role <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="contoh: Admin Fasilitas"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi singkat role"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Level (0-100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-slate-400">Semakin tinggi level, semakin tinggi aksesnya.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Role aktif
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); setEditing(null); }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

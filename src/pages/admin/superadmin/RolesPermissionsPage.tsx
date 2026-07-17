import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Lock,
  X,
  ShieldCheck,
  Star,
} from 'lucide-react';

// ---- Types matching the `roles` table ----
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
  level: string;
  is_active: boolean;
}

const emptyForm: RoleForm = {
  name: '',
  description: '',
  level: '0',
  is_active: true,
};

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description, level, is_system, is_active, created_at')
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat roles: ' + error.message, 'error');
    } else {
      setRoles((data ?? []) as unknown as Role[]);
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
      level: String(role.level ?? 0),
      is_active: role.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama role wajib diisi', 'warning');
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      level: parseInt(form.level, 10) || 0,
      is_active: form.is_active,
    };

    setSaving(true);
    let error: { message: string } | null = null;
    if (editing) {
      const res = await supabase
        .from('roles')
        .update(payload)
        .eq('id', editing.id);
      error = res.error;
    } else {
      const res = await supabase.from('roles').insert(payload);
      error = res.error;
    }
    setSaving(false);

    if (error) {
      showToast('Gagal menyimpan role: ' + error.message, 'error');
      return;
    }
    showToast(editing ? 'Role diperbarui' : 'Role ditambahkan', 'success');
    setShowModal(false);
    fetchRoles();
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system) {
      showToast('Role sistem tidak dapat dihapus', 'warning');
      return;
    }
    if (!confirm(`Hapus role "${role.name}"?`)) return;
    const { error } = await supabase.from('roles').delete().eq('id', role.id);
    if (error) {
      showToast('Gagal menghapus role: ' + error.message, 'error');
      return;
    }
    showToast('Role dihapus', 'success');
    fetchRoles();
  };

  const handleToggleActive = async (role: Role) => {
    const next = !(role.is_active ?? false);
    const { error } = await supabase
      .from('roles')
      .update({ is_active: next })
      .eq('id', role.id);
    if (error) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
      return;
    }
    showToast(next ? 'Role diaktifkan' : 'Role dinonaktifkan', 'success');
    setRoles(prev =>
      prev.map(r => (r.id === role.id ? { ...r, is_active: next } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola peran dan tingkat akses dalam sistem
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 justify-center">
          <Plus className="w-4 h-4" />
          Tambah Role
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : roles.length === 0 ? (
        <div className="card py-16 text-center text-slate-500 dark:text-slate-400">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Belum ada role</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div
              key={role.id}
              className={cn(
                'card p-5 flex flex-col gap-3 transition-shadow hover:shadow-md',
                !(role.is_active ?? false) && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      role.is_system
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    {role.is_system ? (
                      <Lock className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Shield className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {role.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Star className="w-3 h-3" />
                      Level {role.level ?? 0}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(role)}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-medium transition-colors',
                    role.is_active
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  )}
                >
                  {role.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 flex-1 min-h-[2.5rem]">
                {role.description ?? 'Tidak ada deskripsi'}
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  onClick={() => openEdit(role)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(role)}
                  disabled={role.is_system ?? false}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    role.is_system
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  )}
                  title={role.is_system ? 'Role sistem tidak dapat dihapus' : 'Hapus role'}
                  
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editing ? 'Edit Role' : 'Tambah Role'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Nama Role</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="contoh: superadmin"
                  className="input"
                  disabled={editing?.is_system ?? false}
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi singkat role..."
                  rows={3}
                  className="input resize-none"
                />
              </div>
              <div>
                <label className="label">Level</label>
                <input
                  type="number"
                  value={form.level}
                  onChange={e => setForm({ ...form, level: e.target.value })}
                  min={0}
                  className="input"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Angka lebih kecil = level lebih tinggi
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>{editing ? 'Simpan' : 'Tambah'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Loader2,
  X,
  Star,
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

  const fetchRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat roles: ' + error.message, 'error');
    } else {
      setRoles((data ?? []) as unknown as Role[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

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
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      level: parseInt(form.level, 10) || 0,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from('roles').update(payload).eq('id', editing.id);
      if (error) {
        showToast('Gagal memperbarui role: ' + error.message, 'error');
      } else {
        showToast('Role berhasil diperbarui', 'success');
        setShowModal(false);
        fetchRoles();
      }
    } else {
      const { error } = await supabase.from('roles').insert(payload);
      if (error) {
        showToast('Gagal menambah role: ' + error.message, 'error');
      } else {
        showToast('Role berhasil ditambahkan', 'success');
        setShowModal(false);
        fetchRoles();
      }
    }
    setSaving(false);
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
    } else {
      showToast('Role berhasil dihapus', 'success');
      fetchRoles();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola role dan tingkat akses di sistem
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Role
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Belum ada role
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div
              key={role.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center',
                    role.is_active
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-slate-100 dark:bg-slate-700'
                  )}
                >
                  <Shield className="w-5 h-5 text-blue-500" />
                </div>
                {role.is_system && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Lock className="w-3 h-3" />
                    Sistem
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">{role.name}</h3>
                {role.level != null && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-amber-500">
                    <Star className="w-3 h-3 fill-amber-500" />
                    {role.level}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex-1 mb-4">
                {role.description ?? 'Tidak ada deskripsi'}
              </p>

              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    role.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}
                >
                  {role.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(role)}
                    className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role)}
                    disabled={!!role.is_system}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      role.is_system
                        ? 'bg-slate-100 text-slate-300 dark:bg-slate-700 dark:text-slate-600 cursor-not-allowed'
                        : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Role' : 'Tambah Role'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Role
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="mis. superadmin"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi role"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Level
                </label>
                <input
                  type="number"
                  value={form.level}
                  onChange={e => setForm({ ...form, level: e.target.value })}
                  min={0}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

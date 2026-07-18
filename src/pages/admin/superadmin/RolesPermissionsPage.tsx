import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Plus, Trash2, Loader2, Shield, Pencil, Check, X, Lock, Crown,
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

export default function RolesPermissionsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('roles', 'create');
  const canUpdate = hasPermission('roles', 'update');
  const canDelete = hasPermission('roles', 'delete');

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLevel, setFormLevel] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat data role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreate = () => {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormLevel('');
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description ?? '');
    setFormLevel(role.level != null ? String(role.level) : '');
    setFormIsActive(role.is_active ?? true);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (editingRole && !canUpdate) {
      showToast('Anda tidak memiliki izin untuk mengubah role', 'error');
      return;
    }
    if (!editingRole && !canCreate) {
      showToast('Anda tidak memiliki izin untuk membuat role', 'error');
      return;
    }
    if (!formName.trim()) {
      showToast('Nama role wajib diisi', 'warning');
      return;
    }
    setActionLoading('save');
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        level: formLevel.trim() !== '' ? Number(formLevel) : null,
        is_active: formIsActive,
      };

      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update(payload)
          .eq('id', editingRole.id);
        if (error) {
          showToast(`Gagal mengubah role: ${error.message}`, 'error');
        } else {
          showToast('Role berhasil diperbarui', 'success');
          setShowModal(false);
          await fetchRoles();
        }
      } else {
        const { error } = await supabase.from('roles').insert({
          ...payload,
          is_system: false,
        });
        if (error) {
          showToast(`Gagal membuat role: ${error.message}`, 'error');
        } else {
          showToast('Role berhasil dibuat', 'success');
          setShowModal(false);
          await fetchRoles();
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!canDelete) {
      showToast('Anda tidak memiliki izin untuk menghapus role', 'error');
      return;
    }
    if (role.is_system) {
      showToast('Role sistem tidak dapat dihapus', 'warning');
      return;
    }
    if (!confirm(`Hapus role "${role.name}"?`)) return;
    setActionLoading(`del-${role.id}`);
    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) {
        showToast(`Gagal menghapus role: ${error.message}`, 'error');
      } else {
        showToast('Role berhasil dihapus', 'success');
        await fetchRoles();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" /> Roles & Permissions
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola role admin dan tingkat aksesnya
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Role
          </button>
        )}
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada role</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map(role => (
            <div key={role.id} className="card p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {role.is_system ? (
                    <Lock className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Crown className="w-4 h-4 text-blue-500" />
                  )}
                  <h3 className="font-semibold text-slate-900 dark:text-white">{role.name}</h3>
                </div>
                {role.is_system && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    Sistem
                  </span>
                )}
              </div>

              {role.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                  {role.description}
                </p>
              )}

              <div className="flex items-center gap-3 mt-3">
                {role.level != null && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Level: <span className="font-medium text-slate-700 dark:text-slate-300">{role.level}</span>
                  </span>
                )}
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    role.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}
                >
                  {role.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                {canUpdate && (
                  <button
                    onClick={() => openEdit(role)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {canDelete && !role.is_system && (
                  <button
                    onClick={() => handleDelete(role)}
                    disabled={actionLoading === `del-${role.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 ml-auto"
                  >
                    {actionLoading === `del-${role.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingRole ? 'Edit Role' : 'Tambah Role'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="contoh: Kepala Sarana"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Deskripsi role..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Level
                </label>
                <input
                  type="number"
                  value={formLevel}
                  onChange={e => setFormLevel(e.target.value)}
                  placeholder="contoh: 10"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Role aktif</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading === 'save'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

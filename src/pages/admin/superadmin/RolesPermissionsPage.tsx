import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Plus, Pencil, Trash2, Loader2, Shield, ShieldCheck, X, Check, Lock,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export default function RolesPermissionsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('roles', 'create');
  const canUpdate = hasPermission('roles', 'update');
  const canDelete = hasPermission('roles', 'delete');

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLevel, setFormLevel] = useState('1');
  const [formActive, setFormActive] = useState(true);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description, level, is_system, is_active, created_at')
      .order('level', { ascending: false });
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
    setFormName('');
    setFormDescription('');
    setFormLevel('1');
    setFormActive(true);
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setFormName(role.name ?? '');
    setFormDescription(role.description ?? '');
    setFormLevel(String(role.level ?? 1));
    setFormActive(role.is_active);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('Nama role wajib diisi', 'warning');
      return;
    }
    setActionLoading('save');
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        level: Number(formLevel) || 1,
        is_active: formActive,
      };

      if (editing) {
        const { error } = await supabase.from('roles').update(payload).eq('id', editing.id);
        if (error) {
          showToast('Gagal memperbarui role: ' + error.message, 'error');
          setActionLoading(null);
          return;
        }
        showToast('Role berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('roles').insert({ ...payload, is_system: false });
        if (error) {
          showToast('Gagal menambah role: ' + error.message, 'error');
          setActionLoading(null);
          return;
        }
        showToast('Role berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      await fetchRoles();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system) {
      showToast('Role sistem tidak dapat dihapus', 'warning');
      return;
    }
    if (!confirm(`Hapus role "${role.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setActionLoading(`delete-${role.id}`);
    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) {
        showToast('Gagal menghapus role: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast('Role berhasil dihapus', 'success');
      await fetchRoles();
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
            <Shield className="w-6 h-6 text-blue-500" /> Role & Permission
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola daftar role admin dan levelnya
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div key={role.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {role.is_system ? (
                    <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  )}
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">{role.name ?? 'Tanpa Nama'}</h3>
                </div>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    role.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                  )}
                >
                  {role.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  Level {role.level ?? 0}
                </span>
                {role.is_system && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                    Sistem
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 min-h-[2.5rem]">
                {role.description ?? 'Tidak ada deskripsi'}
              </p>

              <div className="flex items-center gap-2 pt-1">
                {canUpdate && (
                  <button
                    onClick={() => openEdit(role)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {canDelete && !role.is_system && (
                  <button
                    onClick={() => handleDelete(role)}
                    disabled={actionLoading === `delete-${role.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `delete-${role.id}` ? (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Role' : 'Tambah Role'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="label">Nama Role <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Contoh: Sarpras Admin"
                className="input"
                disabled={editing?.is_system}
              />
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Deskripsi singkat role"
                className="input"
              />
            </div>
            <div>
              <label className="label">Level</label>
              <input
                type="number"
                value={formLevel}
                onChange={e => setFormLevel(e.target.value)}
                min="0"
                className="input"
              />
              <p className="text-xs text-slate-400 mt-1">Level lebih tinggi = otoritas lebih besar.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formActive}
                onChange={e => setFormActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Role aktif</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
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

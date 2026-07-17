import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ShieldCheck,
  Lock,
  Info,
} from 'lucide-react';

// ---- Types ----

interface Role {
  id: string;
  name: string;
  level: number;
  description: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

// ---- Component ----

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState<number>(10);
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      setRoles((data || []) as unknown as Role[]);
    } catch (err) {
      console.error('Error fetching roles:', err);
      showToast('Gagal memuat data role', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openAddModal = () => {
    setEditingRole(null);
    setFormName('');
    setFormLevel(10);
    setFormDescription('');
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormLevel(role.level);
    setFormDescription(role.description);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('Nama role wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        const { error } = await supabase
          .from('roles')
          .update({
            name: formName.trim(),
            level: formLevel,
            description: formDescription.trim(),
          })
          .eq('id', editingRole.id);

        if (error) throw error;
        showToast('Role berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase
          .from('roles')
          .insert({
            name: formName.trim(),
            level: formLevel,
            description: formDescription.trim(),
            is_system: false,
            is_active: true,
          });

        if (error) throw error;
        showToast('Role berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      console.error('Error saving role:', err);
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
    if (!confirm(`Hapus role "${role.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;
      showToast('Role berhasil dihapus', 'success');
      fetchRoles();
    } catch (err) {
      console.error('Error deleting role:', err);
      showToast('Gagal menghapus role', 'error');
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 90) return 'from-blue-500 to-cyan-500';
    if (level >= 70) return 'from-cyan-500 to-teal-500';
    if (level >= 40) return 'from-emerald-500 to-green-500';
    if (level >= 20) return 'from-amber-500 to-orange-500';
    return 'from-slate-400 to-slate-500';
  };

  const getLevelBadge = (level: number) => {
    if (level >= 90) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (level >= 70) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
    if (level >= 40) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (level >= 20) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola role dan tingkat akses pengguna
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Role
        </button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada role</p>
          <p className="text-sm text-slate-400 mt-1">Tambahkan role pertama untuk sistem</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div
              key={role.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow group"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', getLevelColor(role.level))}>
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1">
                  {role.is_system && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      <Lock className="w-3 h-3" />
                      System
                    </span>
                  )}
                  <span className={cn('px-2 py-0.5 rounded-md text-xs font-bold', getLevelBadge(role.level))}>
                    Lv. {role.level}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">{role.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 min-h-[2.5rem]">
                {role.description || 'Tidak ada deskripsi'}
              </p>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <span className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium',
                  role.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                )}>
                  <span className={cn('w-2 h-2 rounded-full', role.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                  {role.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(role)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 transition-colors"
                    title="Edit role"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {!role.is_system && (
                    <button
                      onClick={() => handleDelete(role)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                      title="Hapus role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      {!loading && roles.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Tingkat Akses (Level)</p>
            <p className="mt-0.5">Semakin tinggi level, semakin tinggi aksesnya. Level 100 = Super Admin, Level 10 = Viewer. Role sistem tidak dapat dihapus.</p>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                {editingRole ? 'Edit Role' : 'Tambah Role Baru'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Nama Role</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="contoh: Wakasek Sarpras"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Level */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Level Akses: <span className="text-blue-500 font-bold">{formLevel}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formLevel}
                  onChange={e => setFormLevel(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>0 (Viewer)</span>
                  <span>100 (Super Admin)</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Deskripsi</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Jelakan tanggung jawab role ini..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {editingRole ? 'Simpan Perubahan' : 'Tambah Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

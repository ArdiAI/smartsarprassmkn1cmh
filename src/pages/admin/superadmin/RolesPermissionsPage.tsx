import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Shield, Plus, Trash2, Edit3, Loader2, X, CheckCircle2, Lock, Crown,
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

interface RoleForm {
  name: string;
  description: string;
  level: number;
  is_active: boolean;
}

const emptyForm: RoleForm = { name: '', description: '', level: 0, is_active: true };

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setForm({
      name: role.name,
      description: role.description ?? '',
      level: role.level,
      is_active: role.is_active,
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
        if (error) {
          showToast(`Gagal update role: ${error.message}`, 'error');
          setSaving(false);
          return;
        }
        setRoles(prev => prev.map(r => (r.id === editing.id ? { ...r, ...payload, description: payload.description ?? '' } : r)));
        showToast('Role berhasil diperbarui', 'success');
      } else {
        const { data, error } = await supabase
          .from('roles')
          .insert({ ...payload, is_system: false })
          .select('id, name, description, level, is_system, is_active, created_at')
          .single();
        if (error) {
          showToast(`Gagal menambah role: ${error.message}`, 'error');
          setSaving(false);
          return;
        }
        const newRow = data as unknown as Role;
        setRoles(prev => [newRow, ...prev]);
        showToast('Role berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditing(null);
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
      if (error) {
        showToast(`Gagal menghapus role: ${error.message}`, 'error');
        setDeletingId(null);
        return;
      }
      setRoles(prev => prev.filter(r => r.id !== role.id));
      showToast('Role berhasil dihapus', 'success');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola role dan tingkat akses admin</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah Role
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada role</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div
              key={role.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  {role.is_system ? <Lock className="w-5 h-5 text-white" /> : <Shield className="w-5 h-5 text-white" />}
                </div>
                <div className="flex items-center gap-1">
                  {role.level >= 90 && <Crown className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs font-medium text-slate-400">Level {role.level}</span>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {role.name}
                {role.is_system && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">SISTEM</span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex-1 line-clamp-2">
                {role.description ?? 'Tidak ada deskripsi'}
              </p>
              <div className="flex items-center justify-between mt-4">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium',
                    role.is_active
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500'
                  )}
                >
                  {role.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <div className="flex items-center gap-1">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(role)}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && !role.is_system && (
                    <button
                      onClick={() => handleDelete(role)}
                      disabled={deletingId === role.id}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="Hapus"
                    >
                      {deletingId === role.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Role' : 'Tambah Role'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama Role *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Operator"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Deskripsi singkat role"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Level (angka, makin tinggi makin kuat)</label>
                <input
                  type="number"
                  value={form.level}
                  onChange={e => setForm(prev => ({ ...prev, level: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Role aktif</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

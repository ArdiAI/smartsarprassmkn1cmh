import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Shield, Plus, Pencil, Trash2, X, Loader2, Crown, Lock, Search,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number | null;
  is_system: boolean | null;
  is_active: boolean | null;
  created_at: string;
}

const emptyForm = {
  name: '',
  description: '',
  level: 0,
  is_active: true,
};

export default function RolesPermissionsPage() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission('roles', 'create');
  const canUpdate = hasPermission('roles', 'update');
  const canDelete = hasPermission('roles', 'delete');

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, description, level, is_system, is_active, created_at')
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat roles', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (r: Role) => {
    setForm({
      name: r.name || '',
      description: r.description || '',
      level: r.level ?? 0,
      is_active: r.is_active ?? true,
    });
    setEditingId(r.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama role wajib diisi', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      level: form.level,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from('roles').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui role', 'error');
      } else {
        showToast('Role diperbarui', 'success');
        setModalOpen(false);
        await fetchRoles();
      }
    } else {
      const { error } = await supabase.from('roles').insert({ ...payload, is_system: false });
      if (error) {
        showToast('Gagal menambah role', 'error');
      } else {
        showToast('Role ditambahkan', 'success');
        setModalOpen(false);
        await fetchRoles();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteRole) return;
    setDeleting(true);
    const { error } = await supabase.from('roles').delete().eq('id', deleteRole.id);
    if (error) {
      showToast('Gagal menghapus role', 'error');
    } else {
      showToast('Role dihapus', 'success');
      setDeleteRole(null);
      await fetchRoles();
    }
    setDeleting(false);
  };

  const filtered = roles.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola role admin dan level aksesnya
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Role
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada role</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => {
            const isSystem = r.is_system ?? false;
            const isActive = r.is_active ?? false;
            return (
              <div key={r.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{r.name}</h3>
                      {r.level != null && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Crown className="w-3 h-3" /> Level {r.level}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isSystem && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Lock className="w-3 h-3" /> System
                      </span>
                    )}
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      )}
                    >
                      {isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
                {r.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{r.description}</p>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {canDelete && !isSystem && (
                    <button
                      onClick={() => setDeleteRole(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Role' : 'Tambah Role'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nama Role <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Contoh: Super Admin"
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="input"
                  placeholder="Deskripsi role..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Level</label>
                  <input
                    type="number"
                    value={form.level}
                    onChange={e => setForm({ ...form, level: Number(e.target.value) })}
                    className="input"
                  />
                  <p className="text-xs text-slate-400 mt-1">Level lebih tinggi = akses lebih luas</p>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={form.is_active ? 'true' : 'false'}
                    onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}
                    className="input"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 btn-primary"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteRole(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Role?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Role <span className="font-medium text-slate-900 dark:text-white">{deleteRole.name}</span> akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteRole(null)} className="btn-secondary">Batal</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

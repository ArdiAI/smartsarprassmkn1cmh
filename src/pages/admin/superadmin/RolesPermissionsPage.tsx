import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { Plus, Pencil, Trash2, Lock, Loader2, X } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number | null;
  is_system: boolean | null;
  is_active: boolean | null;
  created_at: string;
}

const emptyForm = { name: '', description: '', level: 0 };

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    const { data } = await supabase.from('roles').select('*').order('level', { ascending: true });
    setRoles((data as unknown as Role[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (role: Role) => {
    setEditing(role);
    setForm({ name: role.name, description: role.description ?? '', level: role.level ?? 0 });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Nama role wajib diisi', 'error'); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('roles').update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        level: Number(form.level) || 0,
      }).eq('id', editing.id);
      if (error) { showToast('Gagal memperbarui: ' + error.message, 'error'); }
      else { showToast('Role diperbarui', 'success'); setShowModal(false); fetchRoles(); }
    } else {
      const { error } = await supabase.from('roles').insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        level: Number(form.level) || 0,
        is_system: false,
        is_active: true,
      });
      if (error) { showToast('Gagal menambah: ' + error.message, 'error'); }
      else { showToast('Role ditambahkan', 'success'); setShowModal(false); fetchRoles(); }
    }
    setSaving(false);
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system) { showToast('Role sistem tidak dapat dihapus', 'warning'); return; }
    if (!confirm(`Hapus role "${role.name}"?`)) return;
    const { error } = await supabase.from('roles').delete().eq('id', role.id);
    if (error) { showToast('Gagal menghapus: ' + error.message, 'error'); }
    else { showToast('Role dihapus', 'success'); fetchRoles(); }
  };

  const handleToggle = async (role: Role) => {
    const { error } = await supabase.from('roles').update({ is_active: !role.is_active }).eq('id', role.id);
    if (error) { showToast('Gagal mengubah status', 'error'); }
    else { showToast('Status diperbarui', 'success'); fetchRoles(); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola role dan tingkat akses</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Role
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Belum ada role</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div key={role.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{role.name}</p>
                    <p className="text-xs text-slate-400">Level {role.level ?? 0}</p>
                  </div>
                </div>
                {role.is_system && <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600">Sistem</span>}
              </div>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{role.description ?? '-'}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(role)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => handleToggle(role)} className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600">
                  {role.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
                {!role.is_system && (
                  <button onClick={() => handleDelete(role)} className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editing ? 'Edit Role' : 'Tambah Role'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nama Role</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="Nama role" />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" rows={3} placeholder="Deskripsi role" />
              </div>
              <div>
                <label className="label">Level</label>
                <input type="number" value={form.level} onChange={e => setForm({ ...form, level: Number(e.target.value) })} className="input" placeholder="0" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

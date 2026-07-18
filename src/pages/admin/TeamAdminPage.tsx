import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import {
  Users, Plus, Pencil, Trash2, X, Loader2, Mail, Phone, Briefcase,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  role: string | null;
  photo_url: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  order: number | null;
  is_active: boolean | null;
  created_at: string;
}

const emptyForm = {
  name: '',
  position: '',
  role: '',
  photo_url: '',
  description: '',
  email: '',
  phone: '',
  order: 0,
  is_active: true,
};

export default function TeamAdminPage() {
  const { hasPermission } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canCreate = hasPermission('team', 'create');
  const canUpdate = hasPermission('team', 'update');
  const canDelete = hasPermission('team', 'delete');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('order', { ascending: true });
    if (error) {
      showToast('Gagal memuat tim', 'error');
    } else {
      setMembers((data as unknown as TeamMember[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const openCreate = () => {
    setForm({ ...emptyForm, order: members.length });
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setForm({
      name: m.name || '',
      position: m.position || '',
      role: m.role || '',
      photo_url: m.photo_url || '',
      description: m.description || '',
      email: m.email || '',
      phone: m.phone || '',
      order: m.order ?? 0,
      is_active: m.is_active ?? true,
    });
    setEditingId(m.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      showToast('Nama anggota wajib diisi', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      position: form.position || null,
      role: form.role || null,
      photo_url: form.photo_url || null,
      description: form.description || null,
      email: form.email || null,
      phone: form.phone || null,
      order: Number(form.order) || 0,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from('team_members').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui anggota', 'error');
      } else {
        showToast('Anggota diperbarui', 'success');
        setModalOpen(false);
        await fetchMembers();
      }
    } else {
      const { error } = await supabase.from('team_members').insert(payload);
      if (error) {
        showToast('Gagal menambah anggota', 'error');
      } else {
        showToast('Anggota ditambahkan', 'success');
        setModalOpen(false);
        await fetchMembers();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('team_members').delete().eq('id', deleteId);
    if (error) {
      showToast('Gagal menghapus anggota', 'error');
    } else {
      showToast('Anggota dihapus', 'success');
      setDeleteId(null);
      await fetchMembers();
    }
  };

  const handleToggleActive = async (m: TeamMember) => {
    setTogglingId(m.id);
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: !m.is_active })
      .eq('id', m.id);
    if (error) {
      showToast('Gagal mengubah status', 'error');
    } else {
      showToast('Status anggota diperbarui', 'success');
      await fetchMembers();
    }
    setTogglingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tim</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola anggota tim yang ditampilkan</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Anggota
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada anggota</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <div key={m.id} className="card p-5 flex flex-col">
              <div className="flex items-start gap-3">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">{(m.name || 'A').charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{m.name}</h3>
                  {m.position && (
                    <p className="text-sm text-blue-500">{m.position}</p>
                  )}
                  {m.role && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.role}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(m)}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {m.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-3">{m.description}</p>
              )}
              <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {m.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" /> {m.email}
                  </div>
                )}
                {m.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" /> {m.phone}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${m.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  {m.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                {canUpdate && (
                  <button
                    onClick={() => handleToggleActive(m)}
                    disabled={togglingId === m.id}
                    className="text-xs font-medium text-blue-500 hover:underline disabled:opacity-50"
                  >
                    {togglingId === m.id ? '...' : m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Anggota' : 'Tambah Anggota'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nama</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="Nama anggota" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Jabatan</label>
                  <input type="text" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className="input" placeholder="Contoh: Kepala Sarpras" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <input type="text" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input" placeholder="Contoh: Admin" />
                </div>
              </div>
              <div>
                <label className="label">URL Foto</label>
                <input type="text" value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} className="input" placeholder="https://..." />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input" placeholder="Deskripsi singkat..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" placeholder="email@sekolah.id" />
                </div>
                <div>
                  <label className="label">Telepon</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" placeholder="08..." />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Urutan</label>
                  <input type="number" min={0} value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} className="input" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })} className="input">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Anggota?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Anggota yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

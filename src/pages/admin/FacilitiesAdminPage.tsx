import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import {
  Building2, Plus, Pencil, Trash2, Loader2, Search, X, MapPin, Users,
} from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  facility_type: string | null;
  category: string | null;
  department: string | null;
  status: string | null;
  manager_name: string | null;
  manager_role: string | null;
  created_at: string;
}

const emptyForm = {
  name: '',
  description: '',
  location: '',
  capacity: '',
  image_url: '',
  facility_type: '',
  category: '',
  department: '',
};

export default function FacilitiesAdminPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('facilities', 'create');
  const canUpdate = hasPermission('facilities', 'update');
  const canDelete = hasPermission('facilities', 'delete');

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('facilities').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data fasilitas', 'error');
      setLoading(false);
      return;
    }
    setFacilities((data as unknown as Facility[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const filtered = facilities.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.location?.toLowerCase().includes(q) ||
      f.category?.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (f: Facility) => {
    setEditing(f);
    setForm({
      name: f.name ?? '',
      description: f.description ?? '',
      location: f.location ?? '',
      capacity: String(f.capacity ?? ''),
      image_url: f.image_url ?? '',
      facility_type: f.facility_type ?? '',
      category: f.category ?? '',
      department: f.department ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      showToast('Nama fasilitas wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      location: form.location || null,
      capacity: Number(form.capacity) || 0,
      image_url: form.image_url || null,
      facility_type: form.facility_type || null,
      category: form.category || null,
      department: form.department || null,
    };
    try {
      if (editing) {
        const { error } = await supabase.from('facilities').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Fasilitas diperbarui', 'success');
      } else {
        const { error } = await supabase.from('facilities').insert(payload);
        if (error) throw error;
        showToast('Fasilitas ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchFacilities();
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan fasilitas', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f: Facility) => {
    if (!confirm(`Hapus "${f.name}"?`)) return;
    const { error } = await supabase.from('facilities').delete().eq('id', f.id);
    if (error) {
      showToast('Gagal menghapus fasilitas', 'error');
      return;
    }
    showToast('Fasilitas dihapus', 'success');
    await fetchFacilities();
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data fasilitas dan ruangan</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari nama, lokasi, atau kategori..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada fasilitas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(f => (
            <div key={f.id} className="card overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-slate-700 dark:to-slate-600 relative">
                {f.image_url ? (
                  <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-blue-300 dark:text-slate-500" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                  <div className="flex gap-1 flex-shrink-0">
                    {canUpdate && (
                      <button
                        onClick={() => openEdit(f)}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(f)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {f.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{f.description}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {f.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {f.location}
                    </span>
                  )}
                  {f.capacity != null && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {f.capacity} orang
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {f.category && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {f.category}
                    </span>
                  )}
                  {f.facility_type && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                      {f.facility_type}
                    </span>
                  )}
                  {f.department && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {f.department}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Nama *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Lokasi</label>
                  <input
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={e => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">URL Gambar</label>
                <input
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Tipe</label>
                  <input
                    value={form.facility_type}
                    onChange={e => setForm({ ...form, facility_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Kategori</label>
                  <input
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Departemen</label>
                  <input
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

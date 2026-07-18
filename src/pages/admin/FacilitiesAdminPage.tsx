import { useEffect, useState } from 'react';
import {
  Building2, Plus, Search, Pencil, Trash2, X, MapPin, Users, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';

interface Facility {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  created_at: string;
  facility_type: string | null;
  category: string | null;
  department: string | null;
  status: string | null;
  manager_name: string | null;
  manager_role: string | null;
}

interface FormData {
  name: string;
  description: string;
  location: string;
  capacity: string;
  image_url: string;
  facility_type: string;
  category: string;
  department: string;
}

const emptyForm: FormData = {
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
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canCreate = hasPermission('facilities', 'create');
  const canUpdate = hasPermission('facilities', 'update');
  const canDelete = hasPermission('facilities', 'delete');

  useEffect(() => {
    fetchFacilities();
  }, []);

  async function fetchFacilities() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFacilities((data as unknown as Facility[]) ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Gagal memuat data fasilitas', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = facilities.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (f.facility_type ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(facility: Facility) {
    setEditingId(facility.id);
    setForm({
      name: facility.name ?? '',
      description: facility.description ?? '',
      location: facility.location ?? '',
      capacity: String(facility.capacity ?? ''),
      image_url: facility.image_url ?? '',
      facility_type: facility.facility_type ?? '',
      category: facility.category ?? '',
      department: facility.department ?? '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Nama fasilitas wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        image_url: form.image_url.trim() || null,
        facility_type: form.facility_type.trim() || null,
        category: form.category.trim() || null,
        department: form.department.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase.from('facilities').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Fasilitas berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('facilities').insert(payload);
        if (error) throw error;
        showToast('Fasilitas berhasil ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchFacilities();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Gagal menyimpan fasilitas', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('facilities').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('Fasilitas berhasil dihapus', 'success');
      setDeleteId(null);
      await fetchFacilities();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Gagal menghapus fasilitas', 'error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola data fasilitas dan ruangan</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="w-4 h-4" /> Tambah Fasilitas
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari fasilitas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Tidak ada data fasilitas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((facility) => (
            <div
              key={facility.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Image / Placeholder */}
              <div className="h-32 bg-gradient-to-br from-blue-500 to-cyan-500 relative">
                {facility.image_url ? (
                  <img src={facility.image_url} alt={facility.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-white/80" />
                  </div>
                )}
                {facility.facility_type && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-white/90 dark:bg-slate-800/90 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {facility.facility_type}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{facility.name}</h3>
                {facility.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{facility.description}</p>
                )}

                <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300 mb-3">
                  {facility.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{facility.location}</span>
                    </div>
                  )}
                  {facility.capacity != null && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Kapasitas: {facility.capacity}</span>
                    </div>
                  )}
                  {facility.department && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>{facility.department}</span>
                    </div>
                  )}
                </div>

                {(canUpdate || canDelete) && (
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
                    {canUpdate && (
                      <button
                        onClick={() => openEdit(facility)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteId(facility.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Fasilitas *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masukkan nama fasilitas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Deskripsi fasilitas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lokasi</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lokasi fasilitas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kapasitas</label>
                <input
                  type="number"
                  min="0"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jumlah kapasitas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL Gambar</label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tipe Fasilitas</label>
                  <input
                    type="text"
                    value={form.facility_type}
                    onChange={(e) => setForm({ ...form, facility_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Ruang Kelas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Kategori"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Departemen</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Departemen"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hapus Fasilitas?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

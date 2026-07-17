import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Building2, MapPin, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface FacilityRow {
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

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function FacilitiesAdminPage() {
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Gagal memuat fasilitas', 'error');
    } else {
      setFacilities((data as unknown as FacilityRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (facility: FacilityRow) => {
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
    setEditingId(facility.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama wajib diisi', 'warning');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      capacity: parseInt(form.capacity) || null,
      image_url: form.image_url.trim() || null,
      facility_type: form.facility_type.trim() || null,
      category: form.category.trim() || null,
      department: form.department.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from('facilities').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui fasilitas', 'error');
      } else {
        showToast('Fasilitas diperbarui', 'success');
        setModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('facilities').insert(payload);
      if (error) {
        showToast('Gagal menambahkan fasilitas', 'error');
      } else {
        showToast('Fasilitas ditambahkan', 'success');
        setModalOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus fasilitas ini?')) return;
    const { error } = await supabase.from('facilities').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus fasilitas', 'error');
    } else {
      showToast('Fasilitas dihapus', 'success');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Fasilitas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data fasilitas dan ruangan
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Tambah Fasilitas
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : facilities.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-slate-400 dark:text-slate-500">Belum ada fasilitas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map(facility => (
            <div
              key={facility.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              {facility.image_url ? (
                <img
                  src={facility.image_url}
                  alt={facility.name}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-blue-300 dark:text-slate-500" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white">{facility.name}</h3>
                  {facility.status && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-lg text-xs font-medium capitalize flex-shrink-0',
                        statusColors[facility.status] ?? statusColors.active
                      )}
                    >
                      {facility.status}
                    </span>
                  )}
                </div>
                {facility.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {facility.description}
                  </p>
                )}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {facility.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{facility.location}</span>
                    </div>
                  )}
                  {facility.capacity != null && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Kapasitas: {facility.capacity}</span>
                    </div>
                  )}
                  {facility.facility_type && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{facility.facility_type}</span>
                    </div>
                  )}
                </div>
                {facility.manager_name && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    PJ: {facility.manager_name}{facility.manager_role ? ` (${facility.manager_role})` : ''}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => openEdit(facility)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(facility.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editingId ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nama *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={e => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">URL Gambar</label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipe Fasilitas</label>
                  <input
                    type="text"
                    value={form.facility_type}
                    onChange={e => setForm({ ...form, facility_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Departemen</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

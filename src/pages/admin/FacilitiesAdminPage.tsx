import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Building2, MapPin, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface Facility {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  image_url: string;
  created_at: string;
  facility_type: string;
  category: string;
  department: string;
  workflow_template_id: string;
  status: string;
  manager_name: string;
  manager_role: string;
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
  name: '', description: '', location: '', capacity: '',
  image_url: '', facility_type: '', category: '', department: '',
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function FacilitiesAdminPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchFacilities = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('facilities').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat fasilitas', 'error');
    } else {
      setFacilities((data as unknown as Facility[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

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
      capacity: f.capacity?.toString() ?? '',
      image_url: f.image_url ?? '',
      facility_type: f.facility_type ?? '',
      category: f.category ?? '',
      department: f.department ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Nama wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      location: form.location,
      capacity: form.capacity ? parseInt(form.capacity) : 0,
      image_url: form.image_url,
      facility_type: form.facility_type,
      category: form.category,
      department: form.department,
    };

    if (editing) {
      const { error } = await supabase.from('facilities').update(payload).eq('id', editing.id);
      if (error) {
        showToast('Gagal mengupdate fasilitas', 'error');
      } else {
        showToast('Fasilitas berhasil diupdate', 'success');
        setModalOpen(false);
        fetchFacilities();
      }
    } else {
      const { error } = await supabase.from('facilities').insert(payload);
      if (error) {
        showToast('Gagal menambah fasilitas', 'error');
      } else {
        showToast('Fasilitas berhasil ditambahkan', 'success');
        setModalOpen(false);
        fetchFacilities();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (f: Facility) => {
    if (!confirm(`Hapus "${f.name}"?`)) return;
    const { error } = await supabase.from('facilities').delete().eq('id', f.id);
    if (error) {
      showToast('Gagal menghapus fasilitas', 'error');
    } else {
      showToast('Fasilitas berhasil dihapus', 'success');
      fetchFacilities();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola data fasilitas</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Tambah Fasilitas
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : facilities.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mb-3" />
          <p className="text-sm">Tidak ada data fasilitas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((f) => (
            <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden group">
              <div className="aspect-video bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
                {f.image_url ? (
                  <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-500" />
                  </div>
                )}
                {f.status && (
                  <span className={cn('absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium', statusColors[f.status] ?? statusColors.active)}>
                    {f.status}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">{f.name ?? ''}</h3>
                {f.facility_type && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{f.facility_type}</p>
                )}
                {f.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{f.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {f.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {f.location}
                    </span>
                  )}
                  {f.capacity > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {f.capacity}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => openEdit(f)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(f)}
                    className="px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL Gambar</label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipe</label>
                  <input
                    type="text"
                    value={form.facility_type}
                    onChange={(e) => setForm({ ...form, facility_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departemen</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

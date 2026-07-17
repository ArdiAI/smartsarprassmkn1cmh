import { useEffect, useState } from 'react';
import {
  Building2, Plus, Pencil, Trash2, X, Loader2, AlertCircle, MapPin, Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

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
  workflow_template_id: string | null;
  status: string | null;
  manager_name: string | null;
  manager_role: string | null;
}

interface FormData {
  id?: string;
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

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: 'Aktif', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  inactive: { label: 'Nonaktif', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  maintenance: { label: 'Maintenance', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

export default function FacilitiesAdminPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchFacilities();
  }, []);

  async function fetchFacilities() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFacilities((data as unknown as Facility[]) || []);
    } catch (err) {
      console.error('Fetch facilities error:', err);
      showToast('Gagal memuat data fasilitas', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(f: Facility) {
    setForm({
      id: f.id,
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
  }

  async function handleSave() {
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
        capacity: parseInt(form.capacity) || null,
        image_url: form.image_url.trim() || null,
        facility_type: form.facility_type.trim() || null,
        category: form.category.trim() || null,
        department: form.department.trim() || null,
      };

      if (form.id) {
        const { error } = await supabase.from('facilities').update(payload).eq('id', form.id);
        if (error) throw error;
        showToast('Fasilitas diperbarui', 'success');
      } else {
        const { error } = await supabase.from('facilities').insert(payload);
        if (error) throw error;
        showToast('Fasilitas ditambahkan', 'success');
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
    setSaving(true);
    try {
      const { error } = await supabase.from('facilities').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('Fasilitas dihapus', 'success');
      setDeleteId(null);
      await fetchFacilities();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Gagal menghapus fasilitas', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data fasilitas dan ruangan
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Fasilitas</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : facilities.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada fasilitas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((f) => {
            const sc = statusConfig[f.status ?? 'active'] ?? statusConfig.active;
            return (
              <div
                key={f.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {f.image_url ? (
                  <div className="h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-blue-400 dark:text-blue-600" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                    <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0', sc.class)}>
                      {sc.label}
                    </span>
                  </div>
                  {f.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{f.description}</p>
                  )}
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {f.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{f.location}</span>
                      </div>
                    )}
                    {f.capacity != null && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Kapasitas: {f.capacity}</span>
                      </div>
                    )}
                    {f.facility_type && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{f.facility_type}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openEdit(f)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteId(f.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {form.id ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">Nama Fasilitas *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Lokasi</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Kapasitas</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">URL Gambar</label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Tipe</label>
                  <input
                    type="text"
                    value={form.facility_type}
                    onChange={(e) => setForm({ ...form, facility_type: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Departemen</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Hapus Fasilitas?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

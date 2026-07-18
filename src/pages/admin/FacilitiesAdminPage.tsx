import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import {
  Boxes, Plus, Pencil, Trash2, X, Loader2, MapPin, Users, Building2,
} from 'lucide-react';

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
  const canCreate = hasPermission('facilities', 'create');
  const canUpdate = hasPermission('facilities', 'update');
  const canDelete = hasPermission('facilities', 'delete');

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false });
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

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (facility: Facility) => {
    setEditing(facility);
    setForm({
      name: facility.name ?? '',
      description: facility.description ?? '',
      location: facility.location ?? '',
      capacity: facility.capacity != null ? String(facility.capacity) : '',
      image_url: facility.image_url ?? '',
      facility_type: facility.facility_type ?? '',
      category: facility.category ?? '',
      department: facility.department ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      showToast('Nama fasilitas wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      location: form.location || null,
      capacity: form.capacity ? Number(form.capacity) : null,
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
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan fasilitas', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('facilities').delete().eq('id', id);
      if (error) throw error;
      showToast('Fasilitas dihapus', 'success');
      setDeleteId(null);
      await fetchFacilities();
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus fasilitas', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola ruangan dan fasilitas</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada fasilitas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map(facility => (
            <div key={facility.id} className="card overflow-hidden group">
              {facility.image_url ? (
                <img
                  src={facility.image_url}
                  alt={facility.name}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-blue-300 dark:text-blue-600" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{facility.name}</h3>
                  {facility.facility_type && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 whitespace-nowrap">
                      {facility.facility_type}
                    </span>
                  )}
                </div>
                {facility.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{facility.description}</p>
                )}
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-3">
                  {facility.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {facility.location}
                    </span>
                  )}
                  {facility.capacity != null && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {facility.capacity}
                    </span>
                  )}
                </div>
                {facility.department && (
                  <p className="text-xs text-slate-400 mt-2">Departemen: {facility.department}</p>
                )}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(facility)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm font-medium transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(facility.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="label">Nama Fasilitas</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Lokasi</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Kapasitas</label>
                  <input
                    type="number"
                    min="0"
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">URL Gambar</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Tipe Fasilitas</label>
                  <input
                    type="text"
                    value={form.facility_type}
                    onChange={e => setForm(f => ({ ...f, facility_type: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Departemen</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Boxes className="w-4 h-4" />}
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hapus Fasilitas?</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Tindakan ini tidak dapat dibatalkan. Yakin ingin menghapus fasilitas ini?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
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

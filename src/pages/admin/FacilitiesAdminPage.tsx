import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import {
  Plus, Pencil, Trash2, Search, Loader2, Building2, X, MapPin, Users,
} from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  description: string | null;
  location: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('facilities').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data fasilitas', 'error');
    } else {
      setFacilities((data as unknown as Facility[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const filtered = facilities.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.location?.toLowerCase().includes(q) ||
      f.category?.toLowerCase().includes(q) ||
      f.department?.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (f: Facility) => {
    setEditingId(f.id);
    setForm({
      name: f.name ?? '',
      description: f.description ?? '',
      location: f.location ?? '',
      capacity: f.capacity != null ? String(f.capacity) : '',
      image_url: f.image_url ?? '',
      facility_type: f.facility_type ?? '',
      category: f.category ?? '',
      department: f.department ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      showToast('Nama fasilitas wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      location: form.location,
      capacity: form.capacity ? Number(form.capacity) : null,
      image_url: form.image_url || null,
      facility_type: form.facility_type || null,
      category: form.category || null,
      department: form.department || null,
    };

    if (editingId) {
      const { error } = await supabase.from('facilities').update(payload).eq('id', editingId);
      if (error) showToast('Gagal memperbarui fasilitas', 'error');
      else showToast('Fasilitas diperbarui', 'success');
    } else {
      const { error } = await supabase.from('facilities').insert(payload);
      if (error) showToast('Gagal menambah fasilitas', 'error');
      else showToast('Fasilitas ditambahkan', 'success');
    }
    setSaving(false);
    setModalOpen(false);
    fetchFacilities();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus fasilitas ini?')) return;
    const { error } = await supabase.from('facilities').delete().eq('id', id);
    if (error) showToast('Gagal menghapus fasilitas', 'error');
    else showToast('Fasilitas dihapus', 'success');
    fetchFacilities();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data fasilitas</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, lokasi, kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada data fasilitas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((f) => (
              <div key={f.id} className="rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden bg-slate-50 dark:bg-slate-700/20">
                <div className="h-40 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center relative">
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-12 h-12 text-white/80" />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canUpdate && (
                        <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {f.description && <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{f.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    {f.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {f.location}</span>
                    )}
                    {f.capacity != null && (
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {f.capacity} orang</span>
                    )}
                  </div>
                  {(f.category || f.department || f.facility_type) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {f.facility_type && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{f.facility_type}</span>}
                      {f.category && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">{f.category}</span>}
                      {f.department && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200">{f.department}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingId ? 'Edit Fasilitas' : 'Tambah Fasilitas'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Nama Fasilitas</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama fasilitas" />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi fasilitas" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Lokasi</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lokasi" />
                </div>
                <div>
                  <label className="label">Kapasitas</label>
                  <input type="number" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="label">URL Gambar</label>
                  <input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <label className="label">Tipe Fasilitas</label>
                  <input className="input" value={form.facility_type} onChange={(e) => setForm({ ...form, facility_type: e.target.value })} placeholder="Tipe fasilitas" />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategori" />
                </div>
                <div>
                  <label className="label">Departemen</label>
                  <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Departemen" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

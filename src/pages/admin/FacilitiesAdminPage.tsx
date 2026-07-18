import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import {
  Building2, Plus, Pencil, Trash2, X, Loader2, Search, MapPin, Users,
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

const emptyForm = {
  name: '',
  description: '',
  location: '',
  capacity: 0,
  image_url: '',
  facility_type: '',
  category: '',
  department: '',
};

const facilityTypeOptions = ['ruang_kelas', 'laboratorium', 'aula', 'lapangan', 'perpustakaan', 'kantor', 'lainnya'];

export default function FacilitiesAdminPage() {
  const { hasPermission } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canCreate = hasPermission('facilities', 'create');
  const canUpdate = hasPermission('facilities', 'update');
  const canDelete = hasPermission('facilities', 'delete');

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat fasilitas', 'error');
    } else {
      setFacilities((data as unknown as Facility[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (f: Facility) => {
    setForm({
      name: f.name || '',
      description: f.description || '',
      location: f.location || '',
      capacity: f.capacity ?? 0,
      image_url: f.image_url || '',
      facility_type: f.facility_type || '',
      category: f.category || '',
      department: f.department || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      showToast('Nama fasilitas wajib diisi', 'error');
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

    if (editingId) {
      const { error } = await supabase.from('facilities').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui fasilitas', 'error');
      } else {
        showToast('Fasilitas diperbarui', 'success');
        setModalOpen(false);
        await fetchFacilities();
      }
    } else {
      const { error } = await supabase.from('facilities').insert(payload);
      if (error) {
        showToast('Gagal menambah fasilitas', 'error');
      } else {
        showToast('Fasilitas ditambahkan', 'success');
        setModalOpen(false);
        await fetchFacilities();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('facilities').delete().eq('id', deleteId);
    if (error) {
      showToast('Gagal menghapus fasilitas', 'error');
    } else {
      showToast('Fasilitas dihapus', 'success');
      setDeleteId(null);
      await fetchFacilities();
    }
  };

  const filtered = facilities.filter(f => {
    if (search) {
      const q = search.toLowerCase();
      return (
        f.name?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q) ||
        f.department?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola daftar fasilitas yang tersedia</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Fasilitas
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama, lokasi, atau kategori..."
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
            <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada fasilitas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(f => (
            <div key={f.id} className="card overflow-hidden flex flex-col">
              {f.image_url ? (
                <img src={f.image_url} alt={f.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-blue-300 dark:text-blue-500/50" />
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                  <div className="flex gap-1 flex-shrink-0">
                    {canUpdate && (
                      <button
                        onClick={() => openEdit(f)}
                        className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteId(f.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {f.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{f.description}</p>
                )}
                <div className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                  {f.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" /> {f.location}
                    </div>
                  )}
                  {f.capacity != null && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" /> Kapasitas: {f.capacity}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {f.facility_type && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {f.facility_type}
                    </span>
                  )}
                  {f.category && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {f.category}
                    </span>
                  )}
                  {f.department && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nama Fasilitas</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="Contoh: Aula Utama" />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input" placeholder="Deskripsi fasilitas..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Lokasi</label>
                  <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input" placeholder="Contoh: Gedung A Lt. 1" />
                </div>
                <div>
                  <label className="label">Kapasitas</label>
                  <input type="number" min={0} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} className="input" />
                </div>
              </div>
              <div>
                <label className="label">URL Gambar</label>
                <input type="text" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="input" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Tipe Fasilitas</label>
                  <select value={form.facility_type} onChange={e => setForm({ ...form, facility_type: e.target.value })} className="input">
                    <option value="">Pilih Tipe</option>
                    {facilityTypeOptions.map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input" placeholder="Kategori" />
                </div>
                <div>
                  <label className="label">Departemen</label>
                  <input type="text" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="input" placeholder="Departemen" />
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Fasilitas?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Fasilitas yang dihapus tidak dapat dikembalikan.</p>
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

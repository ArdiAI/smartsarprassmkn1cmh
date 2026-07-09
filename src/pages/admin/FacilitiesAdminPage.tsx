import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Facility } from '../../types';
import { Plus, Search, Edit, Trash2, X, Building2, MapPin, Users, Upload, Check } from 'lucide-react';

export default function FacilitiesAdminPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', location: '', capacity: 0, image_url: '' });

  useEffect(() => {
    supabase.from('facilities').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setFacilities(data); setLoading(false); });
  }, []);

  const openCreateModal = () => {
    setEditingFacility(null);
    setFormData({ name: '', description: '', location: '', capacity: 0, image_url: '' });
    setShowModal(true);
  };

  const openEditModal = (facility: Facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name, description: facility.description, location: facility.location,
      capacity: facility.capacity, image_url: facility.image_url
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editingFacility) {
      await supabase.from('facilities').update(formData).eq('id', editingFacility.id);
    } else {
      await supabase.from('facilities').insert([formData]);
    }
    setShowModal(false);
    fetchData();
    setSaving(false);
  };

  const fetchData = async () => {
    const { data } = await supabase.from('facilities').select('*').order('created_at', { ascending: false });
    if (data) setFacilities(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus?')) return;
    await supabase.from('facilities').delete().eq('id', id);
    fetchData();
  };

  const filtered = facilities.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Fasilitas</h1>
          <p className="text-slate-600 dark:text-slate-400">Tambah, edit, dan hapus fasilitas</p>
        </div>
        <button onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-medium">
          <Plus className="w-5 h-5" />Tambah Fasilitas
        </button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input type="text" placeholder="Cari..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-lg">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Tidak ada fasilitas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(f => (
            <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden group">
              <div className="relative h-40">
                {f.image_url ? <img src={f.image_url} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> :
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center"><Building2 className="w-16 h-16 text-slate-300" /></div>}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button onClick={() => openEditModal(f)} className="p-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white text-slate-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(f.id)} className="p-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-red-100 text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{f.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{f.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{f.location}</span>
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" />{f.capacity}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingFacility ? 'Edit' : 'Tambah'} Fasilitas</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Nama</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" placeholder="Ruang Kelas Modern" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Lokasi</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" placeholder="Gedung A Lt. 2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Kapasitas</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="number" min="0" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">URL Gambar</label>
                <div className="relative">
                  <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="url" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600">Batal</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
                  <Check className="w-4 h-4" />{saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

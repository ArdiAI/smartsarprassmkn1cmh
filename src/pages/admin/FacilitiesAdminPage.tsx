import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  MapPin,
  Users,
  Building2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
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
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat fasilitas', 'error');
      setFacilities([]);
    } else {
      setFacilities((data as unknown as Facility[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Nama fasilitas wajib diisi', 'error');
      return;
    }
    setSaving(true);
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
    const { error } = editing
      ? await supabase.from('facilities').update(payload).eq('id', editing.id)
      : await supabase.from('facilities').insert(payload);
    setSaving(false);
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
      return;
    }
    showToast(editing ? 'Fasilitas diperbarui' : 'Fasilitas ditambahkan', 'success');
    setModalOpen(false);
    await fetchFacilities();
  };

  const handleDelete = async (f: Facility) => {
    if (!confirm(`Hapus "${f.name}"?`)) return;
    const { error } = await supabase.from('facilities').delete().eq('id', f.id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Fasilitas dihapus', 'info');
    await fetchFacilities();
  };

  const filtered = facilities.filter(
    (f) =>
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.location?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Fasilitas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola daftar fasilitas sekolah.
          </p>
        </div>
        {hasPermission('facilities', 'create') && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Fasilitas
          </button>
        )}
      </div>

      <div className="card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari fasilitas atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada fasilitas" description="Belum ada data fasilitas." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <div key={f.id} className="card flex flex-col">
              {f.image_url ? (
                <img
                  src={f.image_url}
                  alt={f.name}
                  className="mb-4 h-40 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mb-4 flex h-40 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{f.name}</h3>
                {f.facility_type && (
                  <span className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                    {f.facility_type}
                  </span>
                )}
                {f.description && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{f.description}</p>
                )}
                <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {f.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {f.location}
                    </div>
                  )}
                  {f.capacity != null && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Kapasitas {f.capacity}
                    </div>
                  )}
                  {f.department && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> {f.department}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {hasPermission('facilities', 'update') && (
                  <button onClick={() => openEdit(f)} className="btn-secondary flex-1">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {hasPermission('facilities', 'delete') && (
                  <button
                    onClick={() => handleDelete(f)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Nama Fasilitas <span className="text-red-500">*</span></label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Tipe Fasilitas</label>
                  <input className="input" value={form.facility_type} onChange={(e) => setForm({ ...form, facility_type: e.target.value })} placeholder="Mis. Ruang Kelas / Lapangan" />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div>
                  <label className="label">Lokasi</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <label className="label">Kapasitas</label>
                  <input type="number" min={0} className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Departemen</label>
                  <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
                <div>
                  <label className="label">URL Gambar</label>
                  <input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Deskripsi</label>
                  <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? 'Simpan Perubahan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

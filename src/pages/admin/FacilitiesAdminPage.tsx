import { useEffect, useState, useMemo, type FormEvent } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Search,
  MapPin,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

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

interface FacilityForm {
  name: string;
  description: string;
  location: string;
  capacity: string;
  image_url: string;
  facility_type: string;
  category: string;
  department: string;
}

const emptyForm: FacilityForm = {
  name: '',
  description: '',
  location: '',
  capacity: '',
  image_url: '',
  facility_type: '',
  category: '',
  department: '',
};

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export default function FacilitiesAdminPage() {
  const { hasPermission } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState<FacilityForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canCreate = hasPermission('facilities', 'create');
  const canUpdate = hasPermission('facilities', 'update');
  const canDelete = hasPermission('facilities', 'delete');

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('facilities').select('*').order('created_at', { ascending: false });
      if (error) {
        showToast('Gagal memuat fasilitas', 'error');
        return;
      }
      setFacilities((data as unknown as Facility[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return facilities.filter((f) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        (f.location ?? '').toLowerCase().includes(q) ||
        (f.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [facilities, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(f: Facility) {
    setEditing(f);
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
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Nama fasilitas wajib diisi', 'warning');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        image_url: form.image_url.trim() || null,
        facility_type: form.facility_type.trim() || null,
        category: form.category.trim() || null,
        department: form.department.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from('facilities').update(payload).eq('id', editing.id);
        if (error) {
          showToast('Gagal memperbarui fasilitas', 'error');
          return;
        }
        showToast('Fasilitas diperbarui', 'success');
      } else {
        const { error } = await supabase.from('facilities').insert({ ...payload, status: 'active' });
        if (error) {
          showToast('Gagal menambah fasilitas', 'error');
          return;
        }
        showToast('Fasilitas ditambahkan', 'success');
      }
      closeModal();
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: Facility) {
    if (!confirm(`Hapus "${f.name}"?`)) return;
    setDeleting(f.id);
    try {
      const { error } = await supabase.from('facilities').delete().eq('id', f.id);
      if (error) {
        showToast('Gagal menghapus fasilitas', 'error');
        return;
      }
      showToast('Fasilitas dihapus', 'success');
      fetchData();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Fasilitas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola data fasilitas sekolah.</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Fasilitas
          </button>
        )}
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Cari fasilitas..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
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
                <img src={f.image_url} alt={f.name} className="mb-3 h-40 w-full rounded-xl object-cover" />
              ) : (
                <div className="mb-3 flex h-40 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <MapPin className="h-10 w-10 text-slate-400" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{f.name}</h3>
                  {f.status && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[f.status] ?? statusStyles.active}`}>
                      {f.status}
                    </span>
                  )}
                </div>
                {f.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{f.description}</p>}
                <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {f.location && (
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {f.location}</p>
                  )}
                  {f.capacity != null && (
                    <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Kapasitas: {f.capacity}</p>
                  )}
                  {f.category && <p className="text-slate-400">Kategori: {f.category}</p>}
                  {f.department && <p className="text-slate-400">Departemen: {f.department}</p>}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {canUpdate && (
                  <button onClick={() => openEdit(f)} className="btn-secondary flex-1 px-3 py-2 text-xs">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(f)}
                    disabled={deleting === f.id}
                    className="btn-danger px-3 py-2 text-xs"
                  >
                    {deleting === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama <span className="text-red-500">*</span></label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Lokasi</label>
                  <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <label className="label">Kapasitas</label>
                  <input type="number" min={0} className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">URL Gambar</label>
                <input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipe Fasilitas</label>
                  <input className="input" value={form.facility_type} onChange={(e) => setForm({ ...form, facility_type: e.target.value })} />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Departemen</label>
                <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

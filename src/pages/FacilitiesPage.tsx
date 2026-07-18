import { useEffect, useState, useMemo } from 'react';
import { Building2, Search, Loader2, MapPin, Users, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { cn } from '../utils/cn';

interface Facility {
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
}

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256502/pexels-photo-256502.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1454359/pexels-photo-1454359.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256514/pexels-photo-256514.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256431/pexels-photo-256431.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function fallbackImage(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length];
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, description, location, capacity, image_url, facility_type, category, department, status')
          .order('name', { ascending: true });
        if (error) throw error;
        setFacilities((data as unknown as Facility[]) ?? []);
      } catch {
        setFacilities([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => {
      if (f.category) set.add(f.category);
      else if (f.facility_type) set.add(f.facility_type);
    });
    return Array.from(set).sort();
  }, [facilities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return facilities.filter((f) => {
      const matchSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.location ?? '').toLowerCase().includes(q) ||
        (f.category ?? '').toLowerCase().includes(q);
      const matchCat = !categoryFilter || f.category === categoryFilter || f.facility_type === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [facilities, search, categoryFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas Sekolah</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Daftar fasilitas yang tersedia di sekolah.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari fasilitas, lokasi, atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="mb-4 h-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="mb-2 h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mb-2 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada fasilitas"
          description="Belum ada fasilitas yang sesuai dengan filter."
          icon={<Building2 className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <div key={f.id} className="card overflow-hidden p-0">
              <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={f.image_url || fallbackImage(f.id)}
                  alt={f.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbackImage(f.id);
                  }}
                />
                {f.status && (
                  <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow dark:bg-slate-900/90 dark:text-slate-200">
                    {f.status}
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{f.name}</h3>
                {f.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{f.description}</p>
                )}
                <div className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                  {f.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{f.location}</span>
                    </div>
                  )}
                  {f.capacity != null && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>Kapasitas: {f.capacity} orang</span>
                    </div>
                  )}
                  {(f.category || f.facility_type) && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <span>{f.category ?? f.facility_type}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { Search, Building2, MapPin, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';

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
  'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/159775/library-books-education-students-159775.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/207693/pexels-photo-207693.jpeg?auto=compress&cs=tinysrgb&w=600',
];

function fallbackImage(id: string) {
  const idx = id.charCodeAt(0) % FALLBACK_IMAGES.length;
  return FALLBACK_IMAGES[idx];
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, description, location, capacity, image_url, facility_type, category, department, status')
          .order('name', { ascending: true });
        if (error) throw error;
        setFacilities((data as unknown as Facility[]) ?? []);
      } catch {
        showToast('Gagal memuat data fasilitas', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return facilities;
    return facilities.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      (f.location ?? '').toLowerCase().includes(q) ||
      (f.category ?? '').toLowerCase().includes(q),
    );
  }, [facilities, search]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="h-40 animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2 p-5">
                <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas Sekolah</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Jelajahi fasilitas yang tersedia untuk pemesanan.
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Cari fasilitas, lokasi, atau kategori..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Tidak ada fasilitas" description="Tidak ada fasilitas yang cocok dengan pencarian." icon={<Building2 className="h-8 w-8 text-slate-400" />} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <div key={f.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={f.image_url ?? fallbackImage(f.id)}
                  alt={f.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage(f.id); }}
                />
                {f.facility_type && (
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-700 backdrop-blur dark:bg-slate-900/90 dark:text-brand-300">
                    {f.facility_type}
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-900 dark:text-white">{f.name}</h3>
                {f.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{f.description}</p>}
                <div className="mt-3 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                  {f.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{f.location}</span>
                    </div>
                  )}
                  {f.capacity != null && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>Kapasitas {f.capacity} orang</span>
                    </div>
                  )}
                </div>
                {f.category && (
                  <span className="mt-3 inline-block rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {f.category}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

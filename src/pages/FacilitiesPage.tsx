import { useEffect, useState, useMemo } from 'react';
import { Building2, Search, MapPin, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

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
  manager_name: string | null;
  manager_role: string | null;
}

const pexelsFallback = (seed: string) =>
  `https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=800&dpr=1&seed=${encodeURIComponent(seed)}`;

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('*')
          .order('name', { ascending: true });
        if (error) {
          showToast('Gagal memuat data fasilitas', 'error');
          return;
        }
        setFacilities((data as unknown as Facility[]) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return facilities;
    return facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q),
    );
  }, [facilities, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
          <Building2 className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          Fasilitas
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Jelajahi fasilitas yang tersedia di sekolah.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari fasilitas berdasarkan nama, lokasi, atau kategori..."
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="h-48 animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="p-5">
                <div className="mb-3 h-5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada fasilitas"
          description={search ? 'Tidak ada hasil untuk pencarian Anda.' : 'Belum ada fasilitas yang terdaftar.'}
          icon={<Building2 className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((facility) => (
            <div
              key={facility.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden bg-slate-200 dark:bg-slate-800">
                <img
                  src={facility.image_url || pexelsFallback(facility.name)}
                  alt={facility.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = pexelsFallback(facility.name);
                  }}
                />
                {facility.category && (
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-700 backdrop-blur-sm dark:bg-slate-900/90 dark:text-brand-300">
                    {facility.category}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{facility.name}</h3>
                {facility.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                    {facility.description}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  {facility.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-brand-500" />
                      <span>{facility.location}</span>
                    </div>
                  )}
                  {facility.capacity != null && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Users className="h-4 w-4 flex-shrink-0 text-brand-500" />
                      <span>Kapasitas: {facility.capacity} orang</span>
                    </div>
                  )}
                </div>

                {facility.manager_name && (
                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-xs text-slate-400">Penanggung Jawab</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {facility.manager_name}
                      {facility.manager_role && (
                        <span className="ml-1 text-slate-400">— {facility.manager_role}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="mt-6 text-center text-sm text-slate-400">
          Menampilkan {filtered.length} fasilitas
        </p>
      )}
    </div>
  );
}

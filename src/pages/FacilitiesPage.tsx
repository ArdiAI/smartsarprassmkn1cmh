import { useEffect, useState, useMemo } from 'react';
import { Search, Building2, MapPin, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
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
  manager_name: string | null;
  manager_role: string | null;
}

const pexelsFallback = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/400`;

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, description, location, capacity, image_url, facility_type, category, department, status, manager_name, manager_role')
          .order('name', { ascending: true });
        if (error) throw error;
        setFacilities((data as unknown as Facility[]) ?? []);
      } catch (err: any) {
        showToast('Gagal memuat data fasilitas', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => { if (f.category) set.add(f.category); });
    return Array.from(set).sort();
  }, [facilities]);

  const filtered = useMemo(() => {
    return facilities.filter((f) => {
      const matchSearch =
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.location ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'all' || f.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [facilities, search, categoryFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas Sekolah</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Jelajahi fasilitas yang tersedia di sekolah. Gunakan menu Pengajuan untuk memesan.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari fasilitas atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="mb-4 h-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="mb-2 h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mb-1 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada fasilitas"
          description="Tidak ada fasilitas yang cocok dengan pencarian Anda."
          icon={<Building2 className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <div key={f.id} className="card group overflow-hidden p-0">
              <div className="relative h-40 overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-800">
                <img
                  src={f.image_url || pexelsFallback(f.name)}
                  alt={f.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = pexelsFallback(f.name);
                  }}
                />
                {f.status && (
                  <span
                    className={cn(
                      'absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      f.status === 'tersedia' || f.status === 'available'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                    )}
                  >
                    {f.status}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                {f.description && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{f.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {f.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {f.location}
                    </span>
                  )}
                  {f.capacity != null && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      Kapasitas {f.capacity}
                    </span>
                  )}
                </div>
                {f.category && (
                  <span className="mt-3 inline-block rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {f.category}
                  </span>
                )}
                {f.manager_name && (
                  <p className="mt-2 text-xs text-slate-400">
                    Penanggung Jawab: {f.manager_name}{f.manager_role ? ` (${f.manager_role})` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

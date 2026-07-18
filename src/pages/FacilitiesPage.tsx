import { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Search,
  MapPin,
  Users,
  Loader2,
  AlertCircle,
  LayoutGrid,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
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

const FACILITY_IMAGES: Record<string, string> = {
  aula: 'https://images.pexels.com/photos/260931/pexels-photo-260931.jpeg?auto=compress&cs=tinysrgb&w=800',
  lapangan: 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=800',
  lab: 'https://images.pexels.com/photos/2566581/pexels-photo-2566581.jpeg?auto=compress&cs=tinysrgb&w=800',
  kelas: 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800',
  perpustakaan: 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800',
  kantin: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800',
};

function getFacilityImage(f: Facility): string {
  if (f.image_url) return f.image_url;
  const key = (f.facility_type ?? f.category ?? f.name ?? '').toLowerCase();
  for (const k of Object.keys(FACILITY_IMAGES)) {
    if (key.includes(k)) return FACILITY_IMAGES[k];
  }
  return 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800';
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, description, location, capacity, image_url, facility_type, category, department, status, manager_name, manager_role')
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => {
      const c = f.category ?? f.facility_type;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [facilities]);

  const filtered = useMemo(() => {
    return facilities.filter((f) => {
      const matchSearch =
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (f.category ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === 'all' ||
        (f.category ?? f.facility_type) === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [facilities, search, categoryFilter]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="relative mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <Building2 className="h-7 w-7 text-brand-600" />
            Fasilitas Sekolah
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Jelajahi dan pesan fasilitas yang tersedia di sekolah.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Cari fasilitas, lokasi, kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-48"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="mb-4 h-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-3 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="h-8 w-8 text-slate-400" />}
            title="Tidak ada fasilitas"
            description="Coba ubah kata kunci atau filter pencarian."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((f) => (
              <div key={f.id} className="card group overflow-hidden p-0">
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={getFacilityImage(f)}
                    alt={f.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800';
                    }}
                  />
                  {f.status && (
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
                      {f.status}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{f.name}</h3>
                  {(f.category || f.facility_type) && (
                    <span className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {f.category ?? f.facility_type}
                    </span>
                  )}
                  {f.description && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {f.description}
                    </p>
                  )}
                  <div className="mt-3 space-y-1.5">
                    {f.location && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <MapPin className="h-4 w-4 text-brand-500" />
                        {f.location}
                      </div>
                    )}
                    {f.capacity != null && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <Users className="h-4 w-4 text-brand-500" />
                        Kapasitas {f.capacity} orang
                      </div>
                    )}
                  </div>
                  {f.manager_name && (
                    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <p className="text-xs text-slate-400">
                        PJ: <span className="font-medium text-slate-600 dark:text-slate-300">{f.manager_name}</span>
                        {f.manager_role && ` · ${f.manager_role}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

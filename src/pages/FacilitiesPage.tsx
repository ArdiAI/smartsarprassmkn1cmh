import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { Search, Building2, MapPin, Users, Loader2, Tag } from 'lucide-react';

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
  `https://images.pexels.com/photos/20787/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=600&dpr=1&seed=${encodeURIComponent(seed)}`;

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setFacilities((data as unknown as Facility[]) || []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    facilities.forEach((f) => { if (f.category) set.add(f.category); });
    return Array.from(set).sort();
  }, [facilities]);

  const filtered = useMemo(() => {
    return facilities.filter((f) => {
      if (categoryFilter !== 'all' && (f.category || '') !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.name?.toLowerCase().includes(q) ||
          f.location?.toLowerCase().includes(q) ||
          f.category?.toLowerCase().includes(q) ||
          f.facility_type?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [facilities, search, categoryFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Daftar fasilitas yang tersedia untuk dipinjam
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari fasilitas, lokasi, atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="h-48 bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="Tidak ada fasilitas ditemukan" description="Coba ubah kata kunci atau filter pencarian" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((f) => (
              <div key={f.id} className="card overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden relative">
                  <img
                    src={f.image_url || pexelsFallback(f.name)}
                    alt={f.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = pexelsFallback(f.name);
                    }}
                  />
                  {f.status && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200">
                      {f.status}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.name}</h3>
                  {f.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">{f.description}</p>
                  )}
                  <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {f.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {f.location}
                      </div>
                    )}
                    {f.capacity != null && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        Kapasitas: {f.capacity} orang
                      </div>
                    )}
                    {f.category && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-slate-400" />
                        {f.category}
                      </div>
                    )}
                  </div>
                  {f.manager_name && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        PJ: {f.manager_name}{f.manager_role ? ` (${f.manager_role})` : ''}
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

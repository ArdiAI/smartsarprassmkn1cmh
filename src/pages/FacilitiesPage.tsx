import { useEffect, useState } from 'react';
import { Search, Building2, MapPin, Users, Tag, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Facility {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  category: string;
  facility_type: string;
  status: string;
  image_url: string;
}

const statusColors: Record<string, string> = {
  aktif: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  tidak_aktif: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('facilities')
        .select('id, name, description, location, capacity, category, facility_type, status, image_url')
        .order('name');
      setFacilities(data || []);
      setLoading(false);
    })();
  }, []);

  const categories = ['all', ...Array.from(new Set(facilities.map(f => f.category).filter(Boolean)))];

  const filtered = facilities.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.location || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || f.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400">Daftar ruangan dan fasilitas yang tersedia di sekolah</p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari fasilitas atau lokasi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'Semua Kategori' : c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada fasilitas" message="Coba ubah kata kunci pencarian" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(f => (
              <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-40 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-12 h-12 text-blue-400" />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-slate-900 dark:text-white">{f.name}</h3>
                    {f.status && (
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', statusColors[f.status] || 'bg-slate-100 text-slate-600')}>
                        {f.status}
                      </span>
                    )}
                  </div>
                  {f.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{f.description}</p>}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <MapPin className="w-4 h-4 text-slate-400" /> {f.location || '-'}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Users className="w-4 h-4 text-slate-400" /> Kapasitas: {f.capacity ?? 0} orang
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Tag className="w-4 h-4 text-slate-400" /> {f.category || 'umum'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

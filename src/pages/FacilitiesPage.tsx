import { useEffect, useState, useMemo } from 'react';
import { Search, Building2, MapPin, Users, Filter } from 'lucide-react';
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
  image_url: string;
  facility_type: string;
  category: string;
  department: string;
  status: string;
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    supabase.from('facilities').select('*').order('name').then(({ data }) => {
      setFacilities((data as Facility[]) || []);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(facilities.map(f => f.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [facilities]);

  const filtered = useMemo(() => {
    return facilities.filter(f => {
      const matchSearch = !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description?.toLowerCase().includes(search.toLowerCase()) ||
        f.location?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'all' || f.category === category;
      return matchSearch && matchCategory;
    });
  }, [facilities, search, category]);

  const statusColor: Record<string, string> = {
    tersedia: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    digunakan: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    perbaikan: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="relative z-10 pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Daftar ruangan dan area yang tersedia di sekolah</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari fasilitas..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'Semua Kategori' : c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada fasilitas" message="Coba ubah kata kunci pencarian" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(f => (
              <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
                {f.image_url ? (
                  <img src={f.image_url} alt={f.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-blue-400 dark:text-slate-500" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                    {f.status && (
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', statusColor[f.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>
                        {f.status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{f.description || 'Tidak ada deskripsi'}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {f.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{f.location}</span>
                    )}
                    {f.capacity > 0 && (
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{f.capacity} orang</span>
                    )}
                    {f.category && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700">{f.category}</span>
                    )}
                  </div>
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

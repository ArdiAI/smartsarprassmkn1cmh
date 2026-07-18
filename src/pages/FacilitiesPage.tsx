import { useEffect, useState } from 'react';
import { Search, Building2, MapPin, Users, Loader2, Calendar } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

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

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/260931/pexels-photo-260931.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256652/pexels-photo-256652.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/159775/library-la-trobe-study-books-159775.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function fallbackImage(id: string) {
  const idx = id.charCodeAt(0) % FALLBACK_IMAGES.length;
  return FALLBACK_IMAGES[idx];
}

const statusStyles: Record<string, string> = {
  tersedia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  digunakan: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  perbaikan: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

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
          .order('created_at', { ascending: false });
        if (error) throw error;
        setFacilities((data as unknown as Facility[]) || []);
      } catch (e) {
        console.error('Failed to load facilities:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = facilities.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (f.category ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-500" /> Fasilitas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar fasilitas yang tersedia untuk dipinjam.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari fasilitas..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="h-44 bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="Fasilitas tidak ditemukan" description="Coba kata kunci lain." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((f) => {
              const img = f.image_url || fallbackImage(f.id);
              return (
                <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-44 bg-slate-200 dark:bg-slate-700">
                    <img src={img} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
                    {f.status && (
                      <span className={cn('absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium capitalize', statusStyles[f.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                        {f.status}
                      </span>
                    )}
                    {f.category && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 backdrop-blur">
                        {f.category}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{f.name}</h3>
                    {f.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{f.description}</p>}
                    <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {f.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" /> {f.location}
                        </div>
                      )}
                      {f.capacity != null && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" /> Kapasitas: {f.capacity} orang
                        </div>
                      )}
                      {f.manager_name && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" /> PJ: {f.manager_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && facilities.length > 0 && (
          <p className="text-center text-sm text-slate-400 mt-6 flex items-center justify-center gap-1">
            <Loader2 className="w-3 h-3" /> Menampilkan {filtered.length} dari {facilities.length} fasilitas
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}

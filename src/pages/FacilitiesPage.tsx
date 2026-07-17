import { useEffect, useState, useMemo } from 'react';
import { Search, Building2, MapPin, Users, Calendar } from 'lucide-react';
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
  manager_name: string;
  manager_role: string;
}

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256431/pexels-photo-256431.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/159775/library-books-education-students-159775.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3801466/pexels-photo-3801466.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function getFallbackImage(id: string): string {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

const statusColors: Record<string, string> = {
  tersedia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  digunakan: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  maintenance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
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
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return facilities;
    const q = search.toLowerCase();
    return facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q) ||
        f.facility_type?.toLowerCase().includes(q)
    );
  }, [facilities, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400">Daftar fasilitas yang tersedia di lingkungan sekolah</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari fasilitas berdasarkan nama, lokasi, atau kategori..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="h-48 bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <EmptyState
              icon={Building2}
              title="Tidak ada fasilitas ditemukan"
              description={search ? "Coba kata kunci lain" : "Belum ada fasilitas yang ditambahkan"}
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} fasilitas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((f) => (
                <div
                  key={f.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <div className="h-48 bg-slate-200 dark:bg-slate-700 overflow-hidden relative">
                    <img
                      src={f.image_url || getFallbackImage(f.id)}
                      alt={f.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackImage(f.id);
                      }}
                    />
                    {f.status && (
                      <span className={cn(
                        'absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium capitalize',
                        statusColors[f.status.toLowerCase()] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      )}>
                        {f.status}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      {f.facility_type && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {f.facility_type}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{f.name}</h3>
                    {f.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{f.description}</p>
                    )}
                    <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                      {f.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{f.location}</span>
                        </div>
                      )}
                      {f.capacity != null && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span>Kapasitas: {f.capacity} orang</span>
                        </div>
                      )}
                      {f.manager_name && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{f.manager_name}{f.manager_role ? ` · ${f.manager_role}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

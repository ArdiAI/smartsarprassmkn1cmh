import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, Building2, MapPin, Users, Loader2 } from 'lucide-react';
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
  facility_type: string | null;
  category: string | null;
  department: string | null;
  status: string | null;
  manager_name: string | null;
  manager_role: string | null;
  created_at: string;
}

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256431/pexels-photo-256431.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/159780/books-wall-texture-scholarship-shelves-159780.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/260687/pexels-photo-260687.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2074220/pexels-photo-2074220.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function getFallbackImage(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length];
}

const statusStyles: Record<string, string> = {
  aktif: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  tersedia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  tidak_aktif: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('facilities').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setFacilities((data as unknown as Facility[]) || []);
    } catch (err) {
      console.error('Error fetching facilities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const filtered = useMemo(() => {
    if (!search.trim()) return facilities;
    const q = search.toLowerCase();
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description?.toLowerCase().includes(q) ?? false) ||
        (f.location?.toLowerCase().includes(q) ?? false),
    );
  }, [facilities, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Jelajahi daftar fasilitas yang tersedia untuk peminjaman
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari fasilitas berdasarkan nama, lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="h-48 bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="Tidak ada fasilitas ditemukan" description="Coba ubah kata kunci pencarian" />
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} fasilitas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((facility) => {
                const imgUrl = facility.image_url || getFallbackImage(facility.name);
                return (
                  <div
                    key={facility.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow group"
                  >
                    <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                      <img
                        src={imgUrl}
                        alt={facility.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getFallbackImage(facility.name);
                        }}
                      />
                      {facility.status && (
                        <span className={cn(
                          'absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize',
                          statusStyles[facility.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                        )}>
                          {facility.status}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{facility.name}</h3>
                      {facility.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{facility.description}</p>
                      )}
                      <div className="space-y-2 text-sm">
                        {facility.location && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>{facility.location}</span>
                          </div>
                        )}
                        {facility.capacity != null && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>Kapasitas: {facility.capacity} orang</span>
                          </div>
                        )}
                        {facility.manager_name && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>{facility.manager_name}{facility.manager_role ? ` (${facility.manager_role})` : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

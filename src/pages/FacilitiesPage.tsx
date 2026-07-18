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
  description: string | null;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  facility_type: string | null;
  category: string | null;
  department: string | null;
  status: string | null;
  manager_name: string | null;
  created_at: string;
}

const fallbackImages = [
  'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1597805/pexels-photo-1597805.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3801468/pexels-photo-3801468.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/207693/pexels-photo-207693.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function getFallbackImage(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return fallbackImages[hash % fallbackImages.length];
}

const statusColors: Record<string, string> = {
  aktif: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  tersedia: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  nonaktif: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFacilities((data as unknown as Facility[]) || []);
      } catch (err) {
        console.error('Error fetching facilities:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFacilities();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return facilities;
    const q = search.toLowerCase();
    return facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q),
    );
  }, [facilities, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Jelajahi daftar fasilitas yang tersedia untuk peminjaman.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari fasilitas berdasarkan nama, lokasi, atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm animate-pulse">
                <div className="h-48 bg-slate-200 dark:bg-slate-700" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Tidak ada fasilitas ditemukan"
            description={search ? "Coba kata kunci lain." : "Belum ada fasilitas yang ditambahkan."}
          />
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} fasilitas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((facility) => (
                <div
                  key={facility.id}
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img
                      src={facility.image_url || getFallbackImage(facility.id)}
                      alt={facility.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackImage(facility.id);
                      }}
                    />
                    {facility.status && (
                      <span className={cn(
                        'absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium capitalize backdrop-blur-sm',
                        statusColors[facility.status?.toLowerCase()] || statusColors.nonaktif,
                      )}>
                        {facility.status}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                      {facility.name}
                    </h3>
                    {facility.category && (
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">
                        {facility.category}
                      </p>
                    )}
                    {facility.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">
                        {facility.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      {facility.location && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{facility.location}</span>
                        </div>
                      )}
                      {facility.capacity != null && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span>Kapasitas: {facility.capacity} orang</span>
                        </div>
                      )}
                      {facility.manager_name && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">PJ: {facility.manager_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

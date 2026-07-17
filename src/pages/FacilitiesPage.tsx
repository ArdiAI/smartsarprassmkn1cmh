import { useEffect, useState, useMemo } from 'react';
import { Search, MapPin, Users, Building, Package } from 'lucide-react';
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
}

const FALLBACK_IMAGES: string[] = [
  'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/159775/library-education-books-159775.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256431/pexels-photo-256431.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/207693/pexels-photo-207693.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/260689/pexels-photo-260689.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function FacilitySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
      <div className="h-48 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchFacilities = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('facilities')
        .select('id, name, description, location, capacity, image_url, facility_type, category')
        .order('name', { ascending: true });
      setFacilities((data as unknown as Facility[]) || []);
      setLoading(false);
    };
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
        f.category?.toLowerCase().includes(q)
    );
  }, [facilities, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-6 h-6 text-blue-500" />
            <h1 className="text-3xl font-bold">Fasilitas</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">Jelajahi daftar fasilitas yang tersedia di sekolah.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari fasilitas berdasarkan nama, lokasi, atau kategori..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <FacilitySkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building} title="Tidak ada fasilitas ditemukan" description="Coba ubah kata kunci pencarian Anda." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((facility, i) => {
              const image = facility.image_url || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
              return (
                <div
                  key={facility.id}
                  className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img
                      src={image}
                      alt={facility.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
                      }}
                    />
                    {facility.category && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-white/90 dark:bg-slate-900/90 text-blue-600 dark:text-blue-300 backdrop-blur-sm">
                        {facility.category}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">{facility.name}</h3>
                    {facility.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{facility.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      {facility.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {facility.location}
                        </span>
                      )}
                      {facility.capacity != null && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {facility.capacity} orang
                        </span>
                      )}
                      {facility.facility_type && (
                        <span className="inline-flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {facility.facility_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

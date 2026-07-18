import { useEffect, useState } from 'react';
import { Search, Building2, MapPin, Users, Calendar, Package } from 'lucide-react';
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

const pexelsFallback = (query: string, seed: number) =>
  `https://images.pexels.com/photos/${seed}/pexels-photo-${seed}.jpeg?auto=compress&cs=tinysrgb&w=800&dpr=1&query=${encodeURIComponent(query)}`;

const fallbackImages = [
  1648776, 256431, 207692, 120370, 318642, 159716, 210242, 380269,
];

function FacilitySkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="h-48 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
        <div className="flex gap-2 pt-2">
          <div className="h-7 w-20 bg-slate-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
          <div className="h-7 w-20 bg-slate-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, description, location, capacity, image_url, created_at, facility_type, category, department, status, manager_name, manager_role')
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

  const filtered = facilities.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.facility_type || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daftar fasilitas yang tersedia untuk dipinjam</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari fasilitas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <FacilitySkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="Fasilitas tidak ditemukan" description={search ? 'Coba kata kunci lain' : 'Belum ada fasilitas yang terdaftar'} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((facility, idx) => {
              const image = facility.image_url || pexelsFallback(facility.name, fallbackImages[idx % fallbackImages.length]);
              return (
                <div
                  key={facility.id}
                  className="group rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img
                      src={image}
                      alt={facility.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = pexelsFallback(facility.name, fallbackImages[idx % fallbackImages.length]);
                      }}
                    />
                    {facility.facility_type && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/80 text-xs font-medium text-slate-700 dark:text-slate-200 backdrop-blur-sm">
                        {facility.facility_type}
                      </span>
                    )}
                  </div>
                  {/* Body */}
                  <div className="p-5">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">{facility.name}</h3>
                    {facility.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{facility.description}</p>
                    )}
                    <div className="space-y-2 text-sm">
                      {facility.location && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span>{facility.location}</span>
                        </div>
                      )}
                      {facility.capacity != null && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Users className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                          <span>Kapasitas: {facility.capacity} orang</span>
                        </div>
                      )}
                      {facility.manager_name && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Package className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>PJ: {facility.manager_name}{facility.manager_role ? ` (${facility.manager_role})` : ''}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <Calendar className="w-3 h-3" />
                      <span>Ditambahkan {new Date(facility.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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

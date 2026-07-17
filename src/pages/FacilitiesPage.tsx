import { useState, useEffect } from 'react';
import { Search, Building2, MapPin, Users, Loader2 } from 'lucide-react';
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
  created_at: string;
}

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/2079249/pexels-photo-2079249.jpeg?auto=compress&cs=tinysrgb&w=600';

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchFacilities() {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, description, location, capacity, image_url, facility_type, category, department, status, manager_name, manager_role, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFacilities((data as unknown as Facility[]) || []);
      } catch (e) {
        console.error('Error fetching facilities:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchFacilities();
  }, []);

  const filtered = facilities.filter((f) =>
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    tersedia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    digunakan: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    perbaikan: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Fasilitas</h1>
          <p className="text-slate-600 dark:text-slate-400">Jelajahi daftar fasilitas yang tersedia di {`SMART SARPRAS`}</p>
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
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-pulse">
                <div className="h-48 bg-slate-200 dark:bg-slate-700" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="Tidak ada fasilitas ditemukan" description="Coba ubah kata kunci pencarian" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((facility) => (
              <div
                key={facility.id}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="relative h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <img
                    src={facility.image_url || FALLBACK_IMAGE}
                    alt={facility.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                  />
                  {facility.status && (
                    <span className={cn(
                      'absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium',
                      statusColors[facility.status?.toLowerCase()] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    )}>
                      {facility.status}
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{facility.name}</h3>
                  {facility.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{facility.description}</p>
                  )}
                  <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                    {facility.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{facility.location}</span>
                      </div>
                    )}
                    {facility.capacity != null && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Kapasitas: {facility.capacity} orang</span>
                      </div>
                    )}
                    {facility.facility_type && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{facility.facility_type}</span>
                      </div>
                    )}
                  </div>
                  {facility.manager_name && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Penanggung Jawab: <span className="font-medium text-slate-600 dark:text-slate-300">{facility.manager_name}</span>
                        {facility.manager_role && ` (${facility.manager_role})`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Loader2 className="w-4 h-4 opacity-0" />
            Menampilkan {filtered.length} fasilitas
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

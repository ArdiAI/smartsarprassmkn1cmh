import { useEffect, useState } from 'react';
import { Building2, Search, MapPin, Users, Calendar } from 'lucide-react';
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

const pexelsFallback = (seed: string) =>
  `https://images.pexels.com/photos/2079246/pexels-photo-2079246.jpeg?auto=compress&cs=tinysrgb&w=800`;

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
    (f.facility_type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daftar fasilitas yang tersedia untuk peminjaman</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari fasilitas berdasarkan nama, lokasi, atau jenis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-pulse">
                <div className="h-48 bg-slate-200 dark:bg-slate-700" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} title="Tidak ada fasilitas ditemukan" description="Coba ubah kata kunci pencarian Anda" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((f) => (
              <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <img
                    src={f.image_url || pexelsFallback(f.id)}
                    alt={f.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = pexelsFallback(f.id); }}
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                    {f.facility_type && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 whitespace-nowrap">
                        {f.facility_type}
                      </span>
                    )}
                  </div>
                  {f.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{f.description}</p>
                  )}
                  <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {f.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>{f.location}</span>
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
                        <span>PJ: {f.manager_name}{f.manager_role ? ` (${f.manager_role})` : ''}</span>
                      </div>
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

import { useEffect, useState, useMemo } from 'react';
import { Building2, Search, MapPin, Users, Loader2 } from 'lucide-react';
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
}

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/20787/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256431/pexels-photo-256431.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/260689/pexels-photo-260689.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/159775/library-790825_1280.jpg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256517/pexels-photo-256517.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function FacilitySkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-200 dark:bg-slate-700" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
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
    const fetchFacilities = async () => {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, description, location, capacity, image_url, facility_type, category, department, status, manager_name')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setFacilities((data as unknown as Facility[]) || []);
      } catch (err) {
        console.error('Failed to fetch facilities:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFacilities();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f) => f.name?.toLowerCase().includes(q) || f.location?.toLowerCase().includes(q));
  }, [facilities, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Fasilitas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 ml-13">
            Jelajahi daftar fasilitas yang tersedia untuk dipinjam.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari fasilitas berdasarkan nama atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => <FacilitySkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-8">
            <EmptyState icon={Building2} title="Tidak ada fasilitas ditemukan" description={search ? 'Coba kata kunci lain.' : 'Belum ada fasilitas yang terdaftar.'} />
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} fasilitas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((f, idx) => (
                <div key={f.id} className="card overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img
                      src={f.image_url || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]}
                      alt={f.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
                      }}
                    />
                    {f.facility_type && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 backdrop-blur">
                        {f.facility_type}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-1">{f.name}</h3>
                    {f.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{f.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {f.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {f.location}
                        </span>
                      )}
                      {f.capacity != null && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Kapasitas {f.capacity}
                        </span>
                      )}
                    </div>
                    {f.manager_name && (
                      <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        Penanggung Jawab: <span className="font-medium text-slate-600 dark:text-slate-300">{f.manager_name}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { Search, Building2, MapPin, Users, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';

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
}

const FALLBACK_IMAGES = [
  'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/260689/pexels-photo-260689.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/2079246/pexels-photo-2079246.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/159306/conference-room-meeting-people-159306.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function fallbackImage(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

function FacilitySkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="h-44 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="w-2/3 h-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="w-full h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="w-1/2 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    </div>
  );
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setFacilities((data as unknown as Facility[]) || []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return facilities;
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q) ||
        (f.location || '').toLowerCase().includes(q)
    );
  }, [facilities, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Daftar fasilitas yang tersedia di lingkungan sekolah.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari fasilitas..."
            className="input pl-10"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <FacilitySkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Building2}
              title="Tidak ada fasilitas ditemukan"
              description={search ? 'Coba kata kunci lain.' : 'Belum ada data fasilitas.'}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((f) => (
              <div key={f.id} className="card overflow-hidden group hover:shadow-md transition-shadow">
                <div className="h-44 overflow-hidden bg-slate-100 dark:bg-slate-700">
                  <img
                    src={f.image_url || fallbackImage(f.id)}
                    alt={f.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage(f.id);
                    }}
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                    {f.status && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 whitespace-nowrap">
                        {f.status}
                      </span>
                    )}
                  </div>
                  {f.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{f.description}</p>
                  )}
                  <div className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {f.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{f.location}</span>
                      </div>
                    )}
                    {f.capacity != null && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>Kapasitas: {f.capacity} orang</span>
                      </div>
                    )}
                  </div>
                  {f.manager_name && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Penanggung Jawab: <span className="font-medium text-slate-700 dark:text-slate-300">{f.manager_name}</span>
                        {f.manager_role && ` (${f.manager_role})`}
                      </p>
                    </div>
                  )}
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

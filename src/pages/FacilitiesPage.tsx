import { useEffect, useState, useMemo } from 'react';
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
  facility_type: string | null;
  category: string | null;
  department: string | null;
  status: string | null;
  created_at: string;
}

const fallbackImages = [
  'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256431/pexels-photo-256431.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1597112/pexels-photo-1597112.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/256566/pexels-photo-256566.jpeg?auto=compress&cs=tinysrgb&w=800',
];

function getFallbackImage(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return fallbackImages[hash % fallbackImages.length];
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
}

const statusStyles: Record<string, string> = {
  aktif: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  tersedia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  tidak_tersedia: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, description, location, capacity, image_url, facility_type, category, department, status, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setFacilities((data as unknown as Facility[]) || []);
      } catch (e) {
        console.error('Failed to load facilities:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.location?.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q),
    );
  }, [facilities, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-13">
            Jelajahi daftar fasilitas yang tersedia untuk dipinjam atau digunakan.
          </p>
        </section>

        {/* Search */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari fasilitas berdasarkan nama, lokasi, atau kategori..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </section>

        {/* Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="h-48 bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-4 w-full rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <EmptyState
                icon={Building2}
                title="Tidak ada fasilitas ditemukan"
                description={search ? "Coba kata kunci lain." : "Belum ada fasilitas yang ditambahkan."}
              />
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Menampilkan {filtered.length} fasilitas
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((f) => {
                  const img = f.image_url || getFallbackImage(f.id);
                  return (
                    <div
                      key={f.id}
                      className="group rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                    >
                      <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                        <img
                          src={img}
                          alt={f.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFallbackImage(f.id);
                          }}
                        />
                        {f.status && (
                          <span className={cn('absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium capitalize', statusStyles[f.status?.toLowerCase()] || 'bg-slate-100 text-slate-600')}>
                            {f.status}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{f.name}</h3>
                        {f.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{f.description}</p>
                        )}
                        <div className="mt-4 space-y-2 text-sm">
                          {f.location && (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span>{f.location}</span>
                            </div>
                          )}
                          {f.capacity != null && (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <Users className="w-4 h-4 flex-shrink-0" />
                              <span>Kapasitas: {f.capacity} orang</span>
                            </div>
                          )}
                          {f.facility_type && (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <Building2 className="w-4 h-4 flex-shrink-0" />
                              <span className="capitalize">{f.facility_type}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Ditambahkan {formatDate(f.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

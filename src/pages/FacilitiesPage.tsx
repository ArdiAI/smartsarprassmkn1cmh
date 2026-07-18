import { useEffect, useState } from 'react';
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
  created_at: string;
}

const fallbackImages = [
  'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/268415/pexels-photo-268415.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/159306/facility-building-construction-159306.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/210258/pexels-photo-210258.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/260931/pexels-photo-260931.jpeg?auto=compress&cs=tinysrgb&w=600',
];

const statusColors: Record<string, string> = {
  tersedia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  digunakan: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  maintenance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function FacilitySkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-48 bg-slate-200 dark:bg-slate-700" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
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
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setFacilities((data as unknown as Facility[]) || []);
      } catch (e) {
        console.error('Failed to fetch facilities:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchFacilities();
  }, []);

  const filtered = facilities.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase()) ||
    f.category?.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Jelajahi fasilitas yang tersedia untuk peminjaman.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari fasilitas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <FacilitySkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Tidak ada fasilitas ditemukan"
            description={search ? 'Coba kata kunci lain.' : 'Fasilitas akan muncul di sini.'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((f, idx) => {
              const img = f.image_url || fallbackImages[idx % fallbackImages.length];
              return (
                <div key={f.id} className="card overflow-hidden group hover:shadow-md transition-all">
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img
                      src={img}
                      alt={f.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImages[idx % fallbackImages.length];
                      }}
                    />
                    {f.status && (
                      <span className={cn(
                        'absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize',
                        statusColors[f.status?.toLowerCase()] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      )}>
                        {f.status}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{f.name}</h3>
                    {f.category && (
                      <span className="inline-block text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">{f.category}</span>
                    )}
                    {f.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{f.description}</p>
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
                          <span>{f.manager_name}{f.manager_role ? ` • ${f.manager_role}` : ''}</span>
                        </div>
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

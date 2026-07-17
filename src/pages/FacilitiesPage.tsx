import { useEffect, useState, useMemo } from 'react';
import { Search, Building2, MapPin, Users, Tag, Layers } from 'lucide-react';
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
}

const FALLBACK_IMG = 'https://images.pexels.com/photos/2079249/pexels-photo-2079249.jpeg?auto=compress&cs=tinysrgb&w=600';

function FacilityCard({ facility }: { facility: Facility }) {
  return (
    <div className="card overflow-hidden group hover:shadow-lg transition-all">
      <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img
          src={facility.image_url || FALLBACK_IMG}
          alt={facility.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
        />
        {facility.facility_type && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-900/90 text-xs font-medium text-slate-700 dark:text-slate-200 backdrop-blur">
            {facility.facility_type}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{facility.name}</h3>
        {facility.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{facility.description}</p>
        )}
        <div className="mt-4 space-y-2 text-sm">
          {facility.location && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{facility.location}</span>
            </div>
          )}
          {facility.capacity != null && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Users className="w-4 h-4 text-cyan-500 flex-shrink-0" />
              <span>Kapasitas: {facility.capacity} orang</span>
            </div>
          )}
          {facility.category && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Tag className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span>{facility.category}</span>
            </div>
          )}
          {facility.department && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{facility.department}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-48 bg-slate-200 dark:bg-slate-700" />
      <div className="p-5 space-y-3">
        <div className="w-2/3 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('id, name, description, location, capacity, image_url, facility_type, category, department')
          .order('name', { ascending: true });
        if (error) throw error;
        setFacilities((data ?? []) as unknown as Facility[]);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => facilities.filter(f => f.name.toLowerCase().includes(search.toLowerCase())),
    [facilities, search],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Daftar fasilitas yang tersedia</p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6 relative max-w-md">
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
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full">
              <EmptyState icon={Building2} title="Fasilitas tidak ditemukan" description={search ? 'Coba kata kunci lain.' : 'Belum ada fasilitas terdaftar.'} />
            </div>
          ) : (
            filtered.map(f => <FacilityCard key={f.id} facility={f} />)
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

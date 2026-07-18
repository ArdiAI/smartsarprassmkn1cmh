import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import {
  Building2, Search, Loader2, MapPin, Users, Calendar,
} from 'lucide-react';

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
  created_at: string;
}

const pexelsFallback = 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800';

function getFacilityImage(facility: Facility): string {
  if (facility.image_url) return facility.image_url;
  // Deterministic fallback based on facility name
  const fallbacks = [
    'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2566581/pexels-photo-2566581.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/260931/pexels-photo-260931.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/159775/library-1132576_1280.jpg?auto=compress&cs=tinysrgb&w=800',
  ];
  const hash = facility.name?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) ?? 0;
  return fallbacks[hash % fallbacks.length];
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('facilities')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFacilities((data as unknown as Facility[]) || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = facilities.filter(f =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase()) ||
    f.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" /> Fasilitas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar fasilitas yang tersedia untuk peminjaman</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari fasilitas berdasarkan nama, lokasi, atau kategori..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="h-48 bg-slate-200 dark:bg-slate-700" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Tidak ada fasilitas ditemukan"
            description={search ? 'Coba kata kunci lain' : 'Belum ada fasilitas yang ditambahkan'}
          />
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} fasilitas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(facility => (
                <div key={facility.id} className="card overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img
                      src={getFacilityImage(facility)}
                      alt={facility.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = pexelsFallback;
                      }}
                    />
                    {facility.status && (
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${facility.status === 'tersedia' || facility.status === 'available'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}>
                          {facility.status}
                        </span>
                      </div>
                    )}
                    {facility.facility_type && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
                          {facility.facility_type}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-1">{facility.name}</h3>
                    {facility.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{facility.description}</p>
                    )}
                    <div className="space-y-2 text-sm">
                      {facility.location && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span>{facility.location}</span>
                        </div>
                      )}
                      {facility.capacity != null && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span>Kapasitas: {facility.capacity} orang</span>
                        </div>
                      )}
                      {facility.category && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>Kategori: {facility.category}</span>
                        </div>
                      )}
                    </div>
                    {facility.manager_name && (
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          PJ: {facility.manager_name}{facility.manager_role ? ` (${facility.manager_role})` : ''}
                        </p>
                      </div>
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

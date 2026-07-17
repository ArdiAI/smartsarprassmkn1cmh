import { useEffect, useState } from 'react';
import { Search, Building, MapPin, Users } from 'lucide-react';
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
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('facilities').select('id, name, description, location, capacity, image_url').order('name').then(({ data }) => {
      setFacilities(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = facilities.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Fasilitas</h1>
          <p className="text-sm text-slate-500">Daftar fasilitas yang tersedia di sekolah.</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari fasilitas atau lokasi..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada fasilitas" message="Coba kata kunci lain." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(f => (
              <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
                {f.image_url ? (
                  <img src={f.image_url} alt={f.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                    <Building className="w-10 h-10 text-blue-400" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.name}</h3>
                  {f.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{f.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {f.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{f.location}</span>}
                    {f.capacity != null && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{f.capacity} orang</span>}
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

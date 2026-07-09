import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Users, X, Filter, Building2 } from 'lucide-react';
import { Facility } from '../types';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { cn } from '../utils/cn';

const facilityTypes = [
  { id: 'all', label: 'Semua' },
  { id: 'ruang', label: 'Ruang Kelas' },
  { id: 'lab', label: 'Laboratorium' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'perpustakaan', label: 'Perpustakaan' },
  { id: 'aula', label: 'Aula' },
];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  useEffect(() => {
    supabase
      .from('facilities')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setFacilities(data);
        setLoading(false);
      });
  }, []);

  const filtered = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === 'all' ||
      f.name.toLowerCase().includes(activeFilter.toLowerCase()) ||
      f.location.toLowerCase().includes(activeFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Fasilitas Sekolah</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Database sarana dan prasarana lengkap</p>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari fasilitas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                {facilityTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setActiveFilter(type.id)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      activeFilter === type.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="search" title="Tidak ada fasilitas" description="Coba ubah filter pencarian" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((facility, idx) => (
                <motion.div
                  key={facility.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedFacility(facility)}
                  className="group cursor-pointer bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all"
                >
                  <div className="aspect-video bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
                    {facility.image_url ? (
                      <img
                        src={facility.image_url}
                        alt={facility.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{facility.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {facility.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" /> {facility.capacity}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedFacility && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedFacility(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="relative">
                <div className="aspect-video bg-slate-100 dark:bg-slate-700">
                  {selectedFacility.image_url ? (
                    <img src={selectedFacility.image_url} alt={selectedFacility.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-24 h-24 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{selectedFacility.name}</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Lokasi</div>
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                      <MapPin className="w-4 h-4" /> {selectedFacility.location}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Kapasitas</div>
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                      <Users className="w-4 h-4" /> {selectedFacility.capacity} orang
                    </div>
                  </div>
                </div>
                {selectedFacility.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Deskripsi</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">{selectedFacility.description}</p>
                  </div>
                )}
                <Link
                  to="/borrow"
                  className="block w-full text-center py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:shadow-lg transition-all"
                >
                  Ajukan Peminjaman
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

import { Link } from 'react-router-dom';

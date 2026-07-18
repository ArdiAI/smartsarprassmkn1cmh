import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Calendar, MapPin, User, Clock, Loader2, Search } from 'lucide-react';

interface Agenda {
  id: string;
  title: string;
  category: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  organizer: string | null;
  penyelenggara: string | null;
  organisasi_jurusan: string | null;
  penanggung_jawab: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  rapat: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  kunjungan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  lomba: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ekstrakurikuler: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  sekolah: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300',
  terjadwal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  berlangsung: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  selesai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  dibatalkan: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function AgendaPage() {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('agendas')
        .select('*')
        .order('event_date', { ascending: true });
      if (!error) setAgendas((data as unknown as Agenda[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = agendas.filter(a => {
    if (categoryFilter !== 'all' && (a.category || 'sekolah') !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.organizer?.toLowerCase().includes(q) ||
        a.penyelenggara?.toLowerCase().includes(q) ||
        a.penanggung_jawab?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = ['all', 'rapat', 'kunjungan', 'lomba', 'ekstrakurikuler', 'sekolah'];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Agenda</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Daftar kegiatan dan agenda sekolah
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari agenda, lokasi, atau penyelenggara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            {categories.map(c => (
              <option key={c} value={c}>
                {c === 'all' ? 'Semua Kategori' : c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada agenda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(a => {
              const cat = a.category || 'sekolah';
              const status = a.status || 'draft';
              return (
                <div key={a.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[cat] || categoryColors.sekolah}`}>
                      {cat}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.draft}`}>
                      {status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{a.title}</h3>
                  <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(a.event_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {(a.start_time || a.end_time) && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {a.start_time?.slice(0, 5)} - {a.end_time?.slice(0, 5)}
                      </div>
                    )}
                    {a.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {a.location}
                      </div>
                    )}
                    {(a.penyelenggara || a.organizer) && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {a.penyelenggara || a.organizer}
                      </div>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-2">{a.description}</p>
                  )}
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

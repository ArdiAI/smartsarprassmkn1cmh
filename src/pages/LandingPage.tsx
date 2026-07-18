import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Building2, ClipboardList, Megaphone, ArrowRight, Clock,
  TrendingUp, Users, AlertCircle, Calendar, ChevronRight,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  published_at: string;
  created_at: string;
  author: string;
}

interface Stats {
  inventory: number;
  facilities: number;
  borrowings: number;
}

const quickLinks = [
  { to: '/fasilitas', label: 'Fasilitas', description: 'Lihat daftar fasilitas yang tersedia', icon: Building2, color: 'from-blue-500 to-blue-600' },
  { to: '/inventaris', label: 'Inventaris', description: 'Jelajahi barang inventaris sekolah', icon: Package, color: 'from-cyan-500 to-cyan-600' },
  { to: '/pinjam', label: 'Pinjam Barang', description: 'Ajukan peminjaman barang/fasilitas', icon: ClipboardList, color: 'from-blue-500 to-cyan-500' },
  { to: '/laporan', label: 'Laporan Kerusakan', description: 'Laporkan kerusakan sarana', icon: AlertCircle, color: 'from-amber-500 to-orange-500' },
  { to: '/riwayat', label: 'Riwayat Pinjam', description: 'Pantau status peminjaman Anda', icon: TrendingUp, color: 'from-emerald-500 to-green-500' },
  { to: '/tentang', label: 'Tentang Kami', description: 'Kenali sistem SMART SARPRAS', icon: Users, color: 'from-indigo-500 to-purple-500' },
];

const priorityStyles: Record<string, string> = {
  tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  rendah: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({ inventory: 0, facilities: 0, borrowings: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useClock();

  useEffect(() => {
    async function fetchData() {
      try {
        const [invRes, facRes, borRes, annRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase
            .from('announcements')
            .select('id, title, description, priority, status, published_at, created_at, author')
            .eq('status', 'aktif')
            .order('published_at', { ascending: false })
            .limit(5),
        ]);

        setStats({
          inventory: invRes.count ?? 0,
          facilities: facRes.count ?? 0,
          borrowings: borRes.count ?? 0,
        });
        setAnnouncements((annRes.data as unknown as Announcement[]) || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Fasilitas', value: stats.facilities, icon: Building2, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Total Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'from-emerald-500 to-green-600' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Clock className="w-4 h-4" />
              <span>
                {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} •{' '}
                {now.toLocaleTimeString('id-ID')}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">SMART SARPRAS</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Sistem Manajemen Sarana dan Prasarana Terpadu — Kelola inventaris, fasilitas, dan peminjaman dengan mudah, cepat, dan transparan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/pinjam"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all"
              >
                <ClipboardList className="w-5 h-5" />
                Ajukan Peminjaman
              </Link>
              <Link
                to="/fasilitas"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 transition-all"
              >
                <Building2 className="w-5 h-5" />
                Lihat Fasilitas
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', s.color)}>
                    <s.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    {loading ? (
                      <div className="space-y-2">
                        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Akses Cepat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:-translate-y-1"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', link.color)}>
                    <link.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{link.label}</h3>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{link.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
            <Megaphone className="w-6 h-6 text-blue-500" />
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman terbaru akan muncul di sini" />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {announcements.map((ann) => (
                  <li key={ann.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{ann.title}</h3>
                          {ann.priority && (
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', priorityStyles[ann.priority.toLowerCase()] || priorityStyles.rendah)}>
                              {ann.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{ann.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                          {ann.author && <span>oleh {ann.author}</span>}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ann.published_at || ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Siap memulai peminjaman?</h2>
            <p className="text-blue-50 mb-6 max-w-xl mx-auto">
              Ajukan peminjaman barang atau fasilitas hanya dalam beberapa langkah mudah.
            </p>
            <Link
              to="/pinjam"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
            >
              Mulai Peminjaman
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

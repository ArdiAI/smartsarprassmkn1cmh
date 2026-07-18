import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Building2, ClipboardList, Megaphone, ArrowRight, Clock,
  Boxes, FileText, History, Info, Sparkles, TrendingUp,
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
  published_at: string;
  author: string;
}

interface Stats {
  inventory: number;
  facilities: number;
  borrowings: number;
}

const quickLinks = [
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat daftar fasilitas tersedia', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Cek barang dan stok', icon: Boxes, color: 'from-cyan-500 to-teal-500' },
  { to: '/pinjam', label: 'Pinjam', desc: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-blue-500 to-indigo-500' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan', icon: FileText, color: 'from-amber-500 to-orange-500' },
  { to: '/riwayat', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: History, color: 'from-emerald-500 to-green-500' },
  { to: '/tentang', label: 'Tentang', desc: 'Tentang SMART SARPRAS', icon: Info, color: 'from-slate-500 to-slate-600' },
];

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return value;
  }
}

const priorityStyles: Record<string, string> = {
  tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  rendah: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({ inventory: 0, facilities: 0, borrowings: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [inv, fac, brw, ann] = await Promise.all([
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('facilities').select('*', { count: 'exact', head: true }),
          supabase.from('borrowings').select('*', { count: 'exact', head: true }),
          supabase
            .from('announcements')
            .select('id, title, description, priority, published_at, author')
            .eq('status', 'aktif')
            .order('published_at', { ascending: false })
            .limit(5),
        ]);
        setStats({
          inventory: inv.count ?? 0,
          facilities: fac.count ?? 0,
          borrowings: brw.count ?? 0,
        });
        setAnnouncements((ann.data as unknown as Announcement[]) || []);
      } catch (e) {
        console.error('Failed to load landing data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-500' },
    { label: 'Total Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-500' },
    { label: 'Total Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-emerald-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <AnimatedBackground />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Sistem Manajemen Sarana dan Prasarana Terpadu
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              SMART SARPRAS
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Kelola sarana dan prasarana dengan mudah. Pinjam barang, pesan fasilitas,
              laporkan kerusakan, dan pantau riwayat dalam satu platform terpadu.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/pinjam"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
              >
                <ClipboardList className="w-5 h-5" />
                Ajukan Peminjaman
              </Link>
              <Link
                to="/fasilitas"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Building2 className="w-5 h-5" />
                Lihat Fasilitas
              </Link>
            </div>

            {/* Realtime clock */}
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200 dark:border-slate-700">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-mono text-slate-600 dark:text-slate-300">
                {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' • '}
                {now.toLocaleTimeString('id-ID')}
              </span>
            </div>
          </div>
        </section>

        {/* Stats overview */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                      {loading ? (
                        <div className="mt-2 h-8 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      ) : (
                        <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                      )}
                    </div>
                    <div className={cn('w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-700/50 flex items-center justify-center', s.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Akses Cepat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0', link.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {link.label}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{link.desc}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Megaphone className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman akan muncul di sini ketika tersedia." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {announcements.map((a) => (
                  <li key={a.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                          {a.priority && (
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', priorityStyles[a.priority?.toLowerCase()] || priorityStyles.rendah)}>
                              {a.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{a.description}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {a.author && `oleh ${a.author} • `}
                          {a.published_at ? formatDate(a.published_at) : ''}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* CTA banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 p-8 sm:p-12 text-center">
            <TrendingUp className="w-10 h-10 text-white mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Mulai Kelola Sarpras Sekarang</h2>
            <p className="mt-2 text-blue-100">Ajukan peminjaman, laporkan kerusakan, dan pantau status dengan mudah.</p>
            <Link
              to="/pinjam"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-blue-600 font-medium hover:bg-blue-50 transition-colors"
            >
              Mulai Peminjaman <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

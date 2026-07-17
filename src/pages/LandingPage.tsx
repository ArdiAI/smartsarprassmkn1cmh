import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Building2, ClipboardList, Megaphone, ArrowRight, Clock,
  Boxes, FileWarning, History, Info, TrendingUp, Calendar,
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
  published_at: string | null;
  created_at: string;
  author: string | null;
}

interface Stats {
  inventory: number;
  facilities: number;
  borrowings: number;
}

const quickLinks = [
  { to: '/fasilitas', label: 'Fasilitas', description: 'Lihat daftar fasilitas tersedia', icon: Building2, color: 'from-blue-500 to-blue-600' },
  { to: '/inventaris', label: 'Inventaris', description: 'Jelajahi barang inventaris', icon: Boxes, color: 'from-cyan-500 to-cyan-600' },
  { to: '/pinjam', label: 'Pinjam', description: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-indigo-500 to-indigo-600' },
  { to: '/laporan', label: 'Laporan', description: 'Laporkan kerusakan barang', icon: FileWarning, color: 'from-amber-500 to-orange-500' },
  { to: '/riwayat', label: 'Riwayat', description: 'Riwayat peminjaman', icon: History, color: 'from-emerald-500 to-emerald-600' },
  { to: '/tentang', label: 'Tentang', description: 'Tentang SMART SARPRAS', icon: Info, color: 'from-slate-500 to-slate-600' },
];

function priorityBadge(priority: string) {
  switch ((priority || '').toLowerCase()) {
    case 'tinggi':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'sedang':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  }
}

function formatDate(d: string | null) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({ inventory: 0, facilities: 0, borrowings: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [inv, fac, brw, ann] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase
            .from('announcements')
            .select('id, title, description, priority, published_at, created_at, author')
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
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: 'Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" />
              Sistem Manajemen Sarana &amp; Prasarana
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                SMART SARPRAS
              </span>
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Sistem Manajemen Sarana dan Prasarana Terpadu — kelola inventaris,
              fasilitas, dan peminjaman dengan mudah dalam satu platform.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/pinjam"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                <ClipboardList className="w-5 h-5" />
                Ajukan Peminjaman
              </Link>
              <Link
                to="/fasilitas"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Lihat Fasilitas
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Realtime Clock */}
          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm">
              <Clock className="w-5 h-5 text-blue-500" />
              <div className="text-left">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-lg font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                  {now.toLocaleTimeString('id-ID', { hour12: false })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="card p-6 flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', s.bg)}>
                  <s.icon className={cn('w-6 h-6', s.color)} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  {loading ? (
                    <div className="w-16 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Akses Cepat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="card p-6 group hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className={cn('w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4', q.color)}>
                  <q.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {q.label}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{q.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Megaphone className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
          </div>
          <div className="card divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="w-1/3 h-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="w-2/3 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                </div>
              ))
            ) : announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman akan muncul di sini" />
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                      {a.priority && (
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', priorityBadge(a.priority))}>
                          {a.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{a.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(a.published_at || a.created_at)}
                      </span>
                      {a.author && <span>• {a.author}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

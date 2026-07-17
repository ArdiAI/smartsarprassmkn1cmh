import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Building2, ClipboardList, ArrowRight, Megaphone,
  History, FileText, Info, Clock, TrendingUp, Boxes, Calendar,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
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
  { to: '/inventaris', label: 'Inventaris', desc: 'Jelajahi inventaris barang', icon: Package, color: 'from-cyan-500 to-teal-500' },
  { to: '/pinjam', label: 'Pinjam', desc: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-blue-500 to-indigo-500' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan barang', icon: FileText, color: 'from-amber-500 to-orange-500' },
  { to: '/riwayat', label: 'Riwayat', desc: 'Riwayat peminjaman Anda', icon: History, color: 'from-emerald-500 to-green-500' },
  { to: '/tentang', label: 'Tentang', desc: 'Tentang sistem SMART SARPRAS', icon: Info, color: 'from-slate-500 to-slate-600' },
];

const priorityStyles: Record<string, string> = {
  tinggi: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
  sedang: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20',
  rendah: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20',
};

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({ inventory: 0, facilities: 0, borrowings: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Realtime clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [invRes, facRes, brwRes, annRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase
            .from('announcements')
            .select('id, title, description, priority, published_at, author')
            .eq('status', 'aktif')
            .order('published_at', { ascending: false })
            .limit(5),
        ]);

        setStats({
          inventory: invRes.count ?? 0,
          facilities: facRes.count ?? 0,
          borrowings: brwRes.count ?? 0,
        });
        setAnnouncements((annRes.data as unknown as Announcement[]) || []);
      } catch (err) {
        console.error('Failed to fetch landing data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <AnimatedBackground />

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 w-full">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4" />
            Sistem Manajemen Sarana dan Prasarana
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {brandConfig.system.name}
            </span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            {brandConfig.system.fullName}. Kelola, pinjam, dan laporkan sarana prasarana dengan mudah, cepat, dan transparan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/pinjam"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
            >
              <ClipboardList className="w-5 h-5" /> Ajukan Peminjaman
            </Link>
            <Link
              to="/fasilitas"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Lihat Fasilitas <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Realtime clock */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="text-blue-500 font-mono font-semibold tabular-nums">
              {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </section>

      {/* Stats overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="card p-6 flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.bg)}>
                <s.icon className={cn('w-6 h-6', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {loading ? '—' : s.value.toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Akses Cepat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0', link.color)}>
                  <link.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{link.label}</h3>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{link.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent announcements */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-500" /> Pengumuman Terbaru
          </h2>
          <Link to="/riwayat" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Lihat semua
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))
          ) : announcements.length === 0 ? (
            <div className="md:col-span-2">
              <div className="card p-8">
                <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman terbaru akan muncul di sini." />
              </div>
            </div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className={cn('card p-5 border-l-4', priorityStyles[a.priority?.toLowerCase()] ?? priorityStyles.rendah)}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    {a.published_at ? new Date(a.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{a.description}</p>
                {a.author && <p className="text-xs text-slate-400 mt-2">— {a.author}</p>}
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

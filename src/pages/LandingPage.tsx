import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Building2, ClipboardList, Megaphone, ArrowRight, Clock,
  Boxes, FileText, History, Info, TrendingUp, Loader2,
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
  status: string;
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
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat daftar fasilitas tersedia', icon: Building2, color: 'from-blue-500 to-blue-600' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Cek barang dan stok', icon: Boxes, color: 'from-cyan-500 to-cyan-600' },
  { to: '/pinjam', label: 'Pinjam', desc: 'Ajukan peminjaman baru', icon: ClipboardList, color: 'from-indigo-500 to-indigo-600' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan barang', icon: FileText, color: 'from-amber-500 to-amber-600' },
  { to: '/riwayat', label: 'Riwayat', desc: 'Riwayat peminjaman Anda', icon: History, color: 'from-emerald-500 to-emerald-600' },
  { to: '/tentang', label: 'Tentang', desc: 'Informasi sistem & tim', icon: Info, color: 'from-slate-500 to-slate-600' },
];

function priorityColor(priority: string): string {
  switch ((priority || '').toLowerCase()) {
    case 'tinggi': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'sedang': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
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
    const fetchAll = async () => {
      setLoading(true);
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
        setAnnouncements((annRes.data as unknown as Announcement[]) ?? []);
      } catch (e) {
        console.error('Failed to fetch landing data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const statCards = [
    { label: 'Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <AnimatedBackground />

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-6 shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-3xl">S</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {brandConfig.system.name}
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            {brandConfig.system.fullName}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Kelola sarana dan prasarana dengan mudah — pinjam, laporkan, dan pantau dalam satu sistem.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/pinjam"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
            >
              <ClipboardList className="w-5 h-5" /> Ajukan Peminjaman
            </Link>
            <Link
              to="/fasilitas"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              Lihat Fasilitas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Realtime clock */}
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200 dark:border-slate-700">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-mono text-slate-700 dark:text-slate-200">
              {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} •{' '}
              {now.toLocaleTimeString('id-ID')}
            </span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                  )}
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.bg)}>
                  <s.icon className={cn('w-6 h-6', s.color)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Announcements */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman akan muncul di sini." />
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', priorityColor(a.priority))}>
                      {a.priority || 'Normal'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {a.published_at
                        ? new Date(a.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{a.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-10 mb-16">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Akses Cepat</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', q.color)}>
                  <q.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{q.label}</h3>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{q.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

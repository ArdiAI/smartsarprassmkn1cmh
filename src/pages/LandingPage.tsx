import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Building2,
  ClipboardList,
  Megaphone,
  ArrowRight,
  Clock,
  TrendingUp,
  Wrench,
  Users,
  Info,
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
  { to: '/inventaris', label: 'Inventaris', desc: 'Cek barang inventaris', icon: Package, color: 'from-cyan-500 to-teal-500' },
  { to: '/pinjam', label: 'Pinjam', desc: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-blue-500 to-indigo-500' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan', icon: Wrench, color: 'from-amber-500 to-orange-500' },
  { to: '/riwayat', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: TrendingUp, color: 'from-emerald-500 to-green-500' },
  { to: '/tentang', label: 'Tentang', desc: 'Tentang sistem & tim', icon: Info, color: 'from-slate-500 to-slate-600' },
];

const priorityColors: Record<string, string> = {
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
    const fetchData = async () => {
      try {
        const [invRes, facRes, borRes, annRes] = await Promise.all([
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
          borrowings: borRes.count ?? 0,
        });
        setAnnouncements((annRes.data as unknown as Announcement[]) || []);
      } catch (e) {
        console.error('Failed to fetch landing data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-500' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-500' },
    { label: 'Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-indigo-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                SMART SARPRAS
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
              Sistem Manajemen Sarana dan Prasarana Terpadu — Kelola fasilitas, inventaris, dan peminjaman dengan mudah.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/pinjam"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                <ClipboardList className="w-5 h-5" />
                Ajukan Peminjaman
              </Link>
              <Link
                to="/fasilitas"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <Building2 className="w-5 h-5" />
                Lihat Fasilitas
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="card p-6 flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center', s.color)}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {loading ? '...' : s.value}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Megaphone className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman akan muncul di sini." />
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="card p-4 flex items-start gap-3">
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold capitalize', priorityColors[a.priority?.toLowerCase()] || priorityColors.rendah)}>
                    {a.priority || 'Normal'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{a.description}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {a.author && `${a.author} • `}
                      {a.published_at ? new Date(a.published_at).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Akses Cepat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="card p-6 group hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', q.color)}>
                    <q.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{q.label}</h3>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{q.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

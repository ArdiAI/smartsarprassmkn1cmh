import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Building2, ClipboardList, Megaphone, ArrowRight,
  Boxes, FileText, History, Info, Clock, TrendingUp,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import { supabase } from '../lib/supabase';
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
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat daftar fasilitas tersedia', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Jelajahi barang inventaris', icon: Boxes, color: 'from-cyan-500 to-teal-500' },
  { to: '/pinjam', label: 'Pinjam', desc: 'Ajukan peminjaman barang/fasilitas', icon: ClipboardList, color: 'from-blue-500 to-indigo-500' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan barang', icon: FileText, color: 'from-amber-500 to-orange-500' },
  { to: '/riwayat', label: 'Riwayat', desc: 'Riwayat peminjaman Anda', icon: History, color: 'from-emerald-500 to-green-500' },
  { to: '/tentang', label: 'Tentang', desc: 'Pelajari tentang sistem', icon: Info, color: 'from-slate-500 to-slate-600' },
];

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
        console.error('Error fetching landing data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case 'tinggi': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'sedang': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-500' },
    { label: 'Total Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-500' },
    { label: 'Total Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-emerald-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                {now.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">SMART SARPRAS</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
              Sistem Manajemen Sarana dan Prasarana Terpadu. Kelola inventaris, fasilitas, dan peminjaman dengan mudah dan efisien.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/pinjam"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/25 transition-colors"
              >
                <ClipboardList className="w-5 h-5" /> Ajukan Peminjaman
              </Link>
              <Link
                to="/fasilitas"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Building2 className="w-5 h-5" /> Lihat Fasilitas
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {loading ? '...' : s.value.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className={cn('w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center', s.color)}>
                    <s.icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <Megaphone className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Belum ada pengumuman tersedia.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', priorityBadge(a.priority))}>
                          {a.priority || 'normal'}
                        </span>
                        {a.author && <span className="text-xs text-slate-400">{a.author}</span>}
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{a.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{a.description}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {a.published_at ? new Date(a.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Akses Cepat</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', link.color)}>
                    <link.icon className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{link.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{link.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

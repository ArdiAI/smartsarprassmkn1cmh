import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Building2, ClipboardList, FileText, History,
  Info, ArrowRight, Clock, Bell, TrendingUp, Sparkles
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
  published_at: string;
  author: string;
}

interface Stats {
  inventory: number;
  facilities: number;
  borrowings: number;
}

const quickLinks = [
  { to: '/fasilitas', label: 'Fasilitas', description: 'Lihat daftar fasilitas tersedia', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { to: '/inventaris', label: 'Inventaris', description: 'Jelajahi barang inventaris', icon: Package, color: 'from-cyan-500 to-teal-500' },
  { to: '/pinjam', label: 'Pinjam', description: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-blue-500 to-indigo-500' },
  { to: '/laporan', label: 'Laporan', description: 'Laporkan kerusakan barang', icon: FileText, color: 'from-amber-500 to-orange-500' },
  { to: '/riwayat', label: 'Riwayat', description: 'Riwayat peminjaman Anda', icon: History, color: 'from-purple-500 to-pink-500' },
  { to: '/tentang', label: 'Tentang', description: 'Pelajari tentang sistem', icon: Info, color: 'from-slate-500 to-slate-600' },
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
          supabase.from('announcements').select('id, title, description, priority, status, published_at, author').eq('status', 'aktif').order('published_at', { ascending: false }).limit(5),
        ]);

        setStats({
          inventory: invRes.count ?? 0,
          facilities: facRes.count ?? 0,
          borrowings: borRes.count ?? 0,
        });
        setAnnouncements((annRes.data as unknown as Announcement[]) || []);
      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Total Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  const priorityColors: Record<string, string> = {
    tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    rendah: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {brandConfig.system.fullName}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                SMART SARPRAS
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              {brandConfig.system.tagline}. Kelola sarana dan prasarana dengan mudah, cepat, dan terpadu.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/pinjam"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
              >
                <ClipboardList className="w-5 h-5" />
                Ajukan Peminjaman
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/fasilitas"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <Building2 className="w-5 h-5" />
                Lihat Fasilitas
              </Link>
            </div>
          </div>
        </section>

        {/* Realtime Clock */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <Clock className="w-5 h-5" />
            <span className="text-lg font-mono font-medium">
              {now.toLocaleString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {statCards.map((stat, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.bg)}>
                    <stat.icon className={cn('w-6 h-6', stat.color)} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {loading ? '...' : stat.value}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            Akses Cepat
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', link.color)}>
                  <link.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-1">
                  {link.label}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{link.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-500" />
            Pengumuman Terbaru
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <EmptyState icon={Bell} title="Belum ada pengumuman" description="Pengumuman akan muncul di sini" />
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{ann.title}</h3>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                        priorityColors[ann.priority?.toLowerCase()] || priorityColors.rendah
                      )}>
                        {ann.priority || 'Normal'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{ann.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      {ann.author && <span>oleh {ann.author}</span>}
                      <span>•</span>
                      <span>{new Date(ann.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

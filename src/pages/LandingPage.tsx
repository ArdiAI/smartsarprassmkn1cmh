import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import {
  Building2,
  Package,
  ClipboardList,
  AlertTriangle,
  History,
  Info,
  ArrowRight,
  Clock,
  Megaphone,
  Loader2,
  Boxes,
  CalendarDays,
} from 'lucide-react';

interface Stats {
  inventory: number;
  facilities: number;
  borrowings: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

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
    const fetchAll = async () => {
      try {
        const [invRes, facRes, borRes, annRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase
            .from('announcements')
            .select('id, title, content, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        setStats({
          inventory: invRes.count ?? 0,
          facilities: facRes.count ?? 0,
          borrowings: borRes.count ?? 0,
        });
        setAnnouncements((annRes.data as unknown as Announcement[]) ?? []);
      } catch {
        // silent fail — stats just stay zero
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const quickLinks = [
    { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat daftar fasilitas tersedia', icon: Building2, color: 'from-blue-500 to-blue-600' },
    { to: '/inventaris', label: 'Inventaris', desc: 'Cek barang inventaris', icon: Package, color: 'from-cyan-500 to-cyan-600' },
    { to: '/pinjam', label: 'Pinjam', desc: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-emerald-500 to-emerald-600' },
    { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan', icon: AlertTriangle, color: 'from-amber-500 to-orange-600' },
    { to: '/riwayat', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: History, color: 'from-violet-500 to-purple-600' },
    { to: '/tentang', label: 'Tentang', desc: 'Info sistem', icon: Info, color: 'from-slate-500 to-slate-600' },
  ];

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Boxes, color: 'text-blue-500' },
    { label: 'Total Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-500' },
    { label: 'Total Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-emerald-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
              <Megaphone className="w-4 h-4" />
              {brandConfig.system.fullName}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                SMART SARPRAS
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              Sistem Manajemen Sarana dan Prasarana Terpadu. Kelola fasilitas, inventaris,
              peminjaman, dan laporan kerusakan dalam satu platform terpadu.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/pinjam"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
              >
                <ClipboardList className="w-5 h-5" />
                Ajukan Peminjaman
              </Link>
              <Link
                to="/fasilitas"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              >
                Lihat Fasilitas
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Realtime clock */}
            <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200 dark:border-slate-700">
              <Clock className="w-5 h-5 text-blue-500" />
              <div className="text-left">
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {now.toLocaleTimeString('id-ID', { hour12: false })}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                    {loading ? (
                      <Loader2 className="w-6 h-6 text-slate-300 dark:text-slate-600 animate-spin mt-2" />
                    ) : (
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Akses Cepat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center mb-4`}>
                  <link.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  {link.label}
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{link.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Megaphone className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman baru akan tampil di sini" />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {announcements.map((a) => (
                  <div key={a.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{a.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{a.content}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </div>
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

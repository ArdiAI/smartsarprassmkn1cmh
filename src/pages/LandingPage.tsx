import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Building2,
  ClipboardList,
  Megaphone,
  ArrowRight,
  Clock,
  Boxes,
  FileText,
  History,
  Info,
  Calendar,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import { cn } from '../utils/cn';

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: string;
  published_at: string;
  created_at: string;
}

interface Stats {
  inventory: number;
  facilities: number;
  borrowings: number;
}

const priorityColors: Record<string, string> = {
  tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  rendah: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const quickLinks = [
  { to: '/fasilitas', label: 'Fasilitas', description: 'Lihat daftar fasilitas tersedia', icon: Building2, color: 'from-blue-500 to-blue-600' },
  { to: '/inventaris', label: 'Inventaris', description: 'Cek barang inventaris', icon: Boxes, color: 'from-cyan-500 to-cyan-600' },
  { to: '/pinjam', label: 'Pinjam', description: 'Ajukan peminjaman barang/fasilitas', icon: ClipboardList, color: 'from-indigo-500 to-indigo-600' },
  { to: '/laporan', label: 'Laporan', description: 'Laporkan kerusakan', icon: FileText, color: 'from-rose-500 to-rose-600' },
  { to: '/riwayat', label: 'Riwayat', description: 'Riwayat peminjaman', icon: History, color: 'from-emerald-500 to-emerald-600' },
  { to: '/tentang', label: 'Tentang', description: 'Tentang sistem', icon: Info, color: 'from-slate-500 to-slate-600' },
];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
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
    async function fetchData() {
      try {
        const [invCount, facCount, borCount, annData] = await Promise.all([
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('facilities').select('*', { count: 'exact', head: true }),
          supabase.from('borrowings').select('*', { count: 'exact', head: true }),
          supabase
            .from('announcements')
            .select('id, title, description, priority, published_at, created_at')
            .eq('status', 'aktif')
            .order('published_at', { ascending: false })
            .limit(5),
        ]);

        setStats({
          inventory: invCount.count ?? 0,
          facilities: facCount.count ?? 0,
          borrowings: borCount.count ?? 0,
        });
        setAnnouncements((annData.data as unknown as Announcement[]) || []);
      } catch (err) {
        console.error('Error fetching landing data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Total Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium mb-6">
                <Calendar className="w-4 h-4" />
                {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {brandConfig.system.name}
              </h1>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-xl">
                {brandConfig.system.fullName}. Kelola sarana dan prasarana dengan mudah, transparan, dan terpadu.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/pinjam"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02]"
                >
                  <ClipboardList className="w-5 h-5" />
                  Ajukan Peminjaman
                </Link>
                <Link
                  to="/fasilitas"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                >
                  <Building2 className="w-5 h-5" />
                  Lihat Fasilitas
                </Link>
              </div>
            </div>

            {/* Realtime Clock Card */}
            <div className="hidden lg:flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl blur-2xl opacity-20" />
                <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-4">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Waktu Saat Ini</span>
                  </div>
                  <div className="text-6xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="mt-4 text-slate-500 dark:text-slate-400 capitalize">
                    {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {statCards.map((s) => (
                        <div key={s.label}>
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2', s.bg)}>
                            <s.icon className={cn('w-5 h-5', s.color)} />
                          </div>
                          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                            {loading ? '…' : s.value}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label.replace('Total ', '')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Overview (mobile + visible on all) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:hidden">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.bg)}>
                    <s.icon className={cn('w-6 h-6', s.color)} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {loading ? '…' : s.value}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop stats */}
          <div className="hidden lg:grid grid-cols-3 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.bg)}>
                    <s.icon className={cn('w-6 h-6', s.color)} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {loading ? '…' : s.value}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Akses Cepat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', link.color)}>
                    <link.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {link.label}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{link.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Megaphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 animate-pulse">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Belum ada pengumuman.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{ann.title}</h3>
                        {ann.priority && (
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', priorityColors[ann.priority] || priorityColors.rendah)}>
                            {ann.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{ann.description}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        {formatDate(ann.published_at || ann.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

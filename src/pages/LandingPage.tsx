import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import {
  Package, Building2, ClipboardList, Megaphone, ArrowRight, Calendar,
  CalendarClock, AlertTriangle, History, Info, Loader2, Sparkles,
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  published_at: string | null;
  created_at: string;
  author: string | null;
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
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat daftar fasilitas tersedia', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Cek barang dan stok tersedia', icon: Package, color: 'from-cyan-500 to-teal-500' },
  { to: '/pinjam', label: 'Pinjam', desc: 'Ajukan peminjaman barang/fasilitas', icon: ClipboardList, color: 'from-blue-500 to-indigo-500' },
  { to: '/agenda', label: 'Agenda', desc: 'Jadwal kegiatan sekolah', icon: Calendar, color: 'from-indigo-500 to-purple-500' },
  { to: '/timeline', label: 'Timeline', desc: 'Kalender gabungan kegiatan', icon: CalendarClock, color: 'from-purple-500 to-pink-500' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan barang', icon: AlertTriangle, color: 'from-amber-500 to-orange-500' },
  { to: '/riwayat', label: 'Riwayat', desc: 'Riwayat peminjaman Anda', icon: History, color: 'from-emerald-500 to-teal-500' },
  { to: '/tentang', label: 'Tentang', desc: 'Informasi & tim SMART SARPRAS', icon: Info, color: 'from-slate-500 to-slate-600' },
];

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({ inventory: 0, facilities: 0, borrowings: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [invRes, facRes, bwrRes, annRes] = await Promise.all([
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
        inventory: invRes.count || 0,
        facilities: facRes.count || 0,
        borrowings: bwrRes.count || 0,
      });
      setAnnouncements((annRes.data as unknown as Announcement[]) || []);
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Total Barang', value: stats.inventory, icon: Package },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2 },
    { label: 'Peminjaman', value: stats.borrowings, icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <AnimatedBackground />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {brandConfig.system.fullName}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {brandConfig.system.name}
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
              {brandConfig.system.tagline}
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:scale-105"
              >
                <Building2 className="w-5 h-5" />
                Lihat Fasilitas
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="card p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  {loading ? (
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Megaphone className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 dark:text-slate-400">
              <Megaphone className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p>Belum ada pengumuman aktif.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="card p-5 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {a.priority && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[a.priority] || priorityColors.rendah}`}>
                          {a.priority}
                        </span>
                      )}
                      {a.author && (
                        <span className="text-xs text-slate-400">oleh {a.author}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                    {a.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{a.description}</p>
                    )}
                  </div>
                  {a.published_at && (
                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                      {new Date(a.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Akses Cepat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="card p-5 hover:shadow-lg transition-all hover:-translate-y-1 group"
              >
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${link.color} flex items-center justify-center mb-3`}>
                  <link.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center justify-between">
                  {link.label}
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </h3>
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

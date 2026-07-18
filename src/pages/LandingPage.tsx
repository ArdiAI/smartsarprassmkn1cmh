import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Building2, ClipboardList, Calendar, AlertTriangle, History, Info,
  ArrowRight, Megaphone, Loader2, Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { brandConfig } from '../brand/config';

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

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({ inventory: 0, facilities: 0, borrowings: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inv, fac, bor, ann] = await Promise.all([
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
          inventory: inv.count || 0,
          facilities: fac.count || 0,
          borrowings: bor.count || 0,
        });
        setAnnouncements((ann.data as unknown as Announcement[]) || []);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = [
    { label: 'Inventaris', value: stats.inventory, icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'from-emerald-500 to-emerald-600' },
  ];

  const quickLinks = [
    { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat daftar fasilitas', icon: Building2, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
    { to: '/inventaris', label: 'Inventaris', desc: 'Cek barang tersedia', icon: Package, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { to: '/pinjam', label: 'Pinjam', desc: 'Ajukan peminjaman', icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { to: '/agenda', label: 'Agenda', desc: 'Jadwal kegiatan', icon: Calendar, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan', icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
    { to: '/riwayat', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: History, color: 'text-slate-600 bg-slate-100 dark:bg-slate-700/40' },
    { to: '/tentang', label: 'Tentang', desc: 'Tentang sistem', icon: Info, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  const priorityColors: Record<string, string> = {
    tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    rendah: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <AnimatedBackground />
      <Navbar />
      <main className="flex-1 relative">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              {brandConfig.system.fullName}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              SMART <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">SARPRAS</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8">
              {brandConfig.system.tagline}. Kelola sarana dan prasarana sekolah dengan lebih mudah, cepat, dan terpadu.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/pinjam" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-500/20">
                Ajukan Peminjaman <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/fasilitas" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Lihat Fasilitas
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="card p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : s.value}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
          </div>
          <div className="card p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman akan tampil di sini saat diterbitkan." />
            ) : (
              <div className="space-y-3">
                {announcements.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{a.title}</h3>
                        {a.priority && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[a.priority] || priorityColors.rendah}`}>
                            {a.priority}
                          </span>
                        )}
                      </div>
                      {a.description && <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{a.description}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        {a.published_at ? new Date(a.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {a.author && ` • ${a.author}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Quick Links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Akses Cepat</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickLinks.map(l => {
              const Icon = l.icon;
              return (
                <Link key={l.to} to={l.to} className="card p-5 hover:shadow-md transition-shadow group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${l.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5 group-hover:text-blue-600 transition-colors">{l.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{l.desc}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

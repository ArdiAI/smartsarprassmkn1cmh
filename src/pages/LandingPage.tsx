import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Building2, ClipboardList, FileText, History, Info,
  ArrowRight, Clock, Megaphone, TrendingUp, ChevronRight,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';
import { brandConfig } from '../brand/config';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Stats {
  inventory: number;
  facilities: number;
  borrowings: number;
}

const quickLinks = [
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat daftar fasilitas tersedia', icon: Building2, color: 'from-blue-500 to-blue-600' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Cek barang inventaris', icon: Package, color: 'from-cyan-500 to-cyan-600' },
  { to: '/pinjam', label: 'Pinjam', desc: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-indigo-500 to-indigo-600' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan', icon: FileText, color: 'from-amber-500 to-amber-600' },
  { to: '/riwayat', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: History, color: 'from-emerald-500 to-emerald-600' },
  { to: '/tentang', label: 'Tentang', desc: 'Tentang sistem', icon: Info, color: 'from-slate-500 to-slate-600' },
];

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white', color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
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
    (async () => {
      try {
        const [inv, fac, brw, ann] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('announcements').select('id, title, content, created_at').order('created_at', { ascending: false }).limit(5),
        ]);
        setStats({
          inventory: inv.count ?? 0,
          facilities: fac.count ?? 0,
          borrowings: brw.count ?? 0,
        });
        setAnnouncements((ann.data ?? []) as unknown as Announcement[]);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <AnimatedBackground />

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4" />
            Sistem Manajemen Sarana dan Prasarana Terpadu
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {brandConfig.system.name}
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 dark:text-slate-300">
            Kelola sarana dan prasarana dengan mudah. Pinjam barang, laporkan kerusakan, dan pantau
            status persetujuan dalam satu platform terpadu.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/pinjam"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
            >
              <ClipboardList className="w-5 h-5" /> Ajukan Peminjaman
            </Link>
            <Link
              to="/fasilitas"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              Lihat Fasilitas <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Realtime clock */}
          <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200 dark:border-slate-700">
            <Clock className="w-5 h-5 text-blue-500" />
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{timeStr}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{dateStr}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            <>
              {[0, 1, 2].map(i => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-2">
                      <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard icon={Package} label="Total Inventaris" value={stats.inventory} color="from-cyan-500 to-cyan-600" />
              <StatCard icon={Building2} label="Total Fasilitas" value={stats.facilities} color="from-blue-500 to-blue-600" />
              <StatCard icon={ClipboardList} label="Total Peminjaman" value={stats.borrowings} color="from-indigo-500 to-indigo-600" />
            </>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Akses Cepat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="card p-5 group hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white flex-shrink-0', link.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{link.label}</h3>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{link.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Announcements */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-12 mb-16">
        <div className="flex items-center gap-2 mb-6">
          <Megaphone className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
        </div>
        <div className="card p-6">
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="w-1/2 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                  <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman akan muncul di sini." />
          ) : (
            <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-700">
              {announcements.map(a => (
                <div key={a.id} className="pt-4 first:pt-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

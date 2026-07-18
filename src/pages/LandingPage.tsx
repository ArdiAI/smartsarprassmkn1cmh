import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import {
  Package, Building2, ClipboardList, ArrowRight, Clock,
  Megaphone, LayoutDashboard, FileText, Users, Info, Loader2,
  Calendar, ChevronRight, Wrench,
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: string;
  published_at: string;
  created_at: string;
  author: string;
}

interface Stats {
  inventoryCount: number;
  facilitiesCount: number;
  borrowingsCount: number;
}

const priorityColors: Record<string, string> = {
  tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  rendah: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({ inventoryCount: 0, facilitiesCount: 0, borrowingsCount: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useClock();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [invRes, facRes, borRes, annRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('announcements')
            .select('id, title, description, priority, published_at, created_at, author')
            .eq('status', 'aktif')
            .order('published_at', { ascending: false })
            .limit(5),
        ]);

        setStats({
          inventoryCount: invRes.count ?? 0,
          facilitiesCount: facRes.count ?? 0,
          borrowingsCount: borRes.count ?? 0,
        });
        setAnnouncements((annRes.data as unknown as Announcement[]) || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Package, color: 'from-blue-500 to-blue-600', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Total Fasilitas', value: stats.facilitiesCount, icon: Building2, color: 'from-cyan-500 to-cyan-600', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Total Peminjaman', value: stats.borrowingsCount, icon: ClipboardList, color: 'from-indigo-500 to-indigo-600', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  ];

  const quickLinks = [
    { label: 'Fasilitas', desc: 'Lihat daftar fasilitas', icon: LayoutDashboard, to: '/fasilitas', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Inventaris', desc: 'Lihat daftar barang', icon: Package, to: '/inventaris', color: 'bg-cyan-500 hover:bg-cyan-600' },
    { label: 'Pinjam', desc: 'Ajukan peminjaman', icon: ClipboardList, to: '/pinjam', color: 'bg-indigo-500 hover:bg-indigo-600' },
    { label: 'Laporan', desc: 'Laporkan kerusakan', icon: Wrench, to: '/laporan', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'Riwayat', desc: 'Riwayat peminjaman', icon: FileText, to: '/riwayat', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'Tentang', desc: 'Tentang sistem', icon: Info, to: '/tentang', color: 'bg-purple-500 hover:bg-purple-600' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <AnimatedBackground />

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <Clock className="w-4 h-4" />
            {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {now.toLocaleTimeString('id-ID')}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{brandConfig.system.name}</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            {brandConfig.system.fullName}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/pinjam" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30">
              <ClipboardList className="w-5 h-5" /> Ajukan Pinjaman
            </Link>
            <Link to="/fasilitas" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
              <Building2 className="w-5 h-5" /> Lihat Fasilitas
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))
          ) : (
            statCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{card.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                      <Icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Akses Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${link.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{link.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{link.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Announcements */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-500" /> Pengumuman Terbaru
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="Belum ada pengumuman" description="Pengumuman akan muncul di sini" />
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-900 dark:text-white">{a.title}</p>
                      {a.priority && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[a.priority?.toLowerCase()] || priorityColors.rendah}`}>
                          {a.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{a.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                      {a.author && <span>oleh {a.author}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.published_at || a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

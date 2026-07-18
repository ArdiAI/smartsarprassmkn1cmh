import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Package,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  History,
  Info,
  Megaphone,
  ArrowRight,
  Boxes,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { brand } from '../brand/config';
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
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Pesan & lihat fasilitas', icon: Building2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Daftar barang tersedia', icon: Package, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 dark:text-cyan-400' },
  { to: '/pinjam', label: 'Pengajuan Pinjam', desc: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-400' },
  { to: '/agenda', label: 'Agenda', desc: 'Catat kegiatan sekolah', icon: CalendarDays, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400' },
  { to: '/timeline', label: 'Timeline', desc: 'Kalender kegiatan', icon: CalendarRange, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { to: '/laporan', label: 'Laporan Kerusakan', desc: 'Laporkan kerusakan', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  { to: '/history', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: History, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
  { to: '/tentang', label: 'Tentang', desc: 'Tentang SMART SARPRAS', icon: Info, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400' },
];

const priorityStyles: Record<string, string> = {
  tinggi: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30',
  sedang: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30',
  rendah: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800',
  normal: 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/30',
};

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({ inventory: 0, facilities: 0, borrowings: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inv, fac, bor] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        ]);
        setStats({
          inventory: inv.count ?? 0,
          facilities: fac.count ?? 0,
          borrowings: bor.count ?? 0,
        });
      } catch {
        /* noop */
      } finally {
        setStatsLoading(false);
      }
    })();

    (async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('id, title, description, priority, status, published_at, created_at, author')
          .eq('status', 'aktif')
          .order('published_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        setAnnouncements((data as unknown as Announcement[]) ?? []);
      } catch {
        /* noop */
      } finally {
        setAnnLoading(false);
      }
    })();
  }, []);

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <AnimatedBackground />

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-12 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
            <Boxes className="h-4 w-4" />
            {brand.school}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">
              {brand.name}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            {brand.description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/pinjam" className="btn-primary px-6 py-3 text-base">
              <ClipboardList className="h-5 w-5" />
              Ajukan Peminjaman
            </Link>
            <Link to="/fasilitas" className="btn-secondary px-6 py-3 text-base">
              <Building2 className="h-5 w-5" />
              Lihat Fasilitas
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Inventaris" value={stats.inventory} loading={statsLoading} icon={Package} />
          <StatCard label="Total Fasilitas" value={stats.facilities} loading={statsLoading} icon={Building2} />
          <StatCard label="Total Peminjaman" value={stats.borrowings} loading={statsLoading} icon={ClipboardList} />
        </div>
      </section>

      {/* Announcements */}
      <section className="relative mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-brand-600" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengumuman</h2>
        </div>
        {annLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="card text-center text-sm text-slate-400">
            Belum ada pengumuman aktif.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'rounded-2xl border p-4',
                  priorityStyles[a.priority?.toLowerCase()] ?? priorityStyles.normal,
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                  {a.priority && (
                    <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                      {a.priority}
                    </span>
                  )}
                </div>
                {a.description && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {a.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  {a.author && <span>{a.author}</span>}
                  {a.author && a.published_at && <span>•</span>}
                  <span>{formatDate(a.published_at ?? a.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="relative mx-auto max-w-7xl px-4 py-8 pb-16">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Akses Cepat</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {quickLinks.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="card group flex flex-col gap-3 transition hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700"
            >
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', q.color)}>
                <q.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                  {q.label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{q.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  icon: Icon,
}: {
  label: string;
  value: number;
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
        <Icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        )}
      </div>
    </div>
  );
}

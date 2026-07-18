import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Building2,
  ClipboardList,
  CalendarDays,
  History,
  Phone,
  Info,
  ArrowRight,
  Megaphone,
  TrendingUp,
  Boxes,
  CalendarClock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AnimatedBackground from '../components/AnimatedBackground';
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

const quickLinks = [
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat & pinjam fasilitas', icon: Building2, color: 'text-blue-600 dark:text-blue-400' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Cek barang tersedia', icon: Package, color: 'text-cyan-600 dark:text-cyan-400' },
  { to: '/pinjam', label: 'Pengajuan Pinjam', desc: 'Ajukan peminjaman', icon: ClipboardList, color: 'text-emerald-600 dark:text-emerald-400' },
  { to: '/agenda', label: 'Agenda', desc: 'Buat agenda kegiatan', icon: CalendarDays, color: 'text-amber-600 dark:text-amber-400' },
  { to: '/timeline', label: 'Timeline', desc: 'Kalender kegiatan', icon: CalendarClock, color: 'text-purple-600 dark:text-purple-400' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan', icon: Phone, color: 'text-red-600 dark:text-red-400' },
  { to: '/history', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: History, color: 'text-slate-600 dark:text-slate-400' },
  { to: '/tentang', label: 'Tentang', desc: 'Tentang & tim kami', icon: Info, color: 'text-indigo-600 dark:text-indigo-400' },
];

export default function LandingPage() {
  const [stats, setStats] = useState({ inventory: 0, facilities: 0, borrowings: 0 });
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
            .select('id, title, description, priority, status, published_at, created_at, author')
            .eq('status', 'aktif')
            .order('published_at', { ascending: false })
            .limit(5),
        ]);
        setStats({
          inventory: inv.count ?? 0,
          facilities: fac.count ?? 0,
          borrowings: bor.count ?? 0,
        });
        setAnnouncements((ann.data as unknown as Announcement[]) ?? []);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Boxes, color: 'from-blue-500 to-cyan-500' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'from-cyan-500 to-teal-500' },
    { label: 'Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'from-brand-500 to-blue-600' },
  ];

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <AnimatedBackground />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <TrendingUp className="h-4 w-4" />
              {brand.school}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              {brand.name}
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              {brand.tagline}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {brand.description}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/pinjam" className="btn-primary w-full sm:w-auto">
                <ClipboardList className="h-4 w-4" />
                Ajukan Peminjaman
              </Link>
              <Link to="/fasilitas" className="btn-secondary w-full sm:w-auto">
                <Building2 className="h-4 w-4" />
                Lihat Fasilitas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((s) => (
            <div key={s.label} className="card flex items-center gap-4">
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white', s.color)}>
                <s.icon className="h-6 w-6" />
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
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengumuman</h2>
        </div>
        {announcements.length === 0 ? (
          <div className="card text-center text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Memuat pengumuman...' : 'Belum ada pengumuman aktif.'}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {announcements.map((a) => (
              <div key={a.id} className="card">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                  {a.priority && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        a.priority === 'tinggi'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          : a.priority === 'sedang'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                      )}
                    >
                      {a.priority}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{a.description}</p>
                {a.author && (
                  <p className="mt-3 text-xs text-slate-400">Oleh: {a.author}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Akses Cepat</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="card group flex flex-col gap-2 transition hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700"
            >
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800', q.color)}>
                <q.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{q.label}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{q.desc}</p>
              <div className="mt-auto flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-400">
                Buka
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

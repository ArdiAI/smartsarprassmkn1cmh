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
  PackageOpen,
  Users,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AnimatedBackground from '../components/AnimatedBackground';
import { brand } from '../brand/config';
import { cn } from '../utils/cn';

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  published_at: string | null;
  author: string | null;
}

const quickLinks = [
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat fasilitas sekolah', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Daftar barang tersedia', icon: Package, color: 'from-cyan-500 to-teal-500' },
  { to: '/pinjam', label: 'Pengajuan', desc: 'Ajukan peminjaman', icon: ClipboardList, color: 'from-brand-500 to-blue-600' },
  { to: '/agenda', label: 'Agenda', desc: 'Buat agenda kegiatan', icon: CalendarDays, color: 'from-indigo-500 to-brand-500' },
  { to: '/timeline', label: 'Timeline', desc: 'Kalender kegiatan', icon: CalendarRange, color: 'from-purple-500 to-indigo-500' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan', icon: PackageOpen, color: 'from-amber-500 to-orange-500' },
  { to: '/history', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: History, color: 'from-slate-500 to-slate-700' },
  { to: '/tentang', label: 'Tentang', desc: 'Tentang aplikasi', icon: Info, color: 'from-emerald-500 to-teal-500' },
];

const priorityStyles: Record<string, string> = {
  tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  rendah: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function LandingPage() {
  const [stats, setStats] = useState<{ inventory: number; facilities: number; borrowings: number }>({
    inventory: 0,
    facilities: 0,
    borrowings: 0,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inv, fac, brw, ann] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase
            .from('announcements')
            .select('id, title, description, priority, published_at, author')
            .eq('status', 'aktif')
            .order('published_at', { ascending: false })
            .limit(5),
        ]);
        setStats({
          inventory: inv.count ?? 0,
          facilities: fac.count ?? 0,
          borrowings: brw.count ?? 0,
        });
        setAnnouncements((ann.data as unknown as Announcement[]) ?? []);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <AnimatedBackground />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <Building2 className="h-4 w-4" />
              {brand.tagline}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              <span className="bg-gradient-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">
                {brand.name}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
              {brand.description}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/pinjam" className="btn-primary">
                <ClipboardList className="h-4 w-4" />
                Ajukan Peminjaman
              </Link>
              <Link to="/fasilitas" className="btn-secondary">
                <Building2 className="h-4 w-4" />
                Lihat Fasilitas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={Package}
            label="Total Inventaris"
            value={loading ? null : stats.inventory}
            color="bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"
          />
          <StatCard
            icon={Building2}
            label="Total Fasilitas"
            value={loading ? null : stats.facilities}
            color="bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300"
          />
          <StatCard
            icon={ClipboardList}
            label="Total Peminjaman"
            value={loading ? null : stats.borrowings}
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
          />
        </div>
      </section>

      {/* Announcements */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pengumuman Terbaru</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Belum ada pengumuman.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                      {a.priority && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            priorityStyles[a.priority.toLowerCase()] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                          )}
                        >
                          {a.priority}
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{a.description}</p>
                    )}
                    {a.author && (
                      <p className="mt-1 text-xs text-slate-400">Oleh: {a.author}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Akses Cepat</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="card group flex flex-col gap-3 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white', q.color)}>
                <q.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{q.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{q.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-600" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Building2;
  label: string;
  value: number | null;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {value === null ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        )}
      </div>
    </div>
  );
}

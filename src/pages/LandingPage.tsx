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
  FileText,
  ArrowRight,
  Megaphone,
  Loader2,
  Boxes,
  Users,
  ShoppingCart,
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
  created_at: string;
}

const quickLinks = [
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Lihat fasilitas sekolah', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Daftar barang tersedia', icon: Package, color: 'from-cyan-500 to-teal-500' },
  { to: '/pinjam', label: 'Pengajuan', desc: 'Ajukan peminjaman', icon: ClipboardList, color: 'from-brand-500 to-brand-600' },
  { to: '/agenda', label: 'Agenda', desc: 'Catat kegiatan sekolah', icon: CalendarDays, color: 'from-indigo-500 to-blue-500' },
  { to: '/timeline', label: 'Timeline', desc: 'Kalender kegiatan', icon: CalendarRange, color: 'from-purple-500 to-indigo-500' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan', icon: FileText, color: 'from-amber-500 to-orange-500' },
  { to: '/history', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: History, color: 'from-slate-500 to-slate-600' },
  { to: '/tentang', label: 'Tentang', desc: 'Tentang platform', icon: Info, color: 'from-teal-500 to-cyan-500' },
];

const priorityStyles: Record<string, string> = {
  tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  rendah: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
};

export default function LandingPage() {
  const [stats, setStats] = useState({ inventory: 0, facilities: 0, borrowings: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [invCount, facCount, borrowCount, annRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase
            .from('announcements')
            .select('id, title, description, priority, published_at, created_at')
            .eq('status', 'aktif')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        setStats({
          inventory: invCount.count ?? 0,
          facilities: facCount.count ?? 0,
          borrowings: borrowCount.count ?? 0,
        });
        setAnnouncements((annRes.data as unknown as Announcement[]) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = [
    { label: 'Inventaris', value: stats.inventory, icon: Boxes, color: 'text-brand-600 dark:text-brand-400' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Peminjaman', value: stats.borrowings, icon: ShoppingCart, color: 'text-purple-600 dark:text-purple-400' },
  ];

  return (
    <>
      {/* Hero Section — exactly ONE */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 py-20">
        <AnimatedBackground />
        <div className="relative mx-auto max-w-7xl px-4 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">{brand.name}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100 sm:text-xl">
            {brand.tagline}
          </p>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-brand-200">
            {brand.description}
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/pinjam"
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
            >
              <ClipboardList className="h-5 w-5" />
              Ajukan Peminjaman
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/fasilitas"
              className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <Building2 className="h-5 w-5" />
              Lihat Fasilitas
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="mx-auto -mt-10 max-w-5xl px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
                <stat.icon className={cn('h-6 w-6', stat.color)} />
              </div>
              <div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Announcements */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Belum ada pengumuman.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{ann.title}</h3>
                    {ann.priority && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          priorityStyles[ann.priority.toLowerCase()] ?? priorityStyles.rendah,
                        )}
                      >
                        {ann.priority}
                      </span>
                    )}
                  </div>
                  {ann.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{ann.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(ann.published_at ?? ann.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Akses Cepat</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white', link.color)}>
                <link.icon className="h-6 w-6" />
              </div>
              <h3 className="flex items-center gap-1 text-base font-semibold text-slate-900 dark:text-white">
                {link.label}
                <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{link.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

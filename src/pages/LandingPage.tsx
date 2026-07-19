import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Building2, Package, CalendarDays, CalendarRange,
  History, Flag, Info, ArrowRight, Megaphone, PackageCheck, Boxes, BookOpen,
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
  { to: '/fasilitas', label: 'Fasilitas', desc: 'Daftar Fasilitas', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { to: '/inventaris', label: 'Inventaris', desc: 'Daftar barang tersedia', icon: Package, color: 'from-cyan-500 to-teal-500' },
  { to: '/pinjam', label: 'Pengajuan Pinjam', desc: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-brand-500 to-blue-600' },
  { to: '/agenda', label: 'Agenda', desc: 'Catat kegiatan sekolah', icon: CalendarDays, color: 'from-indigo-500 to-brand-500' },
  { to: '/timeline', label: 'Timeline', desc: 'Kalender kegiatan', icon: CalendarRange, color: 'from-purple-500 to-indigo-500' },
  { to: '/laporan', label: 'Laporan', desc: 'Laporkan kerusakan', icon: Flag, color: 'from-rose-500 to-red-500' },
  { to: '/history', label: 'Riwayat', desc: 'Riwayat peminjaman', icon: History, color: 'from-amber-500 to-orange-500' },
  { to: '/tentang', label: 'Tentang', desc: 'Tentang SMART SARPRAS', icon: Info, color: 'from-slate-500 to-slate-600' },
];

function priorityBadge(p: string | null) {
  switch (p) {
    case 'tinggi': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'sedang': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  }
}

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
          supabase.from('announcements').select('id, title, description, priority, published_at, created_at').eq('status', 'aktif').order('created_at', { ascending: false }).limit(5),
        ]);
        setStats({
          inventory: inv.count ?? 0,
          facilities: fac.count ?? 0,
          borrowings: bor.count ?? 0,
        });
        setAnnouncements((ann.data as unknown as Announcement[]) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-24">
        <AnimatedBackground />
        <div className="relative mx-auto max-w-7xl px-4 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {brand.name}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            {brand.tagline}
          </p>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            {brand.description}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
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
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Total Inventaris', value: stats.inventory, icon: Boxes, color: 'text-brand-600' },
            { label: 'Fasilitas Tersedia', value: stats.facilities, icon: Building2, color: 'text-cyan-600' },
            { label: 'Total Peminjaman', value: stats.borrowings, icon: PackageCheck, color: 'text-emerald-600' },
          ].map((s) => (
            <div key={s.label} className="card flex items-center gap-4">
              <div className="rounded-xl bg-brand-50 p-3 dark:bg-slate-800">
                <s.icon className={cn('h-6 w-6', s.color)} />
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
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-brand-600" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengumuman</h2>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="card text-sm text-slate-500 dark:text-slate-400">Belum ada pengumuman aktif.</div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="card flex items-start gap-3">
                <span className={cn('mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', priorityBadge(a.priority))}>
                  {a.priority ?? 'normal'}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                  {a.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{a.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(a.published_at ?? a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-brand-600" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Akses Cepat</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((q) => (
            <Link key={q.to} to={q.to} className="card group transition hover:shadow-md hover:-translate-y-0.5">
              <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white', q.color)}>
                <q.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{q.label}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{q.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 group-hover:gap-2 transition-all">
                Buka <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

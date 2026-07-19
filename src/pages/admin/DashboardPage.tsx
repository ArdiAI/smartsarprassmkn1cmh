import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  TrendingUp,
  ClipboardList,
  AlertTriangle,
  CalendarPlus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchTodayCounts } from '../../lib/timeline';
import { cn } from '../../utils/cn';

interface Stats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
}

interface RecentBorrowing {
  id: string;
  borrower_name: string;
  status: string;
  borrow_date: string | null;
  item_type: string | null;
  purpose: string | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    inventoryCount: 0,
  });
  const [counts, setCounts] = useState({ agendaToday: 0, borrowToday: 0, weekTotal: 0 });
  const [recent, setRecent] = useState<RecentBorrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [b, pendingB, inv, recentB, todayCounts] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase
            .from('borrowings')
            .select('id, borrower_name, status, borrow_date, item_type, purpose')
            .order('created_at', { ascending: false })
            .limit(5),
          fetchTodayCounts(),
        ]);
        setStats({
          totalBorrowings: b.count ?? 0,
          pending: pendingB.count ?? 0,
          approved: (b.count ?? 0) - (pendingB.count ?? 0),
          inventoryCount: inv.count ?? 0,
        });
        setRecent((recentB.data as unknown as RecentBorrowing[]) ?? []);
        setCounts(todayCounts);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'bg-blue-500', text: 'text-blue-600' },
    { label: 'Menunggu Persetujuan', value: stats.pending, icon: Clock, color: 'bg-amber-500', text: 'text-amber-600' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'bg-emerald-500', text: 'text-emerald-600' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Package, color: 'bg-cyan-500', text: 'text-cyan-600' },
  ];

  const widgets = [
    { label: 'Agenda Hari Ini', value: counts.agendaToday, icon: CalendarDays, color: 'from-blue-500 to-blue-600' },
    { label: 'Peminjaman Hari Ini', value: counts.borrowToday, icon: ClipboardList, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Kegiatan Minggu Ini', value: counts.weekTotal, icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
  ];

  const quickActions = [
    { label: 'Peminjaman', icon: ClipboardList, path: '/admin/borrowings' },
    { label: 'Inventaris', icon: Package, path: '/admin/inventory' },
    { label: 'Laporan Kerusakan', icon: AlertTriangle, path: '/admin/reports' },
    { label: 'Buat Agenda', icon: CalendarPlus, path: '/admin/agenda' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ringkasan aktivitas sarana dan prasarana sekolah.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {loading ? '...' : s.value}
                </p>
              </div>
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl text-white', s.color)}>
                <s.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clickable widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {widgets.map((w) => (
          <button
            key={w.label}
            onClick={() => navigate('/admin/timeline')}
            className={cn(
              'group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-left text-white shadow-sm transition hover:shadow-md',
              w.color,
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{w.label}</p>
                <p className="mt-1 text-3xl font-bold">{loading ? '...' : w.value}</p>
              </div>
              <w.icon className="h-10 w-10 text-white/70" />
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium text-white/80 transition group-hover:text-white">
              Lihat di Timeline <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>

      {/* Recent + Quick actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Peminjaman Terbaru</h2>
            <button
              onClick={() => navigate('/admin/borrowings')}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Lihat semua <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada peminjaman.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {r.borrower_name ?? 'Tanpa nama'}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {r.purpose ?? r.item_type ?? 'Peminjaman'} • {r.borrow_date ?? '-'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                      r.status === 'approved' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                      r.status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                      r.status === 'rejected' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                      r.status === 'returned' && 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 p-4 text-center transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
              >
                <a.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

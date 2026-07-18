import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3, Package, Building2, ClipboardList, TrendingUp, Calendar,
  Clock, CheckCircle2, XCircle, AlertCircle, Loader2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingRow {
  id: string;
  status: string;
  created_at: string;
}

interface Stats {
  inventory: number;
  facilities: number;
  totalBorrowings: number;
  pending: number;
  approved: number;
  returned: number;
  rejected: number;
  completed: number;
  cancelled: number;
}

const initialStats: Stats = {
  inventory: 0,
  facilities: 0,
  totalBorrowings: 0,
  pending: 0,
  approved: 0,
  returned: 0,
  rejected: 0,
  completed: 0,
  cancelled: 0,
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-green-500',
  returned: 'bg-blue-500',
  rejected: 'bg-red-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-slate-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const statusIconColors: Record<string, string> = {
  pending: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  approved: 'text-green-500 bg-green-50 dark:bg-green-900/20',
  returned: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  rejected: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  completed: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  cancelled: 'text-slate-400 bg-slate-100 dark:bg-slate-700/30',
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>(initialStats);
  const [borrowings, setBorrowings] = useState<BorrowingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>(daysAgoStr(30));
  const [dateTo, setDateTo] = useState<string>(todayStr());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [invRes, facRes] = await Promise.all([
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('facilities').select('*', { count: 'exact', head: true }),
        ]);

        let brwData: BorrowingRow[] = [];
        let brwCount = 0;

        // Fetch borrowings with date filter
        let query = supabase
          .from('borrowings')
          .select('id, status, created_at')
          .order('created_at', { ascending: false });

        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

        const { data, count, error } = await query;
        if (error) throw error;
        brwData = (data as unknown as BorrowingRow[]) || [];
        brwCount = count ?? brwData.length;

        const computed: Stats = {
          ...initialStats,
          inventory: invRes.count ?? 0,
          facilities: facRes.count ?? 0,
          totalBorrowings: brwCount,
        };

        for (const b of brwData) {
          const s = b.status?.toLowerCase() ?? '';
          if (s in computed) (computed as any)[s]++;
        }

        setStats(computed);
        setBorrowings(brwData);
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo]);

  const maxStatus = useMemo(() => {
    const vals = Object.entries(statusLabels).map(([key]) => stats[key as keyof Stats] ?? 0);
    return Math.max(...vals, 1);
  }, [stats]);

  const overviewCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'from-blue-500 to-cyan-500', textColor: 'text-blue-500' },
    { label: 'Total Fasilitas', value: stats.facilities, icon: Building2, color: 'from-cyan-500 to-teal-500', textColor: 'text-cyan-500' },
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'from-emerald-500 to-green-500', textColor: 'text-emerald-500' },
  ];

  const statusBreakdown = Object.entries(statusLabels).map(([key, label]) => ({
    key,
    label,
    count: stats[key as keyof Stats] ?? 0,
    color: statusColors[key] || 'bg-slate-400',
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Rekap & Statistik</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Ringkasan data inventaris, fasilitas, dan peminjaman.
          </p>
        </section>

        {/* Date filter */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Dari Tanggal
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Sampai Tanggal
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDateFrom(daysAgoStr(7)); setDateTo(todayStr()); }}
                className="px-3 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                7 Hari
              </button>
              <button
                onClick={() => { setDateFrom(daysAgoStr(30)); setDateTo(todayStr()); }}
                className="px-3 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                30 Hari
              </button>
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="px-3 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Semua
              </button>
            </div>
          </div>
        </section>

        {/* Overview cards */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {overviewCards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{c.label}</p>
                      {loading ? (
                        <div className="mt-2 h-8 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      ) : (
                        <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{c.value}</p>
                      )}
                    </div>
                    <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', c.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Status breakdown bar chart */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-8 rounded-lg bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
                ))}
              </div>
            ) : stats.totalBorrowings === 0 ? (
              <div className="py-8 text-center">
                <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada data peminjaman pada rentang tanggal ini</p>
              </div>
            ) : (
              <div className="space-y-4">
                {statusBreakdown.map((s) => {
                  const pct = maxStatus > 0 ? (s.count / maxStatus) * 100 : 0;
                  return (
                    <div key={s.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.label}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{s.count}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', s.color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Status cards grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statusBreakdown.map((s) => {
              const Icon =
                s.key === 'pending' ? Clock :
                s.key === 'approved' ? CheckCircle2 :
                s.key === 'returned' ? ClipboardList :
                s.key === 'rejected' ? XCircle :
                s.key === 'completed' ? CheckCircle2 :
                AlertCircle;
              return (
                <div
                  key={s.key}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2', statusIconColors[s.key])}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {loading ? '–' : s.count}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Summary banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold text-white">Ringkasan Periode</h2>
                <p className="text-blue-100 mt-1 text-sm">
                  {dateFrom || dateTo
                    ? `${dateFrom || 'Awal'} s/d ${dateTo || 'Akhir'}`
                    : 'Semua waktu'}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{stats.totalBorrowings}</p>
                  <p className="text-sm text-blue-100">Total Peminjaman</p>
                </div>
                <div className="w-px h-12 bg-white/20" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{stats.inventory + stats.facilities}</p>
                  <p className="text-sm text-blue-100">Total Sarpras</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

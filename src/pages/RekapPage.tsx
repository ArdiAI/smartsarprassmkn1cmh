import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Building2,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Stats {
  totalInventory: number;
  totalFacilities: number;
  totalBorrowings: number;
  borrowingsByStatus: Record<string, number>;
}

const statusConfig: Record<string, { label: string; color: string; barColor: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', color: 'text-amber-600 dark:text-amber-400', barColor: 'bg-amber-500', icon: Clock },
  approved: { label: 'Disetujui', color: 'text-green-600 dark:text-green-400', barColor: 'bg-green-500', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'text-red-600 dark:text-red-400', barColor: 'bg-red-500', icon: XCircle },
  returned: { label: 'Dikembalikan', color: 'text-blue-600 dark:text-blue-400', barColor: 'bg-blue-500', icon: CheckCircle2 },
  completed: { label: 'Selesai', color: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500', icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan', color: 'text-slate-600 dark:text-slate-400', barColor: 'bg-slate-500', icon: XCircle },
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
  const [stats, setStats] = useState<Stats>({
    totalInventory: 0,
    totalFacilities: 0,
    totalBorrowings: 0,
    borrowingsByStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>(daysAgoStr(30));
  const [dateTo, setDateTo] = useState<string>(todayStr());

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        // Fetch counts
        const [invCount, facCount] = await Promise.all([
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('facilities').select('*', { count: 'exact', head: true }),
        ]);

        // Fetch borrowings with optional date filter
        let borrowingsQuery = supabase
          .from('borrowings')
          .select('id, status, created_at');

        if (dateFrom) {
          borrowingsQuery = borrowingsQuery.gte('created_at', dateFrom);
        }
        if (dateTo) {
          // Include the entire end day
          borrowingsQuery = borrowingsQuery.lte('created_at', `${dateTo}T23:59:59`);
        }

        const borResult = await borrowingsQuery;

        const borrowings = (borResult.data as any[]) || [];
        const byStatus: Record<string, number> = {};
        for (const b of borrowings) {
          const s = b.status || 'pending';
          byStatus[s] = (byStatus[s] || 0) + 1;
        }

        setStats({
          totalInventory: invCount.count ?? 0,
          totalFacilities: facCount.count ?? 0,
          totalBorrowings: borrowings.length,
          borrowingsByStatus: byStatus,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [dateFrom, dateTo]);

  const maxStatusCount = useMemo(() => {
    const vals = Object.values(stats.borrowingsByStatus);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [stats.borrowingsByStatus]);

  const summaryCards = [
    { label: 'Total Inventaris', value: stats.totalInventory, icon: Package, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Total Fasilitas', value: stats.totalFacilities, icon: Building2, color: 'from-cyan-500 to-cyan-600', textColor: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'from-indigo-500 to-indigo-600', textColor: 'text-indigo-600 dark:text-indigo-400' },
  ];

  const statusEntries = Object.entries(statusConfig);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Rekap & Statistik</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Ringkasan data sarana prasarana dan peminjaman.
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Dari Tanggal
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Sampai Tanggal
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setDateFrom(daysAgoStr(30));
                setDateTo(todayStr());
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', card.color)}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {loading ? '…' : card.value}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{card.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Borrowings by Status - Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                </div>
              ))}
            </div>
          ) : stats.totalBorrowings === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Belum ada data peminjaman pada rentang tanggal ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {statusEntries.map(([key, config]) => {
                const count = stats.borrowingsByStatus[key] || 0;
                const percentage = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
                const totalPct = stats.totalBorrowings > 0 ? (count / stats.totalBorrowings) * 100 : 0;
                const StatusIcon = config.icon;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn('w-4 h-4', config.color)} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-bold tabular-nums', config.color)}>{count}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">({totalPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="h-8 rounded-lg bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={cn('h-full rounded-lg transition-all duration-500', config.barColor)}
                        style={{ width: `${percentage}%`, minWidth: count > 0 ? '2rem' : '0' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Pending count */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {stats.borrowingsByStatus.pending || 0}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Menunggu Persetujuan</p>
              </div>
            </div>
          </div>

          {/* Approved count */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {stats.borrowingsByStatus.approved || 0}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Disetujui</p>
              </div>
            </div>
          </div>

          {/* Completed count */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {(stats.borrowingsByStatus.completed || 0) + (stats.borrowingsByStatus.returned || 0)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Selesai/Dikembalikan</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

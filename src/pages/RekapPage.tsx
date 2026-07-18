import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3, Package, Building2, ClipboardList, Calendar, TrendingUp,
  Clock, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Borrowing {
  id: string;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
}

interface Stats {
  inventory: number;
  facilities: number;
  totalBorrowings: number;
  byStatus: Record<string, number>;
}

const statusMeta: Record<string, { label: string; color: string; barColor: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', color: 'text-amber-600 dark:text-amber-400', barColor: 'bg-amber-500', icon: Clock },
  approved: { label: 'Disetujui', color: 'text-green-600 dark:text-green-400', barColor: 'bg-green-500', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'text-red-600 dark:text-red-400', barColor: 'bg-red-500', icon: XCircle },
  returned: { label: 'Dikembalikan', color: 'text-blue-600 dark:text-blue-400', barColor: 'bg-blue-500', icon: Package },
  completed: { label: 'Selesai', color: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500', icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan', color: 'text-slate-600 dark:text-slate-400', barColor: 'bg-slate-500', icon: XCircle },
};

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>({
    inventory: 0,
    facilities: 0,
    totalBorrowings: 0,
    byStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  async function fetchStats() {
    setLoading(true);
    try {
      let borrowingsQuery = supabase.from('borrowings').select('id, status, created_at');
      if (dateFrom) borrowingsQuery = borrowingsQuery.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) borrowingsQuery = borrowingsQuery.lte('created_at', `${dateTo}T23:59:59`);

      const [invRes, facRes, borRes] = await Promise.all([
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        borrowingsQuery,
      ]);

      const borrowings = (borRes.data as unknown as Borrowing[]) || [];
      const byStatus: Record<string, number> = {};
      for (const b of borrowings) {
        byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      }

      setStats({
        inventory: invRes.count ?? 0,
        facilities: facRes.count ?? 0,
        totalBorrowings: borrowings.length,
        byStatus,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxStatusCount = useMemo(() => {
    const vals = Object.values(stats.byStatus);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [stats.byStatus]);

  const summaryCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, gradient: 'from-blue-500 to-blue-600' },
    { label: 'Total Fasilitas', value: stats.facilities, icon: Building2, gradient: 'from-cyan-500 to-cyan-600' },
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, gradient: 'from-emerald-500 to-green-600' },
  ];

  const statusEntries = Object.entries(statusMeta);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Rekap & Statistik</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ringkasan data sarana, prasarana, dan peminjaman</p>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dari Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sampai Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Terapkan
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {summaryCards.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={cn('w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', s.gradient)}>
                  <s.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  {loading ? (
                    <div className="space-y-2">
                      <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-4 w-24 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Breakdown */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Peminjaman berdasarkan Status</h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-6 w-full bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : stats.totalBorrowings === 0 ? (
            <EmptyState icon={BarChart3} title="Belum ada data peminjaman" description="Statistik akan muncul setelah ada peminjaman" />
          ) : (
            <div className="space-y-4">
              {statusEntries.map(([key, meta]) => {
                const count = stats.byStatus[key] || 0;
                const percentage = stats.totalBorrowings > 0 ? Math.round((count / stats.totalBorrowings) * 100) : 0;
                const barWidth = maxStatusCount > 0 ? Math.max((count / maxStatusCount) * 100, count > 0 ? 4 : 0) : 0;
                const Icon = meta.icon;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('w-4 h-4', meta.color)} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={cn('font-semibold', meta.color)}>{count}</span>
                        <span className="text-slate-400 text-xs">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', meta.barColor)}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats Row */}
        {!loading && stats.totalBorrowings > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statusEntries.map(([key, meta]) => {
              const count = stats.byStatus[key] || 0;
              const Icon = meta.icon;
              return (
                <div
                  key={key}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center hover:shadow-md transition-shadow"
                >
                  <Icon className={cn('w-6 h-6 mx-auto mb-2', meta.color)} />
                  <p className={cn('text-2xl font-bold', meta.color)}>{count}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

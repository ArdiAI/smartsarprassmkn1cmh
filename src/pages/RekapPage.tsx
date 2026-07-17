import { useState, useEffect, useMemo } from 'react';
import {
  Package, Building2, ClipboardList, Loader2, Calendar, Filter,
  TrendingUp, CheckCircle, Clock, XCircle, BarChart3, RefreshCw
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Borrowing {
  id: string;
  status: string;
  created_at: string;
  borrow_date: string;
}

interface Stats {
  totalInventory: number;
  totalFacilities: number;
  totalBorrowings: number;
  borrowingsByStatus: Record<string, number>;
}

const statusConfig: Record<string, { label: string; color: string; barColor: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', color: 'text-amber-600 dark:text-amber-400', barColor: 'bg-amber-500', icon: Clock },
  approved: { label: 'Disetujui', color: 'text-green-600 dark:text-green-400', barColor: 'bg-green-500', icon: CheckCircle },
  returned: { label: 'Dikembalikan', color: 'text-blue-600 dark:text-blue-400', barColor: 'bg-blue-500', icon: CheckCircle },
  rejected: { label: 'Ditolak', color: 'text-red-600 dark:text-red-400', barColor: 'bg-red-500', icon: XCircle },
  completed: { label: 'Selesai', color: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', color: 'text-slate-600 dark:text-slate-400', barColor: 'bg-slate-500', icon: XCircle },
};

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>({
    totalInventory: 0,
    totalFacilities: 0,
    totalBorrowings: 0,
    borrowingsByStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo]);

  async function fetchStats() {
    setLoading(true);
    try {
      const [invRes, facRes] = await Promise.all([
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
      ]);

      let borQuery = supabase.from('borrowings').select('id, status, created_at, borrow_date');
      if (dateFrom) borQuery = borQuery.gte('borrow_date', dateFrom);
      if (dateTo) borQuery = borQuery.lte('borrow_date', dateTo);
      const borRes = await borQuery.order('created_at', { ascending: false });

      const borrowings = (borRes.data as unknown as Borrowing[]) || [];
      const byStatus: Record<string, number> = {};
      borrowings.forEach((b) => {
        byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      });

      setStats({
        totalInventory: invRes.count ?? 0,
        totalFacilities: facRes.count ?? 0,
        totalBorrowings: borrowings.length,
        borrowingsByStatus: byStatus,
      });
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setLoading(false);
    }
  }

  const maxStatusCount = useMemo(() => {
    const vals = Object.values(stats.borrowingsByStatus);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [stats.borrowingsByStatus]);

  const summaryCards = [
    { label: 'Total Inventaris', value: stats.totalInventory, icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Fasilitas', value: stats.totalFacilities, icon: Building2, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Rekap & Statistik</h1>
            <p className="text-slate-600 dark:text-slate-400">Ringkasan data sarana dan prasarana</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter Tanggal Peminjaman</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Dari Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Sampai Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="self-end px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {summaryCards.map((card, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', card.bg)}>
                  <card.icon className={cn('w-6 h-6', card.color)} />
                </div>
                <div>
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bar Chart: Borrowings by Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Peminjaman per Status
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : stats.totalBorrowings === 0 ? (
            <EmptyState icon={BarChart3} title="Belum ada data peminjaman" description="Data akan muncul setelah ada peminjaman diajukan" />
          ) : (
            <div className="space-y-4">
              {Object.entries(statusConfig).map(([key, cfg]) => {
                const count = stats.borrowingsByStatus[key] || 0;
                const percentage = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
                const totalPct = stats.totalBorrowings > 0 ? (count / stats.totalBorrowings) * 100 : 0;
                const Icon = cfg.icon;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('w-4 h-4', cfg.color)} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={cn('font-bold', cfg.color)}>{count}</span>
                        <span className="text-slate-400 dark:text-slate-500 text-xs">({totalPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="h-8 bg-slate-100 dark:bg-slate-700/50 rounded-lg overflow-hidden">
                      <div
                        className={cn('h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2', cfg.barColor)}
                        style={{ width: `${Math.max(percentage, count > 0 ? 8 : 0)}%` }}
                      >
                        {count > 0 && (
                          <span className="text-xs font-bold text-white">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Inventory Quick Stat */}
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-8 h-8" />
              <h3 className="text-lg font-bold">Inventaris</h3>
            </div>
            <p className="text-4xl font-bold mb-1">{loading ? '...' : stats.totalInventory}</p>
            <p className="text-blue-100 text-sm">Total barang terdaftar</p>
          </div>

          {/* Facilities Quick Stat */}
          <div className="bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-8 h-8" />
              <h3 className="text-lg font-bold">Fasilitas</h3>
            </div>
            <p className="text-4xl font-bold mb-1">{loading ? '...' : stats.totalFacilities}</p>
            <p className="text-indigo-100 text-sm">Total fasilitas terdaftar</p>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-8 flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Data rekap diperbarui secara real-time. Gunakan filter tanggal untuk melihat statistik peminjaman pada periode tertentu.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

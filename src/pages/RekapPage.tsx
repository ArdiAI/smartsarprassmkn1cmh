import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Building2,
  ClipboardList,
  TrendingUp,
  Loader2,
  Calendar,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingRow {
  id: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; barColor: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', color: 'text-amber-600 dark:text-amber-400', barColor: 'bg-amber-500', icon: Clock },
  approved: { label: 'Disetujui', color: 'text-green-600 dark:text-green-400', barColor: 'bg-green-500', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'text-red-600 dark:text-red-400', barColor: 'bg-red-500', icon: XCircle },
  returned: { label: 'Dikembalikan', color: 'text-blue-600 dark:text-blue-400', barColor: 'bg-blue-500', icon: RotateCcw },
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
  const [loading, setLoading] = useState(true);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [facilitiesCount, setFacilitiesCount] = useState(0);
  const [borrowings, setBorrowings] = useState<BorrowingRow[]>([]);
  const [startDate, setStartDate] = useState<string>(daysAgoStr(30));
  const [endDate, setEndDate] = useState<string>(todayStr());

  useEffect(() => {
    (async () => {
      try {
        const [invRes, facRes, brwRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id, status, created_at').order('created_at', { ascending: false }),
        ]);

        setInventoryCount(invRes.count ?? 0);
        setFacilitiesCount(facRes.count ?? 0);
        setBorrowings((brwRes.data as unknown as BorrowingRow[]) || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredBorrowings = useMemo(() => {
    return borrowings.filter((b) => {
      const date = b.created_at?.split('T')[0];
      if (!date) return false;
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });
  }, [borrowings, startDate, endDate]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of filteredBorrowings) {
      counts[b.status] = (counts[b.status] || 0) + 1;
    }
    return counts;
  }, [filteredBorrowings]);

  const totalBorrowings = filteredBorrowings.length;
  const maxCount = Math.max(1, ...Object.values(statusCounts));

  const summaryCards = [
    { label: 'Total Inventaris', value: inventoryCount, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Fasilitas', value: facilitiesCount, icon: Building2, color: 'from-cyan-500 to-teal-500' },
    { label: 'Total Peminjaman', value: totalBorrowings, icon: ClipboardList, color: 'from-indigo-500 to-blue-500' },
  ];

  const statuses = Object.keys(statusConfig);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Rekap & Statistik</h1>
          <p className="text-slate-500 dark:text-slate-400">Ringkasan data sarana, prasarana, dan peminjaman</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {summaryCards.map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.color)}>
                  <s.icon className="w-6 h-6" />
                </div>
                {loading ? (
                  <Loader2 className="w-5 h-5 text-slate-300 dark:text-slate-600 animate-spin" />
                ) : null}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {loading ? <span className="inline-block w-12 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Date Range Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Filter Tanggal Peminjaman</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => { setStartDate(daysAgoStr(30)); setEndDate(todayStr()); }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors whitespace-nowrap"
            >
              Reset
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Menampilkan {totalBorrowings} peminjaman dalam rentang tanggal terpilih
          </p>
        </div>

        {/* Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : totalBorrowings === 0 ? (
            <EmptyState icon={TrendingUp} title="Tidak ada data peminjaman" description="Tidak ada peminjaman dalam rentang tanggal ini" />
          ) : (
            <div className="space-y-4">
              {statuses.map((status) => {
                const config = statusConfig[status];
                const count = statusCounts[status] || 0;
                const percentage = totalBorrowings > 0 ? (count / totalBorrowings) * 100 : 0;
                const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <config.icon className={cn('w-4 h-4', config.color)} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{count}</span>
                        <span className="text-xs text-slate-400">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', config.barColor)}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Ringkasan Persetujuan</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Disetujui & Selesai</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {(statusCounts['approved'] || 0) + (statusCounts['completed'] || 0) + (statusCounts['returned'] || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Menunggu Persetujuan</span>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {statusCounts['pending'] || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Ditolak & Dibatalkan</span>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  {(statusCounts['rejected'] || 0) + (statusCounts['cancelled'] || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Tingkat Penyelesaian</h3>
            <div className="flex flex-col items-center justify-center py-4">
              {totalBorrowings === 0 ? (
                <p className="text-sm text-slate-400">Tidak ada data</p>
              ) : (
                <>
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-slate-700" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeLinecap="round"
                        className="text-blue-500"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - (((statusCounts['completed'] || 0) + (statusCounts['returned'] || 0)) / totalBorrowings))}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">
                        {(((statusCounts['completed'] || 0) + (statusCounts['returned'] || 0)) / totalBorrowings * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs text-slate-400">Selesai</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 text-center">
                    {(statusCounts['completed'] || 0) + (statusCounts['returned'] || 0)} dari {totalBorrowings} peminjaman
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

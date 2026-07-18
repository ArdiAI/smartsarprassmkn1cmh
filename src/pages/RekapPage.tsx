import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart3, Package, Building2, ClipboardList, Loader2, Calendar,
  TrendingUp, Clock, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: string;
  quantity: number;
  available_quantity: number | null;
  condition: 'good' | 'fair' | 'poor' | null;
}

interface Facility {
  id: string;
  status: string | null;
}

interface Borrowing {
  id: string;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  borrow_date: string;
  created_at: string;
}

interface Stats {
  totalInventory: number;
  totalFacilities: number;
  totalBorrowings: number;
  borrowingsByStatus: Record<string, number>;
  conditionCounts: { good: number; fair: number; poor: number };
  availableItems: number;
}

const borrowingStatusConfig: Record<string, { label: string; class: string; barClass: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', barClass: 'bg-amber-500', icon: Clock },
  approved: { label: 'Disetujui', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', barClass: 'bg-green-500', icon: CheckCircle },
  returned: { label: 'Dikembalikan', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', barClass: 'bg-blue-500', icon: CheckCircle },
  rejected: { label: 'Ditolak', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', barClass: 'bg-red-500', icon: XCircle },
  completed: { label: 'Selesai', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', barClass: 'bg-emerald-500', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', class: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', barClass: 'bg-slate-400', icon: XCircle },
};

const conditionConfig: Record<string, { label: string; barClass: string }> = {
  good: { label: 'Baik', barClass: 'bg-emerald-500' },
  fair: { label: 'Cukup', barClass: 'bg-amber-500' },
  poor: { label: 'Buruk', barClass: 'bg-red-500' },
};

const emptyStats: Stats = {
  totalInventory: 0,
  totalFacilities: 0,
  totalBorrowings: 0,
  borrowingsByStatus: {},
  conditionCounts: { good: 0, fair: 0, poor: 0 },
  availableItems: 0,
};

function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(dateStr));
}

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, facRes] = await Promise.all([
        supabase.from('inventory').select('id, quantity, available_quantity, condition'),
        supabase.from('facilities').select('id, status'),
      ]);

      const inventory = (invRes.data as unknown as InventoryItem[]) || [];
      const facilities = (facRes.data as unknown as Facility[]) || [];

      // Fetch borrowings with optional date filter
      let borrowingsQuery = supabase.from('borrowings').select('id, status, borrow_date, created_at');
      if (startDate) borrowingsQuery = borrowingsQuery.gte('borrow_date', startDate);
      if (endDate) borrowingsQuery = borrowingsQuery.lte('borrow_date', endDate);
      const borRes = await borrowingsQuery;
      const borrowings = (borRes.data as unknown as Borrowing[]) || [];

      const borrowingsByStatus: Record<string, number> = {};
      borrowings.forEach((b) => {
        borrowingsByStatus[b.status] = (borrowingsByStatus[b.status] || 0) + 1;
      });

      const conditionCounts = { good: 0, fair: 0, poor: 0 };
      inventory.forEach((item) => {
        if (item.condition && item.condition in conditionCounts) {
          conditionCounts[item.condition as keyof typeof conditionCounts]++;
        }
      });

      const availableItems = inventory.filter((i) => (i.available_quantity ?? 0) > 0).length;

      setStats({
        totalInventory: inventory.length,
        totalFacilities: facilities.length,
        totalBorrowings: borrowings.length,
        borrowingsByStatus,
        conditionCounts,
        availableItems,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const summaryCards = useMemo(() => [
    { label: 'Total Inventaris', value: stats.totalInventory, icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Fasilitas', value: stats.totalFacilities, icon: Building2, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Item Tersedia', value: stats.availableItems, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ], [stats]);

  const maxBorrowingStatus = Math.max(1, ...Object.values(stats.borrowingsByStatus));
  const maxCondition = Math.max(1, stats.conditionCounts.good, stats.conditionCounts.fair, stats.conditionCounts.poor);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Rekap & Statistik</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Ringkasan data sarana, prasarana, dan peminjaman
          </p>
        </div>

        {/* Date Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Dari Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sampai Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
          {(startDate || endDate) && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Filter: {startDate ? formatDateShort(startDate) : 'Awal'} — {endDate ? formatDateShort(endDate) : 'Sekarang'}
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', card.bg)}>
                <card.icon className={cn('w-5 h-5', card.color)} />
              </div>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Borrowings by Status Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">Peminjaman per Status</h2>
              </div>
              {stats.totalBorrowings === 0 ? (
                <EmptyState icon={AlertCircle} title="Tidak ada data peminjaman" />
              ) : (
                <div className="space-y-4">
                  {Object.entries(borrowingStatusConfig).map(([key, config]) => {
                    const count = stats.borrowingsByStatus[key] || 0;
                    const percentage = maxBorrowingStatus > 0 ? (count / maxBorrowingStatus) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{config.label}</span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{count}</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', config.barClass)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Inventory Condition Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Package className="w-5 h-5 text-cyan-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">Kondisi Inventaris</h2>
              </div>
              {stats.totalInventory === 0 ? (
                <EmptyState icon={AlertCircle} title="Tidak ada data inventaris" />
              ) : (
                <div className="space-y-4">
                  {Object.entries(conditionConfig).map(([key, config]) => {
                    const count = stats.conditionCounts[key as keyof typeof stats.conditionCounts] || 0;
                    const percentage = maxCondition > 0 ? (count / maxCondition) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{config.label}</span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{count}</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', config.barClass)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Item Tersedia</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.availableItems} / {stats.totalInventory}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

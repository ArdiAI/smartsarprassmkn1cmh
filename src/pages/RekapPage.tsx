import { useEffect, useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import {
  BarChart3, Package, Building2, ClipboardList, Loader2,
  Calendar, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';

interface Stats {
  totalInventory: number;
  totalFacilities: number;
  totalBorrowings: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  returnedCount: number;
  completedCount: number;
  cancelledCount: number;
}

interface DailyBorrowing {
  date: string;
  count: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-500', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Ditolak', color: 'bg-red-500', icon: XCircle },
  returned: { label: 'Dikembalikan', color: 'bg-blue-500', icon: Package },
  completed: { label: 'Selesai', color: 'bg-emerald-500', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-500', icon: XCircle },
};

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>({
    totalInventory: 0,
    totalFacilities: 0,
    totalBorrowings: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    returnedCount: 0,
    completedCount: 0,
    cancelledCount: 0,
  });
  const [dailyBorrowings, setDailyBorrowings] = useState<DailyBorrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Default to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const fetchData = async (start: string, end: string) => {
    setLoading(true);
    try {
      const [invRes, facRes, allBorRes] = await Promise.all([
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id, status, created_at, borrow_date'),
      ]);

      let borrowings = (allBorRes.data as any[]) || [];

      // Filter by date range if provided
      if (start && end) {
        borrowings = borrowings.filter(b => {
          const d = b.borrow_date || b.created_at?.split('T')[0];
          return d && d >= start && d <= end;
        });
      }

      const statusCounts: Record<string, number> = {};
      borrowings.forEach(b => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });

      setStats({
        totalInventory: invRes.count ?? 0,
        totalFacilities: facRes.count ?? 0,
        totalBorrowings: borrowings.length,
        pendingCount: statusCounts['pending'] || 0,
        approvedCount: statusCounts['approved'] || 0,
        rejectedCount: statusCounts['rejected'] || 0,
        returnedCount: statusCounts['returned'] || 0,
        completedCount: statusCounts['completed'] || 0,
        cancelledCount: statusCounts['cancelled'] || 0,
      });

      // Daily borrowings for chart (last 7 days within range)
      const dailyMap: Record<string, number> = {};
      borrowings.forEach(b => {
        const d = (b.borrow_date || b.created_at?.split('T')[0]) ?? '';
        if (d) dailyMap[d] = (dailyMap[d] || 0) + 1;
      });

      // Generate last 7 days
      const days: DailyBorrowing[] = [];
      const endD = end ? new Date(end) : new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(endD);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        days.push({ date: ds, count: dailyMap[ds] || 0 });
      }
      setDailyBorrowings(days);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchData(startDate, endDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const maxDaily = useMemo(() => Math.max(...dailyBorrowings.map(d => d.count), 1), [dailyBorrowings]);

  const statusBreakdown = [
    { key: 'pending', count: stats.pendingCount },
    { key: 'approved', count: stats.approvedCount },
    { key: 'rejected', count: stats.rejectedCount },
    { key: 'returned', count: stats.returnedCount },
    { key: 'completed', count: stats.completedCount },
    { key: 'cancelled', count: stats.cancelledCount },
  ];

  const maxStatus = Math.max(...statusBreakdown.map(s => s.count), 1);

  const summaryCards = [
    { label: 'Total Inventaris', value: stats.totalInventory, icon: Package, color: 'from-blue-500 to-blue-600', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Total Fasilitas', value: stats.totalFacilities, icon: Building2, color: 'from-cyan-500 to-cyan-600', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'from-indigo-500 to-indigo-600', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" /> Rekap & Statistik
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan aktivitas sarana dan prasarana</p>
        </div>

        {/* Date Range Filter */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-blue-500" /> Rentang Tanggal:
            </div>
            <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
              <div className="flex-1">
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Dari</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Sampai</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {summaryCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{card.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                        <Icon className={`w-6 h-6 ${card.iconColor}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Borrowings Chart */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" /> Peminjaman 7 Hari Terakhir
                </h2>
                {dailyBorrowings.every(d => d.count === 0) ? (
                  <EmptyState icon={BarChart3} title="Tidak ada data" description="Belum ada peminjaman dalam rentang ini" />
                ) : (
                  <div className="space-y-2">
                    {dailyBorrowings.map(d => (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">
                          {new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                        <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-700/30 rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${(d.count / maxDaily) * 100}%` }}
                          >
                            {d.count > 0 && (
                              <span className="text-xs font-bold text-white">{d.count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Breakdown */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-500" /> Status Peminjaman
                </h2>
                {stats.totalBorrowings === 0 ? (
                  <EmptyState icon={ClipboardList} title="Tidak ada data" description="Belum ada peminjaman dalam rentang ini" />
                ) : (
                  <div className="space-y-3">
                    {statusBreakdown.map(s => {
                      const cfg = statusConfig[s.key];
                      const Icon = cfg.icon;
                      const pct = stats.totalBorrowings > 0 ? (s.count / stats.totalBorrowings) * 100 : 0;
                      return (
                        <div key={s.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5" /> {cfg.label}
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{s.count}</span>
                          </div>
                          <div className="h-3 bg-slate-100 dark:bg-slate-700/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${cfg.color} rounded-full transition-all`}
                              style={{ width: `${(s.count / maxStatus) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{pct.toFixed(1)}% dari total</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Overall Summary */}
            <div className="card p-6 mt-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Ringkasan Periode</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalBorrowings}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Peminjaman</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.approvedCount + stats.completedCount}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Disetujui/Selesai</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingCount}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Menunggu</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejectedCount + stats.cancelledCount}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ditolak/Dibatalkan</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

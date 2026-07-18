import { useEffect, useState } from 'react';
import {
  BarChart3,
  Package,
  Building2,
  ClipboardList,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
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

interface Stats {
  totalInventory: number;
  totalFacilities: number;
  totalBorrowings: number;
  pendingCount: number;
  approvedCount: number;
  returnedCount: number;
  rejectedCount: number;
  completedCount: number;
  cancelledCount: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-500', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-green-500', icon: CheckCircle2 },
  returned: { label: 'Dikembalikan', color: 'bg-blue-500', icon: RotateCcw },
  rejected: { label: 'Ditolak', color: 'bg-red-500', icon: XCircle },
  completed: { label: 'Selesai', color: 'bg-emerald-500', icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-400', icon: XCircle },
};

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>({
    totalInventory: 0,
    totalFacilities: 0,
    totalBorrowings: 0,
    pendingCount: 0,
    approvedCount: 0,
    returnedCount: 0,
    rejectedCount: 0,
    completedCount: 0,
    cancelledCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch counts
        const [invRes, facRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
        ]);

        // Fetch borrowings with optional date filter
        let borrowingsQuery = supabase
          .from('borrowings')
          .select('id, status, created_at');

        if (dateFrom) {
          borrowingsQuery = borrowingsQuery.gte('created_at', `${dateFrom}T00:00:00`);
        }
        if (dateTo) {
          borrowingsQuery = borrowingsQuery.lte('created_at', `${dateTo}T23:59:59`);
        }

        const { data: borrowingsData, error: borrowingsError } = await borrowingsQuery;

        const borrowings = (borrowingsData as unknown as BorrowingRow[]) || [];

        const countByStatus = (status: string) =>
          borrowings.filter((b) => b.status === status).length;

        setStats({
          totalInventory: invRes.count ?? 0,
          totalFacilities: facRes.count ?? 0,
          totalBorrowings: borrowings.length,
          pendingCount: countByStatus('pending'),
          approvedCount: countByStatus('approved'),
          returnedCount: countByStatus('returned'),
          rejectedCount: countByStatus('rejected'),
          completedCount: countByStatus('completed'),
          cancelledCount: countByStatus('cancelled'),
        });
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [dateFrom, dateTo]);

  const overviewCards = [
    { label: 'Total Inventaris', value: stats.totalInventory, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Fasilitas', value: stats.totalFacilities, icon: Building2, color: 'from-cyan-500 to-teal-500' },
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'from-indigo-500 to-blue-500' },
  ];

  const statusBreakdown = [
    { key: 'pending', count: stats.pendingCount },
    { key: 'approved', count: stats.approvedCount },
    { key: 'returned', count: stats.returnedCount },
    { key: 'rejected', count: stats.rejectedCount },
    { key: 'completed', count: stats.completedCount },
    { key: 'cancelled', count: stats.cancelledCount },
  ];

  const maxStatusCount = Math.max(...statusBreakdown.map((s) => s.count), 1);

  const resetFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rekap & Statistik</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Ringkasan data inventaris, fasilitas, dan peminjaman.
          </p>
        </div>

        {/* Date Filter */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="label flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Dari Tanggal
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input"
              />
            </div>
            <button
              onClick={resetFilter}
              className="btn-secondary inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {overviewCards.map((c) => (
            <div key={c.label} className="card p-6">
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', c.color)}>
                  <c.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {loading ? '...' : c.value}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{c.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Breakdown */}
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Peminjaman per Status
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stats.totalBorrowings === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Belum ada data peminjaman"
              description="Statistik akan muncul setelah ada peminjaman."
            />
          ) : (
            <div className="space-y-4">
              {statusBreakdown.map((s) => {
                const cfg = statusConfig[s.key];
                const widthPct = (s.count / maxStatusCount) * 100;
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <cfg.icon className={cn('w-4 h-4', cfg.color.replace('bg-', 'text-'))} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cfg.label}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{s.count}</span>
                    </div>
                    <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={cn('h-full rounded-lg transition-all duration-500', cfg.color)}
                        style={{ width: `${Math.max(widthPct, s.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusBreakdown.map((s) => {
            const cfg = statusConfig[s.key];
            return (
              <div key={s.key} className="card p-4 text-center">
                <div className={cn('w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center', cfg.color)}>
                  <cfg.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {loading ? '...' : s.count}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}

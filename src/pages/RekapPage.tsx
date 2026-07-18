import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3, Package, Building2, ClipboardList, Loader2,
  Calendar, TrendingUp, CheckCircle2, Clock, XCircle, AlertCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingStats {
  pending: number;
  approved: number;
  returned: number;
  rejected: number;
  completed: number;
  cancelled: number;
}

interface Stats {
  inventory: number;
  facilities: number;
  totalBorrowings: number;
  byStatus: BorrowingStats;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const monthAgoStr = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-green-500',
  returned: 'bg-blue-500',
  rejected: 'bg-red-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-slate-500',
};

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  returned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
};

export default function RekapPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(monthAgoStr());
  const [endDate, setEndDate] = useState(todayStr());

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const [invRes, facRes, borRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase
            .from('borrowings')
            .select('id, status, created_at')
            .gte('created_at', `${startDate}T00:00:00`)
            .lte('created_at', `${endDate}T23:59:59`),
        ]);

        const allBorrowings = (borRes.data as unknown as { id: string; status: string; created_at: string }[]) || [];

        const byStatus: BorrowingStats = {
          pending: 0,
          approved: 0,
          returned: 0,
          rejected: 0,
          completed: 0,
          cancelled: 0,
        };

        allBorrowings.forEach((b) => {
          if (b.status in byStatus) {
            (byStatus as any)[b.status]++;
          }
        });

        setStats({
          inventory: invRes.count ?? 0,
          facilities: facRes.count ?? 0,
          totalBorrowings: allBorrowings.length,
          byStatus,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [startDate, endDate]);

  const maxStatusValue = useMemo(() => {
    if (!stats) return 1;
    return Math.max(1, ...Object.values(stats.byStatus));
  }, [stats]);

  const statusEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byStatus).map(([key, value]) => ({
      key,
      label: statusLabels[key] || key,
      value,
      percent: Math.round((value / Math.max(1, stats.totalBorrowings)) * 100),
      barWidth: Math.round((value / maxStatusValue) * 100),
    }));
  }, [stats, maxStatusValue]);

  const summaryCards = [
    { label: 'Total Inventaris', value: stats?.inventory ?? 0, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Fasilitas', value: stats?.facilities ?? 0, icon: Building2, color: 'from-cyan-500 to-teal-500' },
    { label: 'Total Peminjaman', value: stats?.totalBorrowings ?? 0, icon: ClipboardList, color: 'from-emerald-500 to-green-500' },
  ];

  const statusIcons: Record<string, any> = {
    pending: Clock,
    approved: CheckCircle2,
    returned: Package,
    rejected: XCircle,
    completed: CheckCircle2,
    cancelled: AlertCircle,
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rekap & Statistik</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ringkasan data inventaris, fasilitas, dan peminjaman</p>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-blue-500" /> Filter Tanggal:
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Dari</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Sampai</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {summaryCards.map((c) => (
                <div key={c.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{c.label}</p>
                    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', c.color)}>
                      <c.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{c.value.toLocaleString('id-ID')}</p>
                </div>
              ))}
            </div>

            {/* Borrowing Status Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Peminjaman berdasarkan Status</h2>
              </div>

              {/* Bar Chart */}
              <div className="space-y-4 mb-6">
                {statusEntries.map((s) => (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.label}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{s.value} ({s.percent}%)</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', statusColors[s.key])}
                        style={{ width: `${s.barWidth}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {statusEntries.map((s) => {
                const Icon = statusIcons[s.key] || Clock;
                return (
                  <div key={s.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-2">
                      <Icon className={cn('w-5 h-5', statusColors[s.key].replace('bg-', 'text-'))} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

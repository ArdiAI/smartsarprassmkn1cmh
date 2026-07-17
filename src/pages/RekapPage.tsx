import { useEffect, useState, useMemo } from 'react';
import {
  Package, Building2, ClipboardList, BarChart3, Loader2,
  CheckCircle2, Clock, XCircle, Calendar,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingStatus {
  status: string;
}

interface Stats {
  inventory: number;
  facilities: number;
  totalBorrowings: number;
  byStatus: Record<string, number>;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-500', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-green-500', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-500', icon: XCircle },
  returned: { label: 'Dikembalikan', color: 'bg-blue-500', icon: CheckCircle2 },
  completed: { label: 'Selesai', color: 'bg-emerald-500', icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-500', icon: XCircle },
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>({
    inventory: 0,
    facilities: 0,
    totalBorrowings: 0,
    byStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(daysAgoStr(30));
  const [endDate, setEndDate] = useState(todayStr());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [inv, fac, brw] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase
            .from('borrowings')
            .select('status, created_at')
            .gte('created_at', `${startDate}T00:00:00`)
            .lte('created_at', `${endDate}T23:59:59`),
        ]);

        const borrowings = (brw.data as unknown as BorrowingStatus[]) || [];
        const byStatus: Record<string, number> = {};
        borrowings.forEach((b) => {
          byStatus[b.status] = (byStatus[b.status] || 0) + 1;
        });

        setStats({
          inventory: inv.count ?? 0,
          facilities: fac.count ?? 0,
          totalBorrowings: borrowings.length,
          byStatus,
        });
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [startDate, endDate]);

  const statusEntries = useMemo(() => {
    return Object.entries(statusConfig).map(([key, cfg]) => ({
      key,
      ...cfg,
      count: stats.byStatus[key] || 0,
    }));
  }, [stats]);

  const maxStatusCount = useMemo(
    () => Math.max(1, ...statusEntries.map((s) => s.count)),
    [statusEntries]
  );

  const summaryCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Rekap &amp; Statistik</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Ringkasan data inventaris, fasilitas, dan peminjaman.
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Filter Tanggal</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="label">Dari Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {summaryCards.map((s) => (
            <div key={s.label} className="card p-5 flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', s.bg)}>
                <s.icon className={cn('w-6 h-6', s.color)} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                {loading ? (
                  <div className="w-16 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bar Chart: Borrowings by Status */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Peminjaman per Status
            </h2>
            {!loading && (
              <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">
                Total: {stats.totalBorrowings}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : stats.totalBorrowings === 0 ? (
            <p className="text-center text-slate-400 dark:text-slate-500 py-8">
              Tidak ada data peminjaman pada rentang tanggal ini.
            </p>
          ) : (
            <div className="space-y-4">
              {statusEntries.map((s) => {
                const pct = (s.count / maxStatusCount) * 100;
                const totalPct = stats.totalBorrowings > 0 ? (s.count / stats.totalBorrowings) * 100 : 0;
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <s.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {s.label}
                        </span>
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {s.count} <span className="text-xs">({totalPct.toFixed(0)}%)</span>
                      </span>
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

        {/* Status Summary Grid */}
        {!loading && stats.totalBorrowings > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            {statusEntries.map((s) => (
              <div key={s.key} className="card p-4 text-center">
                <div className={cn('w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center', s.color, 'bg-opacity-20')}>
                  <s.icon className={cn('w-5 h-5 text-white')} />
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{s.count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

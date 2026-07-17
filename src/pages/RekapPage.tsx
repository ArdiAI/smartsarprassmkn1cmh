import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3, Package, Building2, ClipboardList, Calendar, Loader2,
  TrendingUp, CheckCircle2, Clock, XCircle, RotateCcw,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Stats {
  inventory: number;
  facilities: number;
  borrowings: number;
}

interface BorrowingStatus {
  status: string;
}

interface StatusCount {
  status: string;
  count: number;
}

const statusConfig: Record<string, { label: string; classes: string; barClasses: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', classes: 'text-amber-600 dark:text-amber-400', barClasses: 'bg-amber-500', icon: Clock },
  approved: { label: 'Disetujui', classes: 'text-green-600 dark:text-green-400', barClasses: 'bg-green-500', icon: CheckCircle2 },
  returned: { label: 'Dikembalikan', classes: 'text-blue-600 dark:text-blue-400', barClasses: 'bg-blue-500', icon: RotateCcw },
  rejected: { label: 'Ditolak', classes: 'text-red-600 dark:text-red-400', barClasses: 'bg-red-500', icon: XCircle },
  completed: { label: 'Selesai', classes: 'text-emerald-600 dark:text-emerald-400', barClasses: 'bg-emerald-500', icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan', classes: 'text-slate-600 dark:text-slate-400', barClasses: 'bg-slate-500', icon: XCircle },
};

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>({ inventory: 0, facilities: 0, borrowings: 0 });
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>(daysAgoISO(30));
  const [dateTo, setDateTo] = useState<string>(todayISO());

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [invRes, facRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
        ]);

        // Borrowings filtered by date range
        let brwQuery = supabase
          .from('borrowings')
          .select('id, status, created_at');
        if (dateFrom) brwQuery = brwQuery.gte('created_at', dateFrom);
        if (dateTo) brwQuery = brwQuery.lte('created_at', `${dateTo}T23:59:59`);
        const brwRes = await brwQuery;

        const borrowings = (brwRes.data as unknown as BorrowingStatus[]) || [];
        // Count by status
        const counts: Record<string, number> = {};
        borrowings.forEach((b) => {
          counts[b.status] = (counts[b.status] || 0) + 1;
        });
        const statusArr: StatusCount[] = Object.entries(counts).map(([status, count]) => ({ status, count }));
        setStatusCounts(statusArr);

        setStats({
          inventory: invRes.count ?? 0,
          facilities: facRes.count ?? 0,
          borrowings: borrowings.length,
        });
      } catch (err) {
        console.error('Failed to fetch rekap data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [dateFrom, dateTo]);

  const maxStatusCount = useMemo(() => {
    return Math.max(...statusCounts.map((s) => s.count), 1);
  }, [statusCounts]);

  const statCards = [
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Fasilitas', value: stats.facilities, icon: Building2, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Total Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Rekap & Statistik
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 ml-13">
            Ringkasan data sarana prasarana dan peminjaman.
          </p>
        </div>

        {/* Date range filter */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="label text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Dari Tanggal</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input text-sm" />
            </div>
            <div className="flex-1">
              <label className="label text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Sampai Tanggal</label>
              <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} className="input text-sm" />
            </div>
            <button
              onClick={() => { setDateFrom(daysAgoISO(30)); setDateTo(todayISO()); }}
              className="btn-secondary text-sm whitespace-nowrap"
            >
              30 Hari Terakhir
            </button>
          </div>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="card p-6 flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.bg)}>
                <s.icon className={cn('w-6 h-6', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {loading ? '—' : s.value.toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status breakdown chart */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Peminjaman per Status
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                  <div className="h-6 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : statusCounts.length === 0 ? (
            <EmptyState icon={BarChart3} title="Tidak ada data" description="Belum ada peminjaman dalam rentang tanggal ini." />
          ) : (
            <div className="space-y-4">
              {statusCounts.map((s) => {
                const cfg = statusConfig[s.status] ?? { label: s.status, classes: 'text-slate-600', barClasses: 'bg-slate-500', icon: Clock };
                const widthPct = (s.count / maxStatusCount) * 100;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-sm font-medium inline-flex items-center gap-1.5', cfg.classes)}>
                        <cfg.icon className="w-4 h-4" /> {cfg.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.count}</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', cfg.barClasses)}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const count = statusCounts.find((s) => s.status === key)?.count ?? 0;
            return (
              <div key={key} className="card p-4 text-center">
                <cfg.icon className={cn('w-6 h-6 mx-auto mb-2', cfg.classes)} />
                <p className={cn('text-xl font-bold', cfg.classes)}>{loading ? '—' : count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

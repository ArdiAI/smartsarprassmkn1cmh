import { useEffect, useState } from 'react';
import {
  BarChart3,
  Package,
  Building2,
  ClipboardList,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Stats {
  totalInventory: number;
  totalFacilities: number;
  totalBorrowings: number;
  byStatus: Record<string, number>;
}

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
  cancelled: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function RekapPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<string>(daysAgoISO(30));
  const [toDate, setToDate] = useState<string>(todayISO());

  const loadStats = async (from: string, to: string) => {
    setLoading(true);
    try {
      const [invRes, facRes, brwRes] = await Promise.all([
        supabase.from('inventory').select('*', { count: 'exact', head: true }),
        supabase.from('facilities').select('*', { count: 'exact', head: true }),
        supabase
          .from('borrowings')
          .select('id, status, created_at')
          .gte('created_at', from)
          .lte('created_at', `${to}T23:59:59`),
      ]);

      const borrowings = (brwRes.data as unknown as { id: string; status: string; created_at: string }[]) || [];
      const byStatus: Record<string, number> = {};
      borrowings.forEach((b) => {
        byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
      });

      setStats({
        totalInventory: invRes.count ?? 0,
        totalFacilities: facRes.count ?? 0,
        totalBorrowings: borrowings.length,
        byStatus,
      });
    } catch (e) {
      console.error('Failed to load recap:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = () => {
    if (fromDate && toDate) loadStats(fromDate, toDate);
  };

  const summaryCards = [
    { label: 'Total Inventaris', value: stats?.totalInventory ?? 0, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Fasilitas', value: stats?.totalFacilities ?? 0, icon: Building2, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Total Peminjaman', value: stats?.totalBorrowings ?? 0, icon: ClipboardList, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  ];

  const statusEntries = Object.entries(statusLabels);
  const maxStatus = stats ? Math.max(...statusEntries.map(([k]) => stats.byStatus[k] ?? 0), 1) : 1;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-500" /> Rekap & Statistik
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan data inventaris, fasilitas, dan peminjaman.</p>
        </div>

        {/* Date range filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Dari Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sampai Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
              </div>
            </div>
            <button
              onClick={handleFilter}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              Terapkan
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {summaryCards.map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.bg)}>
                  <s.icon className={cn('w-6 h-6', s.color)} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : s.value}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart - borrowings by status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Peminjaman per Status</h2>
          <p className="text-sm text-slate-400 mb-6">Periode {new Date(fromDate).toLocaleDateString('id-ID')} - {new Date(toDate).toLocaleDateString('id-ID')}</p>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : stats && stats.totalBorrowings > 0 ? (
            <div className="space-y-4">
              {statusEntries.map(([key, label]) => {
                const count = stats.byStatus[key] ?? 0;
                const pct = (count / maxStatus) * 100;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium px-2 py-0.5 rounded-full', statusBadge[key])}>
                        <span className={cn('w-2 h-2 rounded-full', statusColors[key])} />
                        {label}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', statusColors[key])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400 py-12">Tidak ada data peminjaman pada periode ini.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

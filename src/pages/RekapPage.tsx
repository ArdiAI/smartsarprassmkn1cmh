import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, Package, Building2, ClipboardList, Calendar, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

type BorrowingStatus = 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';

interface StatusCount {
  status: BorrowingStatus;
  count: number;
}

const statusMeta: Record<BorrowingStatus, { label: string; color: string; bar: string }> = {
  pending: { label: 'Menunggu', color: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
  approved: { label: 'Disetujui', color: 'text-green-600 dark:text-green-400', bar: 'bg-green-500' },
  returned: { label: 'Dikembalikan', color: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
  rejected: { label: 'Ditolak', color: 'text-red-600 dark:text-red-400', bar: 'bg-red-500' },
  completed: { label: 'Selesai', color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  cancelled: { label: 'Dibatalkan', color: 'text-slate-600 dark:text-slate-400', bar: 'bg-slate-400' },
};

const statusOrder: BorrowingStatus[] = ['pending', 'approved', 'returned', 'completed', 'rejected', 'cancelled'];

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function firstOfMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function RekapPage() {
  const [loading, setLoading] = useState(true);
  const [totalInventory, setTotalInventory] = useState(0);
  const [totalFacilities, setTotalFacilities] = useState(0);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [dateFrom, setDateFrom] = useState(firstOfMonthStr());
  const [dateTo, setDateTo] = useState(todayStr());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, facRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
        ]);
        setTotalInventory(invRes.count ?? 0);
        setTotalFacilities(facRes.count ?? 0);

        // Fetch borrowings within date range
        let query = supabase
          .from('borrowings')
          .select('id, status, created_at')
          .order('created_at', { ascending: false });

        if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
        if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

        const { data, error, count } = await query;
        if (error) throw error;

        const rows = (data as unknown as { id: string; status: BorrowingStatus; created_at: string }[]) ?? [];
        setTotalBorrowings(count ?? rows.length);

        // Count by status
        const counts: Record<string, number> = {};
        for (const r of rows) {
          counts[r.status] = (counts[r.status] || 0) + 1;
        }
        const result: StatusCount[] = statusOrder
          .map((s) => ({ status: s, count: counts[s] || 0 }))
          .filter((s) => s.count > 0);
        setStatusCounts(result.length > 0 ? result : statusOrder.map((s) => ({ status: s, count: 0 })));
      } catch (e) {
        console.error('Failed to fetch rekap data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateFrom, dateTo]);

  const maxCount = useMemo(() => Math.max(1, ...statusCounts.map((s) => s.count)), [statusCounts]);

  const summaryCards = [
    { label: 'Total Inventaris', value: totalInventory, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Fasilitas', value: totalFacilities, icon: Building2, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Total Peminjaman', value: totalBorrowings, icon: ClipboardList, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" /> Rekap & Statistik
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ringkasan data sarana, prasarana, dan peminjaman.
          </p>
        </div>

        {/* Date range filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter Rentang Tanggal</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs text-slate-500 mb-1">Dari</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs text-slate-500 mb-1">Sampai</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {summaryCards.map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                  )}
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.bg)}>
                  <s.icon className={cn('w-6 h-6', s.color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="font-bold text-slate-900 dark:text-white mb-5">Peminjaman per Status</h2>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="space-y-4">
              {statusCounts.map((s) => {
                const meta = statusMeta[s.status];
                const pct = (s.count / maxCount) * 100;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn('text-sm font-medium', meta.color)}>{meta.label}</span>
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{s.count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', meta.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {totalBorrowings === 0 && (
                <p className="text-center text-sm text-slate-400 py-6">
                  Tidak ada data peminjaman pada rentang tanggal ini.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

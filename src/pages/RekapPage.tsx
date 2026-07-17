import { useEffect, useState, useMemo } from 'react';
import { BarChart3, Package, Building, ClipboardList, TrendingUp, Calendar } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Stats {
  totalInventory: number;
  totalFacilities: number;
  totalBorrowings: number;
  pendingBorrowings: number;
  approvedBorrowings: number;
  rejectedBorrowings: number;
  returnedBorrowings: number;
}

interface CategoryCount {
  categories: { name: string } | null;
  count: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  returned: 'bg-blue-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  returned: 'Dikembalikan',
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <TrendingUp className="w-5 h-5 text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
      <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse mb-3" />
      <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
    </div>
  );
}

export default function RekapPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      let borrowingsQuery = supabase.from('borrowings').select('id, status');
      if (dateRange.from) {
        borrowingsQuery = borrowingsQuery.gte('created_at', dateRange.from);
      }
      if (dateRange.to) {
        borrowingsQuery = borrowingsQuery.lte('created_at', dateRange.to + 'T23:59:59');
      }

      const [invRes, facRes, borRes, catRes] = await Promise.all([
        supabase.from('inventory').select('*', { count: 'exact', head: true }),
        supabase.from('facilities').select('*', { count: 'exact', head: true }),
        borrowingsQuery,
        supabase.from('inventory').select('categories (name)'),
      ]);

      const borrowings = (borRes.data as unknown as { id: string; status: string }[]) || [];
      const statusCounts: Record<string, number> = {};
      borrowings.forEach((b) => {
        const key = (b.status || '').toLowerCase();
        statusCounts[key] = (statusCounts[key] || 0) + 1;
      });

      setStats({
        totalInventory: invRes.count || 0,
        totalFacilities: facRes.count || 0,
        totalBorrowings: borrowings.length,
        pendingBorrowings: statusCounts['pending'] || 0,
        approvedBorrowings: statusCounts['approved'] || 0,
        rejectedBorrowings: statusCounts['rejected'] || 0,
        returnedBorrowings: statusCounts['returned'] || 0,
      });

      // Count by category
      const catData = ((catRes.data as unknown as { categories: { name: string } | null }[]) || []);
      const catMap: Record<string, number> = {};
      catData.forEach((item) => {
        const name = item.categories?.name || 'Tanpa Kategori';
        catMap[name] = (catMap[name] || 0) + 1;
      });
      const catArray = Object.entries(catMap).map(([name, count]) => ({ categories: { name }, count }));
      catArray.sort((a, b) => b.count - a.count);
      setCategoryCounts(catArray);

      setLoading(false);
    };
    fetchStats();
  }, [dateRange.from, dateRange.to]);

  const maxCategoryCount = useMemo(() => {
    return Math.max(...categoryCounts.map((c) => c.count), 1);
  }, [categoryCounts]);

  const statusBars = useMemo(() => {
    if (!stats) return [];
    return [
      { key: 'pending', label: STATUS_LABELS['pending'], value: stats.pendingBorrowings, color: STATUS_COLORS['pending'] },
      { key: 'approved', label: STATUS_LABELS['approved'], value: stats.approvedBorrowings, color: STATUS_COLORS['approved'] },
      { key: 'rejected', label: STATUS_LABELS['rejected'], value: stats.rejectedBorrowings, color: STATUS_COLORS['rejected'] },
      { key: 'returned', label: STATUS_LABELS['returned'], value: stats.returnedBorrowings, color: STATUS_COLORS['returned'] },
    ];
  }, [stats]);

  const maxStatusValue = useMemo(() => {
    return Math.max(...statusBars.map((s) => s.value), 1);
  }, [statusBars]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              <h1 className="text-3xl font-bold">Rekap & Statistik</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400">Ringkasan data inventaris, fasilitas, dan peminjaman.</p>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                className="pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <span className="text-slate-400">-</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                className="pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Package} label="Total Inventaris" value={stats.totalInventory} color="bg-blue-500" />
            <StatCard icon={Building} label="Total Fasilitas" value={stats.totalFacilities} color="bg-cyan-500" />
            <StatCard icon={ClipboardList} label="Total Peminjaman" value={stats.totalBorrowings} color="bg-emerald-500" />
            <StatCard icon={TrendingUp} label="Menunggu Persetujuan" value={stats.pendingBorrowings} color="bg-amber-500" />
          </div>
        ) : null}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Borrowings by status */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="font-semibold text-lg mb-6">Peminjaman per Status</h2>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                ))}
              </div>
            ) : statusBars.length === 0 || stats?.totalBorrowings === 0 ? (
              <EmptyState icon={BarChart3} title="Belum ada data peminjaman" />
            ) : (
              <div className="space-y-4">
                {statusBars.map((bar) => (
                  <div key={bar.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{bar.label}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{bar.value}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', bar.color)}
                        style={{ width: `${(bar.value / maxStatusValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory by category */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <h2 className="font-semibold text-lg mb-6">Inventaris per Kategori</h2>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                ))}
              </div>
            ) : categoryCounts.length === 0 ? (
              <EmptyState icon={Package} title="Belum ada data kategori" />
            ) : (
              <div className="space-y-4">
                {categoryCounts.slice(0, 6).map((cat) => (
                  <div key={cat.categories?.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{cat.categories?.name || 'Tanpa Kategori'}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{cat.count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

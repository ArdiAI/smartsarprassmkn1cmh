import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  BarChart3, TrendingUp, Package, Clock, CheckCircle, XCircle, Loader2,
} from 'lucide-react';

interface MonthlyData {
  month: string;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface CategoryCount {
  name: string;
  count: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-500' },
  approved: { label: 'Disetujui', color: 'bg-emerald-500' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-500' },
  rejected: { label: 'Ditolak', color: 'bg-red-500' },
  completed: { label: 'Selesai', color: 'bg-cyan-500' },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-500' },
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [borrowingsRes, inventoryRes, pendingRes, approvedRes] = await Promise.all([
        supabase.from('borrowings').select('created_at, status'),
        supabase.from('inventory').select('id, category_id, categories(id, name)'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      ]);

      const allBorrowings = (borrowingsRes.data as unknown as { created_at: string; status: string }[]) || [];
      setTotalBorrowings(allBorrowings.length);
      setPendingCount(pendingRes.count ?? 0);
      setApprovedCount(approvedRes.count ?? 0);

      // Monthly trends (current year)
      const currentYear = new Date().getFullYear();
      const monthMap: Record<number, number> = {};
      for (let i = 0; i < 12; i++) monthMap[i] = 0;
      allBorrowings.forEach(b => {
        const d = new Date(b.created_at);
        if (d.getFullYear() === currentYear) {
          monthMap[d.getMonth()]++;
        }
      });
      setMonthlyData(
        Object.entries(monthMap).map(([m, count]) => ({ month: monthNames[parseInt(m, 10)], count }))
      );

      // Borrowings by status
      const statusMap: Record<string, number> = {};
      allBorrowings.forEach(b => {
        statusMap[b.status] = (statusMap[b.status] ?? 0) + 1;
      });
      setStatusCounts(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

      // Inventory by category
      const allInventory = (inventoryRes.data as unknown as { id: string; categories: { id: string; name: string } | null }[]) || [];
      setTotalInventory(allInventory.length);
      const catMap: Record<string, number> = {};
      allInventory.forEach(item => {
        const name = item.categories?.name ?? 'Tanpa Kategori';
        catMap[name] = (catMap[name] ?? 0) + 1;
      });
      setCategoryCounts(Object.entries(catMap).map(([name, count]) => ({ name, count })));
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat statistik', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1);
  const maxStatusCount = Math.max(...statusCounts.map(s => s.count), 1);
  const maxCategoryCount = Math.max(...categoryCounts.map(c => c.count), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: TrendingUp, color: 'blue' },
    { label: 'Menunggu', value: pendingCount, icon: Clock, color: 'amber' },
    { label: 'Disetujui', value: approvedCount, icon: CheckCircle, color: 'emerald' },
    { label: 'Total Inventaris', value: totalInventory, icon: Package, color: 'cyan' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    cyan: 'bg-cyan-500',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan data peminjaman dan inventaris</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colorMap[card.color])}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Trends Bar Chart */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tren Peminjaman Bulanan</h2>
          <span className="text-sm text-slate-400">({new Date().getFullYear()})</span>
        </div>
        <div className="flex items-end justify-between gap-1.5 h-48">
          {monthlyData.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                <div
                  className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-all hover:from-blue-700 hover:to-cyan-500 relative"
                  style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '8px' : '2px' }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.count}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Borrowings by Status */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Peminjaman per Status</h2>
          {statusCounts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {statusCounts.map(s => {
                const sc = statusConfig[s.status] ?? { label: s.status, color: 'bg-slate-500' };
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{sc.label}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{s.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', sc.color)}
                        style={{ width: `${(s.count / maxStatusCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory by Category */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Inventaris per Kategori</h2>
          {categoryCounts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {categoryCounts.map(c => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{c.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                      style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

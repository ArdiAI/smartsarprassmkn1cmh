import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';
import {
  BarChart3,
  PackageOpen,
  Boxes,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface MonthlyData {
  month: string;
  count: number;
}

interface CategoryData {
  name: string;
  count: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-blue-500',
  returned: 'bg-emerald-500',
  rejected: 'bg-red-500',
  completed: 'bg-slate-500',
  cancelled: 'bg-slate-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusData, setStatusData] = useState<Record<string, number>>({});
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [summary, setSummary] = useState({
    totalBorrowings: 0,
    totalInventory: 0,
    approved: 0,
    pending: 0,
    damageReports: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch borrowings
        const { data: borrowings } = await supabase
          .from('borrowings')
          .select('status, created_at');
        const borrowingsData = (borrowings as unknown as { status: string; created_at: string }[]) || [];

        // Monthly trends (last 6 months)
        const now = new Date();
        const months: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
          const count = borrowingsData.filter(b => {
            const bd = new Date(b.created_at);
            return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
          }).length;
          months.push({ month: monthName, count });
        }
        setMonthlyData(months);

        // Status distribution
        const statusCounts: Record<string, number> = {};
        borrowingsData.forEach(b => {
          statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
        });
        setStatusData(statusCounts);

        // Summary counts
        const [invRes, damageRes] = await Promise.all([
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('damage_reports').select('*', { count: 'exact', head: true }),
        ]);

        setSummary({
          totalBorrowings: borrowingsData.length,
          totalInventory: invRes.count ?? 0,
          approved: statusCounts['approved'] ?? 0,
          pending: statusCounts['pending'] ?? 0,
          damageReports: damageRes.count ?? 0,
        });

        // Inventory by category
        const { data: inventory } = await supabase
          .from('inventory')
          .select('category_id, categories(*)');
        const invData = (inventory as unknown as { category_id: string | null; categories: { id: string; name: string } | null }[]) || [];
        const catCounts: Record<string, number> = {};
        invData.forEach(i => {
          const name = i.categories?.name ?? 'Tanpa Kategori';
          catCounts[name] = (catCounts[name] ?? 0) + 1;
        });
        const catArray = Object.entries(catCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        setCategoryData(catArray);
      } catch {
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1);
  const maxCategory = Math.max(...categoryData.map(c => c.count), 1);
  const totalStatus = Object.values(statusData).reduce((a, b) => a + b, 0) || 1;

  const summaryCards = [
    { label: 'Total Peminjaman', value: summary.totalBorrowings, icon: PackageOpen, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Inventaris', value: summary.totalInventory, icon: Boxes, color: 'from-violet-500 to-purple-500' },
    { label: 'Disetujui', value: summary.approved, icon: CheckCircle2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Menunggu', value: summary.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Laporan Kerusakan', value: summary.damageReports, icon: AlertTriangle, color: 'from-red-500 to-rose-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ringkasan dan tren data sistem</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
            >
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', card.color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trends bar chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Tren Peminjaman (6 Bulan)</h2>
          </div>
          <div className="flex items-end justify-between gap-3 h-48">
            {monthlyData.map((m, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:opacity-80 relative group"
                    style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: '4px' }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.count}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>
          {Object.keys(statusData).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Tidak ada data</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusData).map(([status, count]) => (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {statusLabels[status] ?? status}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', statusColors[status] ?? 'bg-slate-400')}
                      style={{ width: `${(count / totalStatus) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inventory by category */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-5">
          <Boxes className="w-5 h-5 text-violet-500" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
        </div>
        {categoryData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">Tidak ada data</p>
        ) : (
          <div className="space-y-3">
            {categoryData.map(cat => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{cat.name}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{cat.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all"
                    style={{ width: `${(cat.count / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

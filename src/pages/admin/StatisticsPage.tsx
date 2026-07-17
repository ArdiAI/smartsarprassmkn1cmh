import { useEffect, useState } from 'react';
import {
  PackageOpen,
  Boxes,
  Building2,
  FileWarning,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface MonthlyData {
  month: string;
  count: number;
}

interface StatusData {
  status: string;
  count: number;
}

interface CategoryData {
  name: string;
  count: number;
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
  approved: 'bg-blue-500',
  returned: 'bg-emerald-500',
  rejected: 'bg-red-500',
  completed: 'bg-cyan-500',
  cancelled: 'bg-slate-500',
};

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [summary, setSummary] = useState({
    totalBorrowings: 0,
    totalInventory: 0,
    totalFacilities: 0,
    totalReports: 0,
  });

  useEffect(() => {
    const fetchAll = async () => {
      const [
        { count: totalBorrowings },
        { count: totalInventory },
        { count: totalFacilities },
        { count: totalReports },
        { data: borrowingsData },
        { data: inventoryData },
      ] = await Promise.all([
        supabase.from('borrowings').select('*', { count: 'exact', head: true }),
        supabase.from('inventory').select('*', { count: 'exact', head: true }),
        supabase.from('facilities').select('*', { count: 'exact', head: true }),
        supabase.from('damage_reports').select('*', { count: 'exact', head: true }),
        supabase.from('borrowings').select('created_at, status'),
        supabase.from('inventory').select('category_id'),
      ]);

      setSummary({
        totalBorrowings: totalBorrowings ?? 0,
        totalInventory: totalInventory ?? 0,
        totalFacilities: totalFacilities ?? 0,
        totalReports: totalReports ?? 0,
      });

      // Monthly trends (last 6 months)
      const borrowings = (borrowingsData as unknown as { created_at: string; status: string }[]) || [];
      const now = new Date();
      const months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('id-ID', { month: 'short' });
        const count = borrowings.filter((b) => {
          const bDate = new Date(b.created_at ?? '');
          const bKey = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}`;
          return bKey === monthKey;
        }).length;
        months.push({ month: monthLabel, count });
      }
      setMonthlyData(months);

      // Borrowings by status
      const statusCounts: Record<string, number> = {};
      borrowings.forEach((b) => {
        const s = b.status ?? 'pending';
        statusCounts[s] = (statusCounts[s] ?? 0) + 1;
      });
      setStatusData(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));

      // Inventory by category
      const { data: categories } = await supabase.from('categories').select('id, name');
      const cats = (categories as unknown as { id: string; name: string }[]) || [];
      const invItems = (inventoryData as unknown as { category_id: string | null }[]) || [];
      const catCounts: Record<string, number> = {};
      invItems.forEach((item) => {
        const key = item.category_id ?? 'uncategorized';
        catCounts[key] = (catCounts[key] ?? 0) + 1;
      });
      const catData: CategoryData[] = cats.map((c) => ({
        name: c.name,
        count: catCounts[c.id] ?? 0,
      }));
      // Add uncategorized if any
      if (catCounts['uncategorized']) {
        catData.push({ name: 'Tanpa Kategori', count: catCounts['uncategorized'] });
      }
      setCategoryData(catData);

      setLoading(false);
    };
    fetchAll();
  }, []);

  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);
  const maxStatus = Math.max(...statusData.map((s) => s.count), 1);
  const maxCategory = Math.max(...categoryData.map((c) => c.count), 1);
  const totalStatus = statusData.reduce((sum, s) => sum + s.count, 0) || 1;

  const summaryCards = [
    { label: 'Total Peminjaman', value: summary.totalBorrowings, icon: PackageOpen, color: 'from-blue-500 to-cyan-400' },
    { label: 'Total Inventaris', value: summary.totalInventory, icon: Boxes, color: 'from-violet-500 to-purple-400' },
    { label: 'Total Fasilitas', value: summary.totalFacilities, icon: Building2, color: 'from-emerald-500 to-green-400' },
    { label: 'Laporan Kerusakan', value: summary.totalReports, icon: FileWarning, color: 'from-amber-500 to-orange-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Statistik</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ringkasan dan tren data sistem</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', card.color)}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{card.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trends bar chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tren Peminjaman (6 Bulan)</h3>
          </div>
          <div className="flex items-end justify-between gap-3 h-48">
            {monthlyData.map((m, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    className="w-full max-w-[3rem] rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-500 flex items-start justify-center pt-2"
                    style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '8px' : '2px' }}
                  >
                    {m.count > 0 && (
                      <span className="text-xs font-bold text-white">{m.count}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-5">Peminjaman per Status</h3>
          {statusData.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">Tidak ada data</p>
          ) : (
            <div className="space-y-4">
              {statusData.map((s) => (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {statusLabels[s.status] ?? s.status}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {s.count} ({Math.round((s.count / totalStatus) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', statusColors[s.status] ?? 'bg-slate-500')}
                      style={{ width: `${(s.count / maxStatus) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inventory by category */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-5">Inventaris per Kategori</h3>
        {categoryData.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">Tidak ada data</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryData.map((c, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{c.name}</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{c.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                    style={{ width: `${(c.count / maxCategory) * 100}%` }}
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

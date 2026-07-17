import { useEffect, useState } from 'react';
import { Loader2, ClipboardList, Package, Building2, FileWarning, TrendingUp } from 'lucide-react';
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
  category: string;
  count: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-blue-500',
  returned: 'bg-emerald-500',
  rejected: 'bg-red-500',
  completed: 'bg-cyan-500',
  cancelled: 'bg-slate-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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
      const [borrowingsRes, inventoryRes, facilitiesRes, reportsRes] = await Promise.all([
        supabase.from('borrowings').select('status, created_at'),
        supabase.from('inventory').select('id, category_id'),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        supabase.from('damage_reports').select('id', { count: 'exact', head: true }),
      ]);

      const borrowings = (borrowingsRes.data as unknown as { status: string; created_at: string }[]) ?? [];
      const inventory = (inventoryRes.data as unknown as { id: string; category_id: string | null }[]) ?? [];

      setSummary({
        totalBorrowings: borrowings.length,
        totalInventory: inventory.length,
        totalFacilities: facilitiesRes.count ?? 0,
        totalReports: reportsRes.count ?? 0,
      });

      // Monthly trends (current year)
      const currentYear = new Date().getFullYear();
      const monthlyMap: Record<number, number> = {};
      borrowings.forEach(b => {
        const d = new Date(b.created_at);
        if (d.getFullYear() === currentYear) {
          monthlyMap[d.getMonth()] = (monthlyMap[d.getMonth()] ?? 0) + 1;
        }
      });
      const monthly: MonthlyData[] = monthLabels.map((label, idx) => ({
        month: label,
        count: monthlyMap[idx] ?? 0,
      }));
      setMonthlyData(monthly);

      // Borrowings by status
      const statusMap: Record<string, number> = {};
      borrowings.forEach(b => {
        statusMap[b.status] = (statusMap[b.status] ?? 0) + 1;
      });
      const statusArr: StatusData[] = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
      setStatusData(statusArr);

      // Inventory by category
      const categoryIds = new Set<string>();
      inventory.forEach(i => {
        if (i.category_id) categoryIds.add(i.category_id);
      });
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', Array.from(categoryIds));

      const categoryMap: Record<string, string> = {};
      ((categoriesData as unknown as { id: string; name: string }[]) ?? []).forEach(c => {
        categoryMap[c.id] = c.name;
      });

      const catCountMap: Record<string, number> = {};
      inventory.forEach(i => {
        const catName = i.category_id ? (categoryMap[i.category_id] ?? 'Lainnya') : 'Tanpa Kategori';
        catCountMap[catName] = (catCountMap[catName] ?? 0) + 1;
      });
      const catArr: CategoryData[] = Object.entries(catCountMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
      setCategoryData(catArr);

      setLoading(false);
    };
    fetchAll();
  }, []);

  const maxMonthly = Math.max(...monthlyData.map(d => d.count), 1);
  const maxStatus = Math.max(...statusData.map(d => d.count), 1);
  const maxCategory = Math.max(...categoryData.map(d => d.count), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: summary.totalBorrowings, icon: ClipboardList, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Inventaris', value: summary.totalInventory, icon: Package, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Total Fasilitas', value: summary.totalFacilities, icon: Building2, color: 'from-purple-500 to-purple-600' },
    { label: 'Laporan Kerusakan', value: summary.totalReports, icon: FileWarning, color: 'from-amber-500 to-amber-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Statistik</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan dan tren data SMART SARPRAS
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white',
                    card.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{card.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trends bar chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Tren Peminjaman Bulanan ({new Date().getFullYear()})
            </h2>
          </div>
          <div className="flex items-end justify-between gap-1.5 h-48">
            {monthlyData.map(d => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={cn(
                      'w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-all hover:opacity-80',
                      d.count === 0 && 'opacity-30'
                    )}
                    style={{ height: `${(d.count / maxMonthly) * 100}%`, minHeight: d.count > 0 ? '4px' : '2px' }}
                    title={`${d.count} peminjaman`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{d.month}</span>
                {d.count > 0 && (
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{d.count}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Peminjaman per Status
          </h2>
          {statusData.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {statusData.map(s => (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {statusLabels[s.status] ?? s.status}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{s.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', statusColors[s.status] ?? 'bg-slate-500')}
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
          Inventaris per Kategori
        </h2>
        {categoryData.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Belum ada data</p>
        ) : (
          <div className="space-y-3">
            {categoryData.map(c => (
              <div key={c.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{c.category}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{c.count}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
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

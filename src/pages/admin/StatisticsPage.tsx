import { useEffect, useState } from 'react';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  Package,
  ClipboardList,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface CategoryCount {
  name: string;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface MonthlyCount {
  month: string;
  label: string;
  count: number;
}

interface InventoryItem {
  category_id: string | null;
}

interface InventoryWithCategory extends InventoryItem {
  category_name: string | null;
}

interface BorrowingRow {
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-blue-500',
  returned: 'bg-emerald-500',
  completed: 'bg-teal-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-slate-400',
};

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  completed: 'Selesai',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

const monthLabels = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [monthlyCounts, setMonthlyCounts] = useState<MonthlyCount[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      const [borrowingsRes, inventoryRes, categoriesRes] = await Promise.all([
        supabase.from('borrowings').select('status, created_at'),
        supabase.from('inventory').select('category_id'),
        supabase.from('categories').select('id, name'),
      ]);

      const borrowings = (borrowingsRes.data || []) as unknown as BorrowingRow[];
      const inventory = (inventoryRes.data || []) as unknown as InventoryItem[];
      const categories = (categoriesRes.data || []) as unknown as { id: string; name: string }[];

      setTotalBorrowings(borrowings.length);
      setTotalInventory(inventory.length);

      // Inventory by category
      const catMap = new Map<string, number>();
      for (const item of inventory) {
        const cat = categories.find((c) => c.id === item.category_id);
        const name = cat?.name || 'Tanpa Kategori';
        catMap.set(name, (catMap.get(name) || 0) + 1);
      }
      setCategoryCounts(
        Array.from(catMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Borrowings by status
      const statusMap = new Map<string, number>();
      for (const b of borrowings) {
        statusMap.set(b.status, (statusMap.get(b.status) || 0) + 1);
      }
      setStatusCounts(
        Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }))
      );

      // Monthly trends (current year)
      const currentYear = new Date().getFullYear();
      const monthMap = new Map<number, number>();
      for (let i = 0; i < 12; i++) monthMap.set(i, 0);

      for (const b of borrowings) {
        const date = new Date(b.created_at);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth();
          monthMap.set(month, (monthMap.get(month) || 0) + 1);
        }
      }
      setMonthlyCounts(
        Array.from(monthMap.entries()).map(([month, count]) => ({
          month: String(month),
          label: monthLabels[month],
          count,
        }))
      );

      setLoading(false);
    };
    fetchStats();
  }, []);

  const maxCategoryCount = Math.max(...categoryCounts.map((c) => c.count), 1);
  const maxStatusCount = Math.max(...statusCounts.map((s) => s.count), 1);
  const maxMonthlyCount = Math.max(...monthlyCounts.map((m) => m.count), 1);

  const summaryCards = [
    {
      label: 'Total Peminjaman',
      value: totalBorrowings,
      icon: ClipboardList,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Total Inventaris',
      value: totalInventory,
      icon: Package,
      color: 'from-purple-500 to-indigo-500',
    },
    {
      label: 'Kategori',
      value: categoryCounts.length,
      icon: BarChart3,
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan dan analisis data sistem
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {card.label}
                      </p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                        {card.value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white',
                        card.color
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly trends */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 lg:col-span-2">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Tren Peminjaman Bulanan ({new Date().getFullYear()})
              </h2>
              <div className="flex items-end justify-between gap-2 h-48">
                {monthlyCounts.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        className="w-full max-w-[2.5rem] bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all hover:opacity-80 relative group"
                        style={{
                          height: `${(m.count / maxMonthlyCount) * 100}%`,
                          minHeight: m.count > 0 ? '8px' : '2px',
                        }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {m.count}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Borrowings by status */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Peminjaman per Status
              </h2>
              {statusCounts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
              ) : (
                <div className="space-y-3">
                  {statusCounts.map((s) => (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {statusLabel[s.status] || s.status}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {s.count}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            statusColors[s.status] || 'bg-slate-400'
                          )}
                          style={{ width: `${(s.count / maxStatusCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inventory by category */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-purple-500" />
                Inventaris per Kategori
              </h2>
              {categoryCounts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
              ) : (
                <div className="space-y-3">
                  {categoryCounts.map((c) => (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                          {c.name}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white ml-2">
                          {c.count}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                          style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 lg:col-span-2">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-emerald-500" />
                Ringkasan Aktivitas
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {statusCounts.map((s) => (
                  <div
                    key={s.status}
                    className="rounded-xl bg-slate-50 dark:bg-slate-700/30 p-4 text-center"
                  >
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {s.count}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {statusLabel[s.status] || s.status}
                    </p>
                  </div>
                ))}
                {statusCounts.length === 0 && (
                  <p className="text-sm text-slate-400 col-span-4 text-center py-4">
                    Belum ada data peminjaman
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

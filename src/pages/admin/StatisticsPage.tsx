import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  ClipboardList, Package, Building2, AlertTriangle, BarChart3, Loader2, TrendingUp,
} from 'lucide-react';

interface MonthlyData {
  month: string;
  count: number;
}

interface CategoryData {
  name: string;
  count: number;
}

interface StatusData {
  status: string;
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
  approved: 'bg-emerald-500',
  returned: 'bg-blue-500',
  rejected: 'bg-red-500',
  completed: 'bg-teal-500',
  cancelled: 'bg-slate-500',
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [totalFacilities, setTotalFacilities] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Counts
        const [
          { count: borrowingsCount },
          { count: inventoryCount },
          { count: facilitiesCount },
          { count: reportsCount },
          { data: borrowingsData },
          { data: inventoryData },
        ] = await Promise.all([
          supabase.from('borrowings').select('*', { count: 'exact', head: true }),
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('facilities').select('*', { count: 'exact', head: true }),
          supabase.from('damage_reports').select('*', { count: 'exact', head: true }),
          supabase.from('borrowings').select('created_at, status'),
          supabase.from('inventory').select('id, category_id, categories(*)'),
        ]);

        setTotalBorrowings(borrowingsCount ?? 0);
        setTotalInventory(inventoryCount ?? 0);
        setTotalFacilities(facilitiesCount ?? 0);
        setTotalReports(reportsCount ?? 0);

        // Monthly trends (current year)
        const now = new Date();
        const year = now.getFullYear();
        const monthly: Record<string, number> = {};
        monthNames.forEach(m => (monthly[m] = 0));

        const allBorrowings = (borrowingsData as unknown as { created_at: string; status: string }[]) || [];
        allBorrowings.forEach(b => {
          const d = new Date(b.created_at);
          if (d.getFullYear() === year) {
            monthly[monthNames[d.getMonth()]] = (monthly[monthNames[d.getMonth()]] || 0) + 1;
          }
        });
        setMonthlyData(monthNames.map(m => ({ month: m, count: monthly[m] })));

        // Borrowings by status
        const statusMap: Record<string, number> = {};
        allBorrowings.forEach(b => {
          const s = b.status ?? 'pending';
          statusMap[s] = (statusMap[s] || 0) + 1;
        });
        setStatusData(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

        // Inventory by category
        const allInventory = (inventoryData as unknown as { id: string; category_id: string | null; categories: { id: string; name: string } | null }[]) || [];
        const catMap: Record<string, number> = {};
        allInventory.forEach(item => {
          const name = item.categories?.name ?? 'Tanpa Kategori';
          catMap[name] = (catMap[name] || 0) + 1;
        });
        setCategoryData(Object.entries(catMap).map(([name, count]) => ({ name, count })));
      } catch {
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const maxMonthly = Math.max(...monthlyData.map(d => d.count), 1);
  const maxStatus = Math.max(...statusData.map(d => d.count), 1);
  const maxCategory = Math.max(...categoryData.map(d => d.count), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: ClipboardList, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Inventaris', value: totalInventory, icon: Package, color: 'from-purple-500 to-pink-500' },
    { label: 'Total Fasilitas', value: totalFacilities, icon: Building2, color: 'from-emerald-500 to-teal-500' },
    { label: 'Laporan Kerusakan', value: totalReports, icon: AlertTriangle, color: 'from-amber-500 to-orange-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ringkasan statistik sistem</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center', card.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trends - bar chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Tren Peminjaman Bulanan</h3>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {monthlyData.map(d => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:opacity-80 relative group"
                    style={{ height: `${(d.count / maxMonthly) * 100}%`, minHeight: d.count > 0 ? '4px' : '2px' }}
                  >
                    {d.count > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h3>
          </div>
          {statusData.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Belum ada data</p>
          ) : (
            <div className="space-y-4">
              {statusData.map(d => {
                const label = statusLabels[d.status] ?? d.status;
                const color = statusColors[d.status] ?? 'bg-slate-500';
                return (
                  <div key={d.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{d.count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', color)}
                        style={{ width: `${(d.count / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory by category */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h3>
          </div>
          {categoryData.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Belum ada data</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categoryData.map(d => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.name}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{d.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                      style={{ width: `${(d.count / maxCategory) * 100}%` }}
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

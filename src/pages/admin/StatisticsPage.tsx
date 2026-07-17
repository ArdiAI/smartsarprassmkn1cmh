import { useEffect, useState } from 'react';
import {
  BarChart3, ClipboardList, Package, CheckCircle2, Clock, TrendingUp,
  Loader2, Building2, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface MonthlyData {
  month: string;
  count: number;
}

interface CategoryCount {
  name: string;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-blue-500',
  returned: 'bg-emerald-500',
  rejected: 'bg-red-500',
  completed: 'bg-cyan-500',
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

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [totalFacilities, setTotalFacilities] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryCount[]>([]);
  const [statusData, setStatusData] = useState<StatusCount[]>([]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  async function fetchStatistics() {
    setLoading(true);
    try {
      const [borrowRes, invRes, facRes, pendingRes, allBorrowRes, invCatRes] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('status, created_at'),
        supabase.from('inventory').select('category_id, category:categories(name)'),
      ]);

      setTotalBorrowings(borrowRes.count ?? 0);
      setTotalInventory(invRes.count ?? 0);
      setTotalFacilities(facRes.count ?? 0);
      setPendingCount(pendingRes.count ?? 0);

      // Monthly trends (current year)
      const borrowRows = (allBorrowRes.data as unknown as { status: string; created_at: string }[]) || [];
      const currentYear = new Date().getFullYear();
      const monthly: MonthlyData[] = monthNames.map((m) => ({ month: m, count: 0 }));
      borrowRows.forEach((b) => {
        const d = new Date(b.created_at);
        if (d.getFullYear() === currentYear) {
          monthly[d.getMonth()].count++;
        }
      });
      setMonthlyData(monthly);

      // Borrowings by status
      const statusMap: Record<string, number> = {};
      borrowRows.forEach((b) => {
        const s = b.status ?? 'pending';
        statusMap[s] = (statusMap[s] ?? 0) + 1;
      });
      setStatusData(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

      // Inventory by category
      const invRows = (invCatRes.data as unknown as { category_id: string | null; category: { name: string } | null }[]) || [];
      const catMap: Record<string, number> = {};
      invRows.forEach((item) => {
        const name = item.category?.name ?? 'Tidak Berkategori';
        catMap[name] = (catMap[name] ?? 0) + 1;
      });
      setCategoryData(Object.entries(catMap).map(([name, count]) => ({ name, count })));
    } catch (err) {
      console.error('Statistics error:', err);
      showToast('Gagal memuat statistik', 'error');
    } finally {
      setLoading(false);
    }
  }

  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);
  const maxStatus = Math.max(...statusData.map((s) => s.count), 1);
  const maxCategory = Math.max(...categoryData.map((c) => c.count), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: ClipboardList, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Inventaris', value: totalInventory, icon: Package, color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { label: 'Total Fasilitas', value: totalFacilities, icon: Building2, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Menunggu Persetujuan', value: pendingCount, icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan statistik dan tren peminjaman
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{card.value}</p>
                    </div>
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', card.bg)}>
                      <Icon className={cn('w-6 h-6 text-transparent bg-gradient-to-br bg-clip-text', card.color)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly trends bar chart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tren Peminjaman Bulanan</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{new Date().getFullYear()}</span>
            </div>
            <div className="flex items-end justify-between gap-1 sm:gap-2 h-48">
              {monthlyData.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.count}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-500 transition-colors min-h-[4px]"
                      style={{ height: `${(m.count / maxMonthly) * 100}%` }}
                      title={`${m.count} peminjaman`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{m.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Borrowings by status */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-cyan-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h3>
              </div>
              {statusData.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statusData.map((s) => (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {statusLabels[s.status] ?? s.status}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{s.count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', statusColors[s.status] ?? 'bg-slate-400')}
                          style={{ width: `${(s.count / maxStatus) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inventory by category */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <Package className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h3>
              </div>
              {categoryData.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryData.map((c, idx) => {
                    const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'];
                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{c.name}</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white ml-2 flex-shrink-0">{c.count}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', colors[idx % colors.length])}
                            style={{ width: `${(c.count / maxCategory) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

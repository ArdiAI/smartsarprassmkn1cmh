import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  Package, Clock, CheckCircle, XCircle, Boxes, TrendingUp, BarChart3,
} from 'lucide-react';

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

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-500' },
  approved: { label: 'Disetujui', color: 'bg-emerald-500' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-500' },
  rejected: { label: 'Ditolak', color: 'bg-red-500' },
  completed: { label: 'Selesai', color: 'bg-teal-500' },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-500' },
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [summary, setSummary] = useState({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    inventoryCount: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        // Summary counts
        const [totalRes, pendingRes, approvedRes, rejectedRes, invRes] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
        ]);

        setSummary({
          totalBorrowings: totalRes.count ?? 0,
          pending: pendingRes.count ?? 0,
          approved: approvedRes.count ?? 0,
          rejected: rejectedRes.count ?? 0,
          inventoryCount: invRes.count ?? 0,
        });

        // Monthly trends (current year)
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
        const { data: borrowingsData, error: bErr } = await supabase
          .from('borrowings')
          .select('created_at')
          .gte('created_at', yearStart);
        if (bErr) throw bErr;

        const monthCounts = new Array(12).fill(0);
        ((borrowingsData as unknown as { created_at: string }[]) || []).forEach((b) => {
          const m = new Date(b.created_at).getMonth();
          monthCounts[m]++;
        });
        setMonthlyData(monthNames.map((m, i) => ({ month: m, count: monthCounts[i] })));

        // Borrowings by status
        const { data: statusRows, error: sErr } = await supabase
          .from('borrowings')
          .select('status');
        if (sErr) throw sErr;
        const statusMap: Record<string, number> = {};
        ((statusRows as unknown as { status: string }[]) || []).forEach((r) => {
          statusMap[r.status] = (statusMap[r.status] || 0) + 1;
        });
        setStatusData(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

        // Inventory by category
        const { data: invRows, error: iErr } = await supabase
          .from('inventory')
          .select('category_id, categories(name)');
        const { data: catRows, error: cErr } = await supabase
          .from('categories')
          .select('id, name');
        if (iErr) throw iErr;
        if (cErr) throw cErr;

        const catMap: Record<string, string> = {};
        ((catRows as unknown as { id: string; name: string }[]) || []).forEach((c) => {
          catMap[c.id] = c.name;
        });

        const categoryMap: Record<string, number> = {};
        ((invRows as unknown as { category_id: string | null; categories: { name: string } | null }[]) || []).forEach((r) => {
          const catName = r.categories?.name || (r.category_id ? catMap[r.category_id] : null) || 'Tanpa Kategori';
          categoryMap[catName] = (categoryMap[catName] || 0) + 1;
        });
        setCategoryData(Object.entries(categoryMap).map(([category, count]) => ({ category, count })));
      } catch {
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxMonthly = Math.max(...monthlyData.map((d) => d.count), 1);
  const maxStatus = Math.max(...statusData.map((d) => d.count), 1);
  const maxCategory = Math.max(...categoryData.map((d) => d.count), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: summary.totalBorrowings, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Menunggu', value: summary.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: summary.approved, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
    { label: 'Ditolak', value: summary.rejected, icon: XCircle, color: 'from-red-500 to-rose-500' },
    { label: 'Total Inventaris', value: summary.inventoryCount, icon: Boxes, color: 'from-indigo-500 to-purple-500' },
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan dan tren data</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends - Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Tren Peminjaman Bulanan
          </h2>
          <div className="flex items-end justify-between gap-2 h-48">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{d.count}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all min-h-[2px]"
                  style={{ height: `${(d.count / maxMonthly) * 100}%` }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Peminjaman per Status
          </h2>
          {statusData.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">Tidak ada data</p>
          ) : (
            <div className="space-y-3">
              {statusData.map((d) => {
                const sc = statusConfig[d.status] || { label: d.status, color: 'bg-slate-500' };
                return (
                  <div key={d.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{sc.label}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{d.count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', sc.color)}
                        style={{ width: `${(d.count / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory by Category */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Boxes className="w-5 h-5 text-blue-500" />
            Inventaris per Kategori
          </h2>
          {categoryData.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">Tidak ada data</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categoryData.map((d, i) => {
                const colors = [
                  'from-blue-500 to-cyan-500',
                  'from-emerald-500 to-teal-500',
                  'from-amber-500 to-orange-500',
                  'from-indigo-500 to-purple-500',
                  'from-rose-500 to-pink-500',
                  'from-slate-500 to-slate-600',
                ];
                const color = colors[i % colors.length];
                return (
                  <div key={d.category} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{d.category}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{d.count}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full bg-gradient-to-r transition-all', color)}
                          style={{ width: `${(d.count / maxCategory) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

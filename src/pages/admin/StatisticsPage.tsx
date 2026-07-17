import { useEffect, useState } from 'react';
import { Package, TrendingUp, Building2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface MonthlyData {
  month: string;
  count: number;
}

interface CategoryData {
  category: string;
  count: number;
}

interface StatusData {
  status: string;
  count: number;
}

export default function StatisticsPage() {
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [byStatus, setByStatus] = useState<StatusData[]>([]);
  const [byCategory, setByCategory] = useState<CategoryData[]>([]);
  const [totals, setTotals] = useState({ borrowings: 0, inventory: 0, facilities: 0, approved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [borrowingsRes, inventoryRes, facilitiesRes, approvedRes, borrowingsData, inventoryData] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('borrowings').select('status, created_at'),
          supabase.from('inventory').select('category_id, categories(name)'),
        ]);

        setTotals({
          borrowings: borrowingsRes.count ?? 0,
          inventory: inventoryRes.count ?? 0,
          facilities: facilitiesRes.count ?? 0,
          approved: approvedRes.count ?? 0,
        });

        // Monthly trends (last 6 months)
        const now = new Date();
        const months: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const label = d.toLocaleDateString('id-ID', { month: 'short' });
          months.push({ month: label, count: 0 });
        }
        const borrowings = (borrowingsData.data ?? []) as unknown as { status: string; created_at: string }[];
        borrowings.forEach((b) => {
          const d = new Date(b.created_at);
          const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
          if (diff >= 0 && diff < 6) {
            months[5 - diff].count++;
          }
        });
        setMonthly(months);

        // By status
        const statusMap: Record<string, number> = {};
        borrowings.forEach((b) => {
          statusMap[b.status] = (statusMap[b.status] || 0) + 1;
        });
        setByStatus(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

        // By category
        const catMap: Record<string, number> = {};
        const inv = (inventoryData.data ?? []) as unknown as { category_id: string; categories: { name: string } | null }[];
        inv.forEach((item) => {
          const catName = item.categories?.name || 'Lainnya';
          catMap[catName] = (catName in catMap ? catMap[catName] : 0) + 1;
        });
        setByCategory(Object.entries(catMap).map(([category, count]) => ({ category, count })));
      } catch {
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
    completed: 'bg-blue-500',
    returned: 'bg-slate-500',
  };

  const summaryCards = [
    { label: 'Total Peminjaman', value: totals.borrowings, icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Disetujui', value: totals.approved, icon: CheckCircle, color: 'from-emerald-500 to-green-600' },
    { label: 'Total Inventaris', value: totals.inventory, icon: Building2, color: 'from-cyan-500 to-teal-500' },
    { label: 'Total Fasilitas', value: totals.facilities, icon: TrendingUp, color: 'from-purple-500 to-indigo-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analisis data SMART SARPRAS</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</p>
              </div>
              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', card.color)}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trends bar chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Tren Bulanan Peminjaman</h2>
          <div className="flex items-end justify-between gap-2 h-48">
            {monthly.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all hover:opacity-80 relative group"
                    style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: '4px' }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.count}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Peminjaman per Status</h2>
          {byStatus.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Belum ada data</p>
          ) : (
            <div className="space-y-4">
              {byStatus.map((s) => {
                const total = byStatus.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? (s.count / total) * 100 : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{s.status}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{s.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', statusColors[s.status] || 'bg-slate-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory by category */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Inventaris per Kategori</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {byCategory.map((c) => (
                <div key={c.category} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-32 truncate flex-shrink-0">{c.category}</span>
                  <div className="flex-1 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-end pr-3 transition-all"
                      style={{ width: `${(c.count / maxCategory) * 100}%`, minWidth: '40px' }}
                    >
                      <span className="text-xs font-semibold text-white">{c.count}</span>
                    </div>
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

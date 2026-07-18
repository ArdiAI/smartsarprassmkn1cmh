import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  BarChart3, Loader2, Package, Clock, CheckCircle, XCircle, TrendingUp, Boxes,
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
  approved: 'bg-emerald-500',
  returned: 'bg-blue-500',
  rejected: 'bg-red-500',
  completed: 'bg-teal-500',
  cancelled: 'bg-slate-400',
};

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [byStatus, setByStatus] = useState<StatusData[]>([]);
  const [byCategory, setByCategory] = useState<CategoryData[]>([]);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [totalFacilities, setTotalFacilities] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: borrowings }, { count: invCount }, { count: facCount }] = await Promise.all([
          supabase.from('borrowings').select('status, created_at'),
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase.from('facilities').select('*', { count: 'exact', head: true }),
        ]);

        const all = (borrowings as unknown as { status: string; created_at: string }[]) || [];

        // Monthly trends (last 6 months)
        const now = new Date();
        const months: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = d.toLocaleDateString('id-ID', { month: 'short' });
          const count = all.filter(b => {
            if (!b.created_at) return false;
            const bDate = new Date(b.created_at);
            const bKey = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}`;
            return bKey === monthKey;
          }).length;
          months.push({ month: monthLabel, count });
        }
        setMonthly(months);

        // By status
        const statusMap: Record<string, number> = {};
        all.forEach(b => {
          const s = b.status ?? 'pending';
          statusMap[s] = (statusMap[s] ?? 0) + 1;
        });
        setByStatus(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

        setTotalBorrowings(all.length);
        setTotalInventory(invCount ?? 0);
        setTotalFacilities(facCount ?? 0);

        // Inventory by category
        const { data: invData } = await supabase
          .from('inventory')
          .select('category_id, categories(name)');
        const invItems = (invData as unknown as { category_id: string | null; categories: { name: string } | null }[]) || [];
        const catMap: Record<string, number> = {};
        invItems.forEach(item => {
          const name = item.categories?.name ?? 'Tanpa Kategori';
          catMap[name] = (catMap[name] ?? 0) + 1;
        });
        setByCategory(Object.entries(catMap).map(([name, count]) => ({ name, count })));
      } catch (e) {
        console.error(e);
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxMonthly = Math.max(...monthly.map(m => m.count), 1);
  const maxStatus = Math.max(...byStatus.map(s => s.count), 1);
  const maxCategory = Math.max(...byCategory.map(c => c.count), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: Clock, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Inventaris', value: totalInventory, icon: Package, color: 'from-purple-500 to-indigo-500' },
    { label: 'Total Fasilitas', value: totalFacilities, icon: Boxes, color: 'from-emerald-500 to-teal-500' },
  ];

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
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan data dan tren</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', card.color)}>
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
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tren Peminjaman (6 Bulan)</h2>
        </div>
        <div className="flex items-end justify-between gap-2 h-48">
          {monthly.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center flex-1">
                <div
                  className="w-full max-w-[60px] bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all hover:opacity-80 relative group"
                  style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: '4px' }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.count}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: Status + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Borrowings by Status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>
          {byStatus.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {byStatus.map(s => {
                const label = statusLabels[s.status] ?? s.status;
                const color = statusColors[s.status] ?? 'bg-slate-400';
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-300">{label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{s.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', color)}
                        style={{ width: `${(s.count / maxStatus) * 100}%` }}
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
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
          </div>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {byCategory.map(c => (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{c.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{c.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                      style={{ width: `${(c.count / maxCategory) * 100}%` }}
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

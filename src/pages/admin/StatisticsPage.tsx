import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  BarChart3, Loader2, Package, Clock, CheckCircle, XCircle, Boxes, TrendingUp,
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

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [byStatus, setByStatus] = useState<StatusData[]>([]);
  const [byCategory, setByCategory] = useState<CategoryData[]>([]);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        // Fetch all borrowings for monthly aggregation
        const { data: borrowingsData } = await supabase
          .from('borrowings')
          .select('created_at, status')
          .order('created_at', { ascending: true });

        const borrowings = (borrowingsData as unknown as Array<{ created_at: string; status: string }>) ?? [];

        // Aggregate monthly (last 12 months)
        const monthMap: Record<string, number> = {};
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap[key] = 0;
        }
        borrowings.forEach((b) => {
          const d = new Date(b.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key in monthMap) monthMap[key]++;
        });
        const monthlyArr: MonthlyData[] = Object.entries(monthMap).map(([key, count]) => {
          const [y, m] = key.split('-');
          const monthName = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('id-ID', { month: 'short' });
          return { month: monthName, count };
        });
        setMonthly(monthlyArr);

        // Aggregate by status
        const statusMap: Record<string, number> = {};
        borrowings.forEach((b) => {
          statusMap[b.status] = (statusMap[b.status] || 0) + 1;
        });
        const statusArr: StatusData[] = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
        setByStatus(statusArr);

        setTotalBorrowings(borrowings.length);
        setPendingCount(statusMap['pending'] || 0);
        setApprovedCount(statusMap['approved'] || 0);
        setRejectedCount(statusMap['rejected'] || 0);

        // Inventory count
        const { count: invCount } = await supabase.from('inventory').select('id', { count: 'exact', head: true });
        setTotalInventory(invCount ?? 0);

        // Inventory by category
        const { data: invData } = await supabase
          .from('inventory')
          .select('category_id, category(name)');
        const invRows = (invData as unknown as Array<{ category_id: string | null; category: { name: string } | null }>) ?? [];
        const catMap: Record<string, number> = {};
        invRows.forEach((r) => {
          const name = r.category?.name ?? 'Tanpa Kategori';
          catMap[name] = (catMap[name] || 0) + 1;
        });
        const catArr: CategoryData[] = Object.entries(catMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        setByCategory(catArr);
      } catch (e) {
        console.error(e);
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    returned: 'bg-blue-500',
    rejected: 'bg-red-500',
    completed: 'bg-emerald-500',
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

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Menunggu', value: pendingCount, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: approvedCount, icon: CheckCircle, color: 'from-emerald-500 to-green-500' },
    { label: 'Ditolak', value: rejectedCount, icon: XCircle, color: 'from-red-500 to-pink-500' },
    { label: 'Total Inventaris', value: totalInventory, icon: Boxes, color: 'from-purple-500 to-indigo-500' },
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
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan data peminjaman dan inventaris</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Bar Chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Tren Peminjaman Bulanan</h2>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {monthly.map((m, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                  <div
                    className="w-full max-w-[2rem] rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:opacity-80 relative group"
                    style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: '4px' }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.count}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by Status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>
          {byStatus.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Tidak ada data</p>
          ) : (
            <div className="space-y-3">
              {byStatus.map((s) => {
                const pct = totalBorrowings > 0 ? (s.count / totalBorrowings) * 100 : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {statusLabels[s.status] || s.status}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{s.count}</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', statusColors[s.status] || 'bg-slate-400')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inventory by Category */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Boxes className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
        </div>
        {byCategory.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10">Tidak ada data</p>
        ) : (
          <div className="space-y-3">
            {byCategory.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{c.name}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{c.count}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
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

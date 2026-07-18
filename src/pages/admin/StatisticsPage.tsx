import { useEffect, useState } from 'react';
import {
  BarChart3, Package, Clock, CheckCircle, XCircle, Boxes, TrendingUp, Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

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

interface Stats {
  totalBorrowings: number;
  pendingBorrowings: number;
  approvedBorrowings: number;
  rejectedBorrowings: number;
  inventoryCount: number;
  facilityCount: number;
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalBorrowings: 0,
    pendingBorrowings: 0,
    approvedBorrowings: 0,
    rejectedBorrowings: 0,
    inventoryCount: 0,
    facilityCount: 0,
  });
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    try {
      setLoading(true);
      const [
        totalRes, pendingRes, approvedRes, rejectedRes,
        inventoryRes, facilityRes,
        monthlyRes, statusRes,
      ] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('created_at'),
        supabase.from('borrowings').select('status'),
      ]);

      setStats({
        totalBorrowings: totalRes.count ?? 0,
        pendingBorrowings: pendingRes.count ?? 0,
        approvedBorrowings: approvedRes.count ?? 0,
        rejectedBorrowings: rejectedRes.count ?? 0,
        inventoryCount: inventoryRes.count ?? 0,
        facilityCount: facilityRes.count ?? 0,
      });

      // Monthly trends (last 6 months)
      const borrowDates = (monthlyRes.data as unknown as { created_at: string }[]) ?? [];
      const now = new Date();
      const months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
        const count = borrowDates.filter((b) => {
          const bd = new Date(b.created_at);
          return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth();
        }).length;
        months.push({ month: monthName, count });
      }
      setMonthlyTrends(months);

      // Status distribution
      const borrowStatuses = (statusRes.data as unknown as { status: string }[]) ?? [];
      const statusMap = new Map<string, number>();
      for (const b of borrowStatuses) {
        const s = b.status ?? 'unknown';
        statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
      }
      setStatusData(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })));

      // Inventory by category
      const { data: invData, error: invErr } = await supabase
        .from('inventory')
        .select('category_id, category:category_id(name)');
      if (invErr) throw invErr;
      const invItems = (invData as unknown as { category_id: string | null; category: { name: string } | null }[]) ?? [];
      const catMap = new Map<string, number>();
      for (const item of invItems) {
        const catName = item.category?.name ?? 'Tanpa Kategori';
        catMap.set(catName, (catMap.get(catName) ?? 0) + 1);
      }
      setCategoryData(Array.from(catMap.entries()).map(([category, count]) => ({ category, count })));
    } catch (err) {
      console.error('Stats error:', err);
      showToast('Gagal memuat statistik', 'error');
    } finally {
      setLoading(false);
    }
  }

  const summaryCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Menunggu', value: stats.pendingBorrowings, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: stats.approvedBorrowings, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
    { label: 'Ditolak', value: stats.rejectedBorrowings, icon: XCircle, color: 'from-red-500 to-rose-500' },
    { label: 'Inventaris', value: stats.inventoryCount, icon: Boxes, color: 'from-indigo-500 to-purple-500' },
    { label: 'Fasilitas', value: stats.facilityCount, icon: Building2Icon, color: 'from-cyan-500 to-blue-500' },
  ];

  const maxMonthly = Math.max(...monthlyTrends.map((m) => m.count), 1);
  const maxCategory = Math.max(...categoryData.map((c) => c.count), 1);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
    returned: 'bg-blue-500',
    completed: 'bg-slate-500',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    returned: 'Dikembalikan',
    completed: 'Selesai',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ringkasan dan tren data sistem</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', card.color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? '...' : card.value}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Monthly Trends Bar Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tren Peminjaman Bulanan</h2>
        </div>

        {loading ? (
          <div className="h-48 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-end justify-between gap-2 sm:gap-4 h-48 px-2">
            {monthlyTrends.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{m.count}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:from-blue-600 hover:to-cyan-500 min-h-[4px]"
                  style={{ height: `${(m.count / maxMonthly) * 100}%` }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Borrowings by Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : statusData.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Tidak ada data</p>
          ) : (
            <div className="space-y-3">
              {statusData.map((s) => {
                const total = statusData.reduce((sum, x) => sum + x.count, 0);
                const pct = total > 0 ? (s.count / total) * 100 : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {statusLabels[s.status] ?? s.status}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{s.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', statusColors[s.status] ?? 'bg-slate-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory by Category */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Boxes className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : categoryData.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Tidak ada data</p>
          ) : (
            <div className="space-y-3">
              {categoryData.map((c) => {
                const pct = (c.count / maxCategory) * 100;
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{c.category}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">{c.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
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

      {/* Footer note */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <Calendar className="w-3.5 h-3.5" />
        <span>Data diperbarui secara real-time dari database</span>
      </div>
    </div>
  );
}

// Inline Building2 icon to avoid unused import if not needed elsewhere
function Building2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

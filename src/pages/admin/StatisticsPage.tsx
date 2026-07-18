import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { Loader2, Package, Clock, CheckCircle, XCircle, TrendingUp, BarChart3, Layers } from 'lucide-react';

interface MonthlyTrend {
  month: string;
  count: number;
}

interface CategoryCount {
  category_id: string | null;
  category_name: string;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [borrowingsRes, inventoryRes, pendingRes, approvedRes] = await Promise.all([
          supabase.from('borrowings').select('id, created_at, status'),
          supabase.from('inventory').select('id, category_id'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        ]);

        const allBorrowings = (borrowingsRes.data as unknown as Array<{ id: string; created_at: string; status: string }>) || [];
        const allInventory = (inventoryRes.data as unknown as Array<{ id: string; category_id: string | null }>) || [];

        setTotalBorrowings(allBorrowings.length);
        setTotalInventory(allInventory.length);
        setPendingCount(pendingRes.count ?? 0);
        setApprovedCount(approvedRes.count ?? 0);

        // Monthly trends (last 6 months)
        const now = new Date();
        const months: MonthlyTrend[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleString('id-ID', { month: 'short' });
          const count = allBorrowings.filter(b => (b.created_at ?? '').slice(0, 7) === key).length;
          months.push({ month: label, count });
        }
        setMonthlyTrends(months);

        // Borrowings by status
        const statusMap = new Map<string, number>();
        for (const b of allBorrowings) {
          statusMap.set(b.status, (statusMap.get(b.status) ?? 0) + 1);
        }
        setStatusCounts(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })));

        // Inventory by category — fetch category names
        const categoryIds = [...new Set(allInventory.map(i => i.category_id).filter(Boolean) as string[])];
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', categoryIds.length > 0 ? categoryIds : ['00000000-0000-0000-0000-000000000000']);
        const categories = (categoriesData as unknown as Array<{ id: string; name: string }>) || [];
        const catNameMap = new Map<string, string>();
        for (const c of categories) catNameMap.set(c.id, c.name);

        const catMap = new Map<string, CategoryCount>();
        for (const inv of allInventory) {
          const cid = inv.category_id ?? 'uncategorized';
          const existing = catMap.get(cid);
          if (existing) {
            existing.count += 1;
          } else {
            catMap.set(cid, {
              category_id: inv.category_id,
              category_name: catNameMap.get(inv.category_id ?? '') ?? 'Tanpa Kategori',
              count: 1,
            });
          }
        }
        setCategoryCounts(Array.from(catMap.values()).sort((a, b) => b.count - a.count));
      } catch (e) {
        console.error(e);
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const maxMonthly = Math.max(...monthlyTrends.map(m => m.count), 1);
  const maxCategory = Math.max(...categoryCounts.map(c => c.count), 1);

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
    completed: 'bg-emerald-600',
    cancelled: 'bg-slate-500',
  };

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: Package, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Menunggu', value: pendingCount, icon: Clock, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Disetujui', value: approvedCount, icon: CheckCircle, iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Total Inventaris', value: totalInventory, icon: Layers, iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan dan tren aktivitas sarana dan prasarana
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Bar Chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tren Peminjaman (6 Bulan)</h2>
          </div>
          <div className="flex items-end justify-between gap-3 h-48">
            {monthlyTrends.map((m, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    className="w-full max-w-[3rem] rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:from-blue-600 hover:to-cyan-500 relative group"
                    style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '8px' : '2px' }}
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

        {/* Borrowings by Status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>
          {statusCounts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">Belum ada data</p>
          ) : (
            <div className="space-y-4">
              {statusCounts.map(s => {
                const total = statusCounts.reduce((sum, x) => sum + x.count, 0) || 1;
                const pct = Math.round((s.count / total) * 100);
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {statusLabels[s.status] ?? s.status}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{s.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${statusColors[s.status] ?? 'bg-slate-500'}`}
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
        <div className="flex items-center gap-2 mb-5">
          <Layers className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
        </div>
        {categoryCounts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">Belum ada data</p>
        ) : (
          <div className="space-y-4">
            {categoryCounts.map(c => (
              <div key={c.category_id ?? 'uncategorized'}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.category_name}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{c.count}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
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

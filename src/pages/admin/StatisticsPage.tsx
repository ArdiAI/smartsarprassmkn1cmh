import { useEffect, useState } from 'react';
import {
  Package, Clock, CheckCircle, XCircle, Building2, BarChart3, TrendingUp, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface MonthlyData {
  month: string;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface CategoryCount {
  name: string;
  count: number;
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [summary, setSummary] = useState({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    inventoryCount: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [borrowingsRes, pendingRes, approvedRes, rejectedRes, inventoryRes] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
      ]);

      setSummary({
        totalBorrowings: borrowingsRes.count || 0,
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        rejected: rejectedRes.count || 0,
        inventoryCount: inventoryRes.count || 0,
      });

      // Monthly trends - last 6 months
      const now = new Date();
      const months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const { count } = await supabase
          .from('borrowings')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', end);
        months.push({
          month: d.toLocaleDateString('id-ID', { month: 'short' }),
          count: count || 0,
        });
      }
      setMonthly(months);

      // Borrowings by status
      const { data: statusData } = await supabase
        .from('borrowings')
        .select('status');
      const statusMap: Record<string, number> = {};
      (statusData as unknown as { status: string }[] || []).forEach((r) => {
        statusMap[r.status] = (statusMap[r.status] || 0) + 1;
      });
      setStatusCounts(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

      // Inventory by category
      const { data: invData } = await supabase
        .from('inventory')
        .select('id, categories(name)');
      const catMap: Record<string, number> = {};
      (invData as unknown as { categories: { name: string } | null }[] || []).forEach((r) => {
        const name = r.categories?.name || 'Lainnya';
        catMap[name] = (catMap[name] || 0) + 1;
      });
      setCategoryCounts(Object.entries(catMap).map(([name, count]) => ({ name, count })));
    } catch {
      showToast('Gagal memuat statistik', 'error');
    } finally {
      setLoading(false);
    }
  };

  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);
  const maxCategory = Math.max(...categoryCounts.map((c) => c.count), 1);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
    completed: 'bg-blue-500',
    returned: 'bg-slate-500',
  };

  const summaryCards = [
    { label: 'Total Peminjaman', value: summary.totalBorrowings, icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Pending', value: summary.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: summary.approved, icon: CheckCircle, color: 'from-emerald-500 to-green-500' },
    { label: 'Ditolak', value: summary.rejected, icon: XCircle, color: 'from-red-500 to-rose-500' },
    { label: 'Total Inventaris', value: summary.inventoryCount, icon: Building2, color: 'from-cyan-500 to-teal-500' },
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
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analisis data sistem</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-4">
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', card.color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Monthly trends bar chart */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tren Peminjaman Bulanan</h2>
        </div>
        <div className="flex items-end justify-between gap-3 h-48">
          {monthly.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:from-blue-600 hover:to-cyan-500 relative group"
                  style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '8px' : '2px' }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.count}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Borrowings by status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>
          {statusCounts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Tidak ada data</p>
          ) : (
            <div className="space-y-3">
              {statusCounts.map((s) => {
                const total = statusCounts.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? (s.count / total) * 100 : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{s.status}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{s.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
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
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
          </div>
          {categoryCounts.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryCounts.map((c) => {
                const pct = (c.count / maxCategory) * 100;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{c.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
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
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Package,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';

interface MonthlyTrend {
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
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [
          borrowRes,
          invRes,
          approvedRes,
          pendingRes,
          rejectedRes,
          allBorrowRes,
          allInvRes,
        ] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
          supabase.from('borrowings').select('borrow_date, status'),
          supabase.from('inventory').select('category_id, categories!category_id(name)'),
        ]);

        setTotalBorrowings(borrowRes.count ?? 0);
        setTotalInventory(invRes.count ?? 0);
        setApprovedCount(approvedRes.count ?? 0);
        setPendingCount(pendingRes.count ?? 0);
        setRejectedCount(rejectedRes.count ?? 0);

        // Monthly trends (last 6 months)
        const now = new Date();
        const months: MonthlyTrend[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
          const count = (allBorrowRes.data ?? []).filter((b: any) => (b.borrow_date ?? '').startsWith(ym)).length;
          months.push({ month: label, count });
        }
        setMonthlyTrends(months);

        // Status counts
        const statusMap: Record<string, number> = {};
        (allBorrowRes.data ?? []).forEach((b: any) => {
          const s = b.status ?? 'unknown';
          statusMap[s] = (statusMap[s] ?? 0) + 1;
        });
        setStatusCounts(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

        // Category counts
        const catMap: Record<string, number> = {};
        (allInvRes.data ?? []).forEach((inv: any) => {
          const name = inv.categories?.name ?? 'Tanpa Kategori';
          catMap[name] = (catMap[name] ?? 0) + 1;
        });
        setCategoryCounts(Object.entries(catMap).map(([name, count]) => ({ name, count })));
      } catch {
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxTrend = Math.max(...monthlyTrends.map((m) => m.count), 1);
  const maxCategory = Math.max(...categoryCounts.map((c) => c.count), 1);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
    returned: 'bg-slate-500',
    borrowed: 'bg-purple-500',
  };

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: ClipboardList, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40' },
    { label: 'Total Inventaris', value: totalInventory, icon: Package, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40' },
    { label: 'Disetujui', value: approvedCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' },
    { label: 'Menunggu', value: pendingCount, icon: Clock, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' },
    { label: 'Ditolak', value: rejectedCount, icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/40' },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Statistik</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ringkasan statistik peminjaman dan inventaris.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map((s) => (
          <div key={s.label} className="card">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly trends bar chart */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Tren Peminjaman (6 Bulan)</h2>
          </div>
          <div className="flex h-48 items-end justify-between gap-3">
            {monthlyTrends.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-cyan-400 transition-all"
                    style={{ height: `${(m.count / maxTrend) * 100}%`, minHeight: '4px' }}
                    title={`${m.count} peminjaman`}
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by status */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Peminjaman per Status</h2>
          </div>
          {statusCounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada data.</p>
          ) : (
            <div className="space-y-4">
              {statusCounts.map((s) => {
                const maxStatus = Math.max(...statusCounts.map((x) => x.count), 1);
                return (
                  <div key={s.status}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize text-slate-700 dark:text-slate-300">{s.status}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{s.count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${statusColors[s.status] ?? 'bg-slate-500'}`}
                        style={{ width: `${(s.count / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inventory by category */}
      <div className="card mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Inventaris per Kategori</h2>
        </div>
        {categoryCounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada data.</p>
        ) : (
          <div className="space-y-4">
            {categoryCounts.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{c.count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-brand-500"
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

import { useEffect, useState, useMemo } from 'react';
import {
  Loader2,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StatusCount {
  status: string;
  count: number;
}

interface CategoryCount {
  name: string;
  count: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  returned: 'bg-slate-500',
  borrowed: 'bg-purple-500',
  completed: 'bg-cyan-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  returned: 'Dikembalikan',
  borrowed: 'Dipinjam',
  completed: 'Selesai',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [monthlyData, setMonthlyData] = useState<number[]>(Array(12).fill(0));
  const [totalInventory, setTotalInventory] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const now = new Date();
        const year = now.getFullYear();

        const [
          borrowCount,
          statusData,
          invCount,
          reportCount,
          pendingReportCount,
          monthlyBorrow,
        ] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('status'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('damage_reports').select('id', { count: 'exact', head: true }),
          supabase.from('damage_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('borrow_date').gte('borrow_date', `${year}-01-01`).lte('borrow_date', `${year}-12-31`),
        ]);

        setTotalBorrowings(borrowCount.count ?? 0);
        setTotalInventory(invCount.count ?? 0);
        setTotalReports(reportCount.count ?? 0);
        setPendingReports(pendingReportCount.count ?? 0);

        // Status counts
        const sMap: Record<string, number> = {};
        ((statusData.data as unknown as { status: string }[]) ?? []).forEach((b) => {
          const s = b.status ?? 'pending';
          sMap[s] = (sMap[s] ?? 0) + 1;
        });
        setStatusCounts(Object.entries(sMap).map(([status, count]) => ({ status, count })));

        // Monthly data
        const monthArr = Array(12).fill(0);
        ((monthlyBorrow.data as unknown as { borrow_date: string }[]) ?? []).forEach((b) => {
          const m = parseInt((b.borrow_date ?? '').slice(5, 7), 10);
          if (m >= 1 && m <= 12) monthArr[m - 1]++;
        });
        setMonthlyData(monthArr);

        // Category counts
        const { data: invData } = await supabase
          .from('inventory')
          .select('categories!category_id(name)');
        const cMap: Record<string, number> = {};
        ((invData as unknown as { categories: { name: string } | null }[]) ?? []).forEach((it) => {
          const name = it.categories?.name ?? 'Tanpa Kategori';
          cMap[name] = (cMap[name] ?? 0) + 1;
        });
        setCategoryCounts(Object.entries(cMap).map(([name, count]) => ({ name, count })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxMonthly = useMemo(() => Math.max(...monthlyData, 1), [monthlyData]);
  const maxStatus = useMemo(() => Math.max(...statusCounts.map((s) => s.count), 1), [statusCounts]);
  const maxCategory = useMemo(() => Math.max(...categoryCounts.map((c) => c.count), 1), [categoryCounts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: Package, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300' },
    { label: 'Total Inventaris', value: totalInventory, icon: TrendingUp, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-300' },
    { label: 'Laporan Kerusakan', value: totalReports, icon: AlertTriangle, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300' },
    { label: 'Laporan Menunggu', value: pendingReports, icon: Clock, color: 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Statistik</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ringkasan statistik peminjaman, inventaris, dan laporan kerusakan.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${s.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Monthly trends bar chart */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">
            Tren Peminjaman Bulanan ({new Date().getFullYear()})
          </h2>
          <div className="flex h-48 items-end justify-between gap-1.5">
            {monthlyData.map((val, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-brand-500 transition-all hover:bg-brand-600"
                    style={{ height: `${(val / maxMonthly) * 100}%`, minHeight: val > 0 ? '4px' : '0' }}
                    title={`${val} peminjaman`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{MONTH_NAMES[idx]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by status */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">
            Peminjaman per Status
          </h2>
          {statusCounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada data.</p>
          ) : (
            <div className="space-y-3">
              {statusCounts.map((s) => (
                <div key={s.status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{statusLabels[s.status] ?? s.status}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{s.count}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${statusColors[s.status] ?? 'bg-slate-500'}`}
                      style={{ width: `${(s.count / maxStatus) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory by category */}
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">
            Inventaris per Kategori
          </h2>
          {categoryCounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada data.</p>
          ) : (
            <div className="space-y-3">
              {categoryCounts.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{c.name}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.count}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500"
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

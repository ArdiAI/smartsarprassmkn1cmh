import { useEffect, useState } from 'react';
import {
  Package,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface Stats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
  totalInventory: number;
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

interface CategoryData {
  name: string;
  count: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats>({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    returned: 0,
    totalInventory: 0,
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
  });
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [byCategory, setByCategory] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const year = new Date().getFullYear();

        const [allB, pendingB, approvedB, rejectedB, returnedB, inv, allReports, pendingR, resolvedR] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'returned'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('damage_reports').select('id', { count: 'exact', head: true }),
          supabase.from('damage_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('damage_reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
        ]);

        setStats({
          totalBorrowings: allB.count ?? 0,
          pending: pendingB.count ?? 0,
          approved: approvedB.count ?? 0,
          rejected: rejectedB.count ?? 0,
          returned: returnedB.count ?? 0,
          totalInventory: inv.count ?? 0,
          totalReports: allReports.count ?? 0,
          pendingReports: pendingR.count ?? 0,
          resolvedReports: resolvedR.count ?? 0,
        });

        // Monthly borrowings this year
        const { data: monthlyData } = await supabase
          .from('borrowings')
          .select('borrow_date')
          .gte('borrow_date', `${year}-01-01`)
          .lte('borrow_date', `${year}-12-31`);
        const monthCounts: number[] = new Array(12).fill(0);
        (monthlyData ?? []).forEach((b: any) => {
          const d = b.borrow_date;
          if (d) {
            const m = parseInt(d.split('-')[1], 10) - 1;
            if (m >= 0 && m < 12) monthCounts[m]++;
          }
        });
        setMonthly(monthCounts.map((count, i) => ({ month: MONTH_NAMES[i], count })));

        // Inventory by category
        const { data: invData } = await supabase
          .from('inventory')
          .select('category_id, categories!category_id(name)');
        const catMap: Record<string, number> = {};
        (invData ?? []).forEach((item: any) => {
          const name = item.categories?.name ?? 'Tanpa Kategori';
          catMap[name] = (catMap[name] ?? 0) + 1;
        });
        setByCategory(
          Object.entries(catMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count),
        );
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'bg-blue-500' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'Menunggu', value: stats.pending, icon: Clock, color: 'bg-amber-500' },
    { label: 'Total Inventaris', value: stats.totalInventory, icon: Package, color: 'bg-cyan-500' },
    { label: 'Total Laporan', value: stats.totalReports, icon: AlertTriangle, color: 'bg-orange-500' },
    { label: 'Laporan Selesai', value: stats.resolvedReports, icon: CheckCircle2, color: 'bg-emerald-500' },
  ];

  const statusData = [
    { label: 'Disetujui', value: stats.approved, color: 'bg-emerald-500' },
    { label: 'Menunggu', value: stats.pending, color: 'bg-amber-500' },
    { label: 'Ditolak', value: stats.rejected, color: 'bg-red-500' },
    { label: 'Dikembalikan', value: stats.returned, color: 'bg-slate-500' },
  ];
  const totalStatus = statusData.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Statistik</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ringkasan dan tren data sarana prasarana sekolah.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaryCards.map((s) => (
              <div key={s.label} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
                  </div>
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl text-white', s.color)}>
                    <s.icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Monthly trends bar chart */}
            <div className="card">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-500" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Tren Peminjaman {new Date().getFullYear()}
                </h2>
              </div>
              <div className="flex h-48 items-end justify-between gap-1">
                {monthly.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
                        style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '4px' : '0' }}
                        title={`${m.count} peminjaman`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Borrowings by status */}
            <div className="card">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-500" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Peminjaman per Status
                </h2>
              </div>
              <div className="space-y-3">
                {statusData.map((d) => (
                  <div key={d.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{d.label}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{d.value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={cn('h-full rounded-full transition-all', d.color)}
                        style={{ width: `${(d.value / totalStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory by category */}
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-500" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Inventaris per Kategori
              </h2>
            </div>
            {byCategory.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada data kategori.</p>
            ) : (
              <div className="space-y-3">
                {byCategory.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{c.name}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                        style={{ width: `${(c.count / maxCategory) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

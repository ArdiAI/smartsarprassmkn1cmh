import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Boxes,
  Loader2,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface StatusCount {
  status: string;
  count: number;
}

interface CategoryCount {
  name: string;
  count: number;
}

interface MonthlyCount {
  month: string;
  count: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  returned: 'bg-slate-500',
  completed: 'bg-cyan-500',
  borrowed: 'bg-purple-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  returned: 'Dikembalikan',
  completed: 'Selesai',
  borrowed: 'Dipinjam',
};

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [monthlyCounts, setMonthlyCounts] = useState<MonthlyCount[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [borrowRes, pendingRes, approvedRes, rejectedRes, invRes] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
        ]);
        setTotalBorrowings(borrowRes.count ?? 0);
        setPendingCount(pendingRes.count ?? 0);
        setApprovedCount(approvedRes.count ?? 0);
        setRejectedCount(rejectedRes.count ?? 0);
        setInventoryCount(invRes.count ?? 0);

        // Status counts
        const { data: statusData } = await supabase
          .from('borrowings')
          .select('status');
        const sMap: Record<string, number> = {};
        (statusData ?? []).forEach((b: any) => {
          const s = b.status ?? 'unknown';
          sMap[s] = (sMap[s] ?? 0) + 1;
        });
        setStatusCounts(Object.entries(sMap).map(([status, count]) => ({ status, count })));

        // Category counts
        const { data: catData } = await supabase
          .from('inventory')
          .select('categories!category_id(name)');
        const cMap: Record<string, number> = {};
        (catData ?? []).forEach((c: any) => {
          const name = c?.categories?.name ?? 'Tanpa Kategori';
          cMap[name] = (cMap[name] ?? 0) + 1;
        });
        setCategoryCounts(Object.entries(cMap).map(([name, count]) => ({ name, count })));

        // Monthly trends (current year)
        const now = new Date();
        const year = now.getFullYear();
        const { data: borrowData } = await supabase
          .from('borrowings')
          .select('borrow_date');
        const mMap: Record<number, number> = {};
        (borrowData ?? []).forEach((b: any) => {
          if (!b.borrow_date) return;
          const m = parseInt(b.borrow_date.split('-')[1], 10) - 1;
          if (m >= 0 && m < 12) mMap[m] = (mMap[m] ?? 0) + 1;
        });
        const monthly: MonthlyCount[] = MONTH_NAMES.map((month, i) => ({
          month,
          count: mMap[i] ?? 0,
        }));
        setMonthlyCounts(monthly);
      } catch {
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const maxMonthly = Math.max(...monthlyCounts.map((m) => m.count), 1);
  const maxStatus = Math.max(...statusCounts.map((s) => s.count), 1);
  const maxCategory = Math.max(...categoryCounts.map((c) => c.count), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: Package, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-900/30' },
    { label: 'Menunggu', value: pendingCount, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Disetujui', value: approvedCount, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Ditolak', value: rejectedCount, icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
    { label: 'Total Barang', value: inventoryCount, icon: Boxes, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Statistik</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ringkasan dan tren peminjaman serta inventaris</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly trends bar chart */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tren Peminjaman Bulanan</h2>
          </div>
          <div className="flex h-48 items-end justify-between gap-1">
            {monthlyCounts.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-brand-500 transition-all hover:bg-brand-600"
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
            <BarChart3 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Peminjaman per Status</h2>
          </div>
          {statusCounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {statusCounts.map((s) => (
                <div key={s.status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{statusLabels[s.status] ?? s.status}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{s.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
      </div>

      {/* Inventory by category */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Boxes className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Inventaris per Kategori</h2>
        </div>
        {categoryCounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Belum ada data</p>
        ) : (
          <div className="space-y-3">
            {categoryCounts.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{c.name}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{c.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-500"
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

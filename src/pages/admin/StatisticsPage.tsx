import { useEffect, useState, useCallback } from 'react';
import {
  Package, Clock, CheckCircle2, XCircle, BarChart3, Loader2, TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import EmptyState from '../../components/EmptyState';

interface MonthlyCount {
  month: string;
  count: number;
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    returned: 0,
    totalInventory: 0,
    totalFacilities: 0,
    totalReports: 0,
    resolvedReports: 0,
  });
  const [monthly, setMonthly] = useState<MonthlyCount[]>([]);
  const [byCategory, setByCategory] = useState<{ name: string; count: number }[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [
        borrowRes, invRes, facRes, reportRes, resolvedRes,
      ] = await Promise.all([
        supabase.from('borrowings').select('id, status, borrow_date'),
        supabase.from('inventory').select('id, category_id'),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        supabase.from('damage_reports').select('id', { count: 'exact', head: true }),
        supabase.from('damage_reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      ]);

      const borrowings = (borrowRes.data ?? []) as unknown as { id: string; status: string; borrow_date: string | null }[];
      const inventory = (invRes.data ?? []) as unknown as { id: string; category_id: string | null }[];

      setSummary({
        totalBorrowings: borrowings.length,
        pending: borrowings.filter((b) => b.status === 'pending').length,
        approved: borrowings.filter((b) => b.status === 'approved').length,
        rejected: borrowings.filter((b) => b.status === 'rejected').length,
        returned: borrowings.filter((b) => b.status === 'returned').length,
        totalInventory: inventory.length,
        totalFacilities: facRes.count ?? 0,
        totalReports: reportRes.count ?? 0,
        resolvedReports: resolvedRes.count ?? 0,
      });

      // Monthly trends (last 6 months)
      const now = new Date();
      const months: MonthlyCount[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const count = borrowings.filter((b) => b.borrow_date?.startsWith(ym) ?? false).length;
        months.push({ month: d.toLocaleDateString('id-ID', { month: 'short' }), count });
      }
      setMonthly(months);

      // Inventory by category
      const { data: cats } = await supabase.from('categories').select('id, name').order('name');
      const catList = (cats ?? []) as unknown as { id: string; name: string }[];
      const catCounts = catList.map((c) => ({
        name: c.name,
        count: inventory.filter((i) => i.category_id === c.id).length,
      })).sort((a, b) => b.count - a.count);
      setByCategory(catCounts);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);

  const statusData = [
    { label: 'Menunggu', value: summary.pending, color: 'bg-amber-500', text: 'text-amber-600' },
    { label: 'Disetujui', value: summary.approved, color: 'bg-emerald-500', text: 'text-emerald-600' },
    { label: 'Ditolak', value: summary.rejected, color: 'bg-red-500', text: 'text-red-600' },
    { label: 'Dikembalikan', value: summary.returned, color: 'bg-slate-500', text: 'text-slate-600' },
  ];

  const summaryCards = [
    { label: 'Total Peminjaman', value: summary.totalBorrowings, icon: Package, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
    { label: 'Total Inventaris', value: summary.totalInventory, icon: Package, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30' },
    { label: 'Total Fasilitas', value: summary.totalFacilities, icon: Package, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
    { label: 'Laporan Kerusakan', value: summary.totalReports, icon: BarChart3, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30' },
    { label: 'Laporan Selesai', value: summary.resolvedReports, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Menunggu Persetujuan', value: summary.pending, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Statistik</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ringkasan statistik sarana dan prasarana sekolah.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((s) => (
          <div key={s.label} className="card">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly trends bar chart */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
            <TrendingUp className="h-5 w-5 text-brand-600" /> Tren Peminjaman (6 Bulan)
          </h2>
          {monthly.every((m) => m.count === 0) ? (
            <EmptyState title="Belum ada data" description="Belum ada peminjaman dalam 6 bulan terakhir." />
          ) : (
            <div className="flex items-end justify-between gap-3" style={{ height: '200px' }}>
              {monthly.map((m, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{m.count}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-cyan-400 transition-all"
                      style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '8px' : '2px' }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Borrowings by status */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
            <BarChart3 className="h-5 w-5 text-brand-600" /> Peminjaman per Status
          </h2>
          <div className="space-y-4">
            {statusData.map((s) => {
              const total = summary.totalBorrowings || 1;
              const pct = (s.value / total) * 100;
              return (
                <div key={s.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{s.label}</span>
                    <span className={`font-semibold ${s.text}`}>{s.value} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inventory by category */}
        <div className="card lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
            <Package className="h-5 w-5 text-brand-600" /> Inventaris per Kategori
          </h2>
          {byCategory.length === 0 ? (
            <EmptyState title="Belum ada kategori" description="Belum ada kategori inventaris yang terdaftar." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {byCategory.map((c) => {
                const pct = (c.count / maxCategory) * 100;
                return (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                      <span className="font-semibold text-brand-600">{c.count}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-cyan-400" style={{ width: `${pct}%` }} />
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

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import { BarChart3, Loader2, Package, Clock, CheckCircle, Building2 } from 'lucide-react';

interface CategoryCount {
  name: string;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface MonthlyCount {
  month: string;
  label: string;
  count: number;
}

const statusConfig: Record<string, { label: string; color: string; bar: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', bar: 'bg-amber-500' },
  approved: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', bar: 'bg-emerald-500' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', bar: 'bg-blue-500' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', bar: 'bg-red-500' },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', bar: 'bg-emerald-500' },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300', bar: 'bg-slate-500' },
};

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [byCategory, setByCategory] = useState<CategoryCount[]>([]);
  const [byStatus, setByStatus] = useState<StatusCount[]>([]);
  const [monthly, setMonthly] = useState<MonthlyCount[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { count: tb } = await supabase.from('borrowings').select('*', { count: 'exact', head: true });
        const { count: pc } = await supabase.from('borrowings').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: ac } = await supabase.from('borrowings').select('*', { count: 'exact', head: true }).eq('status', 'approved');
        const { count: ic } = await supabase.from('inventory').select('*', { count: 'exact', head: true });

        setTotalBorrowings(tb ?? 0);
        setPendingCount(pc ?? 0);
        setApprovedCount(ac ?? 0);
        setInventoryCount(ic ?? 0);

        const { data: borrowings } = await supabase
          .from('borrowings')
          .select('status, created_at');

        const all = (borrowings as unknown as { status: string; created_at: string }[]) || [];

        const statusMap: Record<string, number> = {};
        for (const b of all) {
          statusMap[b.status] = (statusMap[b.status] || 0) + 1;
        }
        setByStatus(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

        const now = new Date();
        const year = now.getFullYear();
        const monthMap: number[] = new Array(12).fill(0);
        for (const b of all) {
          const d = new Date(b.created_at);
          if (d.getFullYear() === year) {
            monthMap[d.getMonth()] += 1;
          }
        }
        setMonthly(monthMap.map((count, i) => ({ month: String(i + 1), label: monthLabels[i], count })));

        const { data: invData } = await supabase
          .from('inventory')
          .select('category_id, category:categories(name)');

        const inv = (invData as unknown as { category_id: string | null; category: { name: string } | null }[]) || [];
        const catMap: Record<string, number> = {};
        for (const item of inv) {
          const name = item.category?.name ?? 'Tanpa Kategori';
          catMap[name] = (catMap[name] || 0) + 1;
        }
        setByCategory(Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
      } catch (e: any) {
        showToast(e.message || 'Gagal memuat statistik', 'error');
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

  const maxMonthly = Math.max(...monthly.map(m => m.count), 1);
  const maxCategory = Math.max(...byCategory.map(c => c.count), 1);
  const maxStatus = Math.max(...byStatus.map(s => s.count), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Menunggu', value: pendingCount, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: approvedCount, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
    { label: 'Total Inventaris', value: inventoryCount, icon: Building2, color: 'from-violet-500 to-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan dan tren aktivitas SMART SARPRAS</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" /> Tren Peminjaman Bulanan (Tahun Ini)
        </h2>
        <div className="flex items-end justify-between gap-2 h-48">
          {monthly.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center" style={{ height: '160px' }}>
                <div
                  className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:opacity-80 relative group"
                  style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '4px' : '2px' }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.count}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Peminjaman per Status</h2>
          {byStatus.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Tidak ada data</p>
          ) : (
            <div className="space-y-3">
              {byStatus.map(s => {
                const sc = statusConfig[s.status] || { label: s.status, color: 'bg-slate-100 text-slate-600', bar: 'bg-slate-500' };
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.count}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className={cn('h-2 rounded-full transition-all', sc.bar)}
                        style={{ width: `${(s.count / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Inventaris per Kategori</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Tidak ada data</p>
          ) : (
            <div className="space-y-3">
              {byCategory.map(c => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{c.name}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-2">{c.count}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
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

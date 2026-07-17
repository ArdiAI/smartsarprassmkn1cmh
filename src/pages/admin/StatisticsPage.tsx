import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Package, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface MonthlyData { month: string; count: number; }
interface StatusData { status: string; count: number; }
interface PopularItem { name: string; count: number; }

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-500', approved: 'bg-green-500', rejected: 'bg-red-500',
  returned: 'bg-blue-500', completed: 'bg-cyan-500', cancelled: 'bg-slate-500',
};
const statusLabel: Record<string, string> = {
  pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak',
  returned: 'Dikembalikan', completed: 'Selesai', cancelled: 'Dibatalkan',
};

export default function StatisticsPage() {
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const { data: borrowings } = await supabase.from('borrowings')
      .select('id, status, borrow_date, inventory(name), facility(name)').order('created_at', { ascending: false });
    const all = (borrowings as unknown as Array<{ id: string; status: string; borrow_date: string; inventory?: { name: string } | null; facility?: { name: string } | null }>) || [];

    // Monthly counts (last 6 months)
    const now = new Date();
    const months: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('id-ID', { month: 'short' });
      const count = all.filter(b => {
        if (!b.borrow_date) return false;
        const bd = new Date(b.borrow_date);
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
      }).length;
      months.push({ month: label, count });
    }
    setMonthly(months);

    // Status breakdown
    const statusMap: Record<string, number> = {};
    all.forEach(b => { statusMap[b.status] = (statusMap[b.status] || 0) + 1; });
    setStatusData(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

    // Popular items
    const itemMap: Record<string, number> = {};
    all.forEach(b => {
      const name = b.inventory?.name || b.facility?.name || 'Unknown';
      itemMap[name] = (itemMap[name] || 0) + 1;
    });
    setPopular(Object.entries(itemMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5));

    setLoading(false);
  }

  const maxMonthly = Math.max(...monthly.map(m => m.count), 1);
  const maxPopular = Math.max(...popular.map(p => p.count), 1);
  const totalBorrowings = statusData.reduce((s, d) => s + d.count, 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-slate-600 dark:text-slate-400">Analisis peminjaman dan penggunaan sarpras</p>
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman Bulanan</h2>
        </div>
        <div className="flex items-end justify-between gap-3 h-48">
          {monthly.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex-1 flex items-end">
                <div className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg transition-all hover:opacity-80 relative group"
                  style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: '4px' }}>
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</span>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Breakdown Status</h2>
          </div>
          <div className="space-y-3">
            {statusData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada data</p>
            ) : statusData.map(s => (
              <div key={s.status}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{statusLabel[s.status] || s.status}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{s.count} ({totalBorrowings ? Math.round((s.count / totalBorrowings) * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', statusColor[s.status] || 'bg-slate-400')} style={{ width: `${totalBorrowings ? (s.count / totalBorrowings) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular items */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Item Terpopuler</h2>
          </div>
          <div className="space-y-3">
            {popular.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada data</p>
            ) : popular.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(p.count / maxPopular) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.count}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { BarChart3, TrendingUp, Package, Clock, Check, X } from 'lucide-react';

interface Borrowing {
  id: string;
  status: string;
  created_at: string;
  borrowing_items?: { item_name: string; quantity: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};
const STATUS_LABELS: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak', completed: 'Selesai' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('borrowings').select('id, status, created_at, borrowing_items(item_name, quantity)').order('created_at', { ascending: false });
      if (error) console.error(error);
      if (data) setBorrowings(data as Borrowing[]);
      setLoading(false);
    })();
  }, []);

  // Monthly trends (current year)
  const currentYear = new Date().getFullYear();
  const monthlyData = Array(12).fill(0);
  borrowings.forEach(b => {
    const d = new Date(b.created_at);
    if (d.getFullYear() === currentYear) monthlyData[d.getMonth()]++;
  });
  const maxMonthly = Math.max(...monthlyData, 1);

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  borrowings.forEach(b => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });

  // Popular items
  const itemCounts: Record<string, number> = {};
  borrowings.forEach(b => {
    (b.borrowing_items || []).forEach(item => {
      itemCounts[item.item_name] = (itemCounts[item.item_name] || 0) + item.quantity;
    });
  });
  const popularItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxItem = Math.max(...popularItems.map(i => i[1]), 1);

  const statCards = [
    { label: 'Total Peminjaman', value: borrowings.length, icon: Package, color: 'text-blue-500' },
    { label: 'Menunggu', value: statusCounts.pending || 0, icon: Clock, color: 'text-amber-500' },
    { label: 'Disetujui', value: statusCounts.approved || 0, icon: Check, color: 'text-emerald-500' },
    { label: 'Ditolak', value: statusCounts.rejected || 0, icon: X, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-amber-500" /> Statistik Peminjaman</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Ringkasan dan tren data peminjaman</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
            <s.icon className={cn('w-5 h-5 mb-2', s.color)} />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '...' : s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly trends */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> Tren Bulanan {currentYear}</h2>
          {loading ? <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" /> : (
            <div className="flex items-end justify-between gap-1 h-48">
              {monthlyData.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-400">{count || ''}</span>
                  <div className="w-full bg-blue-500 rounded-t-md transition-all" style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }} />
                  <span className="text-xs text-slate-400">{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Breakdown Status</h2>
          {loading ? <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" /> : (
            <div className="space-y-3">
              {Object.entries(STATUS_LABELS).map(([status, label]) => {
                const count = statusCounts[status] || 0;
                const pct = borrowings.length > 0 ? (count / borrowings.length) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status])}>{label}</span>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', STATUS_COLORS[status].split(' ')[0])} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Popular items */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-5">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-cyan-500" /> Item Terpopuler</h2>
        {loading ? <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" /> : popularItems.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
        ) : (
          <div className="space-y-2">
            {popularItems.map(([name, count], i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-6">#{i + 1}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300 w-32 truncate flex-shrink-0">{name}</span>
                <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{ width: `${(count / maxItem) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

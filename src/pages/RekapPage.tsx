import { useEffect, useState } from 'react';
import { BarChart3, ClipboardList, Package, FileText, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedStats from '../components/AnimatedStats';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Borrowing {
  id: string;
  borrower_name: string;
  inventory_id: string;
  borrowed_units: number;
  borrow_date: string;
  status: string;
  inventory: { name: string }[] | null;
}

export default function RekapPage() {
  const [loading, setLoading] = useState(true);
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, returned: 0, rejected: 0 });
  const [topItems, setTopItems] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('borrowings')
        .select('id, borrower_name, inventory_id, borrowed_units, borrow_date, status, inventory(name)')
        .order('created_at', { ascending: false });
      const rows = (data as Borrowing[]) || [];
      setBorrowings(rows);

      setStats({
        total: rows.length,
        pending: rows.filter(r => r.status === 'pending').length,
        approved: rows.filter(r => r.status === 'approved').length,
        returned: rows.filter(r => r.status === 'returned' || r.status === 'completed').length,
        rejected: rows.filter(r => r.status === 'rejected').length,
      });

      const itemMap = new Map<string, number>();
      rows.forEach(r => {
        const name = r.inventory?.[0]?.name || 'Tidak diketahui';
        itemMap.set(name, (itemMap.get(name) || 0) + 1);
      });
      setTopItems(Array.from(itemMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5));

      setLoading(false);
    })();
  }, []);

  const maxCount = Math.max(...topItems.map(t => t.count), 1);
  const statusRows = [
    { label: 'Menunggu Persetujuan', value: stats.pending, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Dikembalikan', value: stats.returned, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Ditolak', value: stats.rejected, icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="relative z-10 pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Rekap & Statistik</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Ringkasan data peminjaman sarana dan prasarana</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />)}
          </div>
        ) : stats.total === 0 ? (
          <EmptyState title="Belum ada data" message="Belum ada peminjaman yang tercatat" />
        ) : (
          <>
            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <AnimatedStats value={stats.total} label="Total Peminjaman" icon={ClipboardList} color="blue" />
              <AnimatedStats value={stats.pending} label="Menunggu" icon={Clock} color="orange" />
              <AnimatedStats value={stats.returned} label="Dikembalikan" icon={CheckCircle2} color="green" />
              <AnimatedStats value={stats.rejected} label="Ditolak" icon={XCircle} color="cyan" />
            </div>

            {/* Status Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rincian Status</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statusRows.map(s => (
                  <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', s.bg)}>
                      <s.icon className={cn('w-5 h-5', s.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Borrowed Items */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Barang Paling Sering Dipinjam</h2>
              </div>
              {topItems.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Belum ada data</p>
              ) : (
                <div className="space-y-3">
                  {topItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-bold text-slate-400">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</span>
                          <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">{item.count}x</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Borrowings */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
              </div>
              <div className="space-y-2">
                {borrowings.slice(0, 8).map(b => (
                  <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{b.inventory?.[0]?.name || 'Barang dihapus'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{b.borrower_name} · {new Date(b.borrow_date).toLocaleDateString('id-ID')}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                      b.status === 'returned' || b.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      b.status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      b.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

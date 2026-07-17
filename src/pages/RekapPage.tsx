import { useEffect, useState, useMemo } from 'react';
import {
  BarChart3, Package, Building2, ClipboardList, Calendar, TrendingUp,
  CheckCircle2, XCircle, Clock, RotateCcw,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Stats {
  totalInventory: number;
  totalFacilities: number;
  totalBorrowings: number;
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
}

interface CategoryCount {
  name: string;
  count: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  returned: 'bg-blue-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  returned: 'Dikembalikan',
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white', color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-medium text-slate-900 dark:text-white">{value}</span>
      </div>
      <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>({ totalInventory: 0, totalFacilities: 0, totalBorrowings: 0, pending: 0, approved: 0, rejected: 0, returned: 0 });
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [inv, fac] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
        ]);

        // Borrowings by status
        let brwQuery = supabase.from('borrowings').select('status, created_at');
        if (startDate) brwQuery = brwQuery.gte('created_at', startDate);
        if (endDate) brwQuery = brwQuery.lte('created_at', endDate + 'T23:59:59');
        const { data: brwData } = await brwQuery;

        const brwList = (brwData ?? []) as unknown as { status: string }[];
        const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, returned: 0 };
        brwList.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; else counts[b.status] = (counts[b.status] ?? 0) + 1; });

        setStats({
          totalInventory: inv.count ?? 0,
          totalFacilities: fac.count ?? 0,
          totalBorrowings: brwList.length,
          pending: counts.pending ?? 0,
          approved: counts.approved ?? 0,
          rejected: counts.rejected ?? 0,
          returned: counts.returned ?? 0,
        });

        // Category counts for inventory
        const { data: catData } = await supabase
          .from('inventory')
          .select('categories(name)');
        const catList = (catData ?? []) as unknown as { categories: { name: string } | null }[];
        const catMap: Record<string, number> = {};
        catList.forEach(item => {
          const name = item.categories?.name ?? 'Lainnya';
          catMap[name] = (catMap[name] ?? 0) + 1;
        });
        setCategoryCounts(Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [startDate, endDate]);

  const maxStatus = useMemo(() => Math.max(stats.pending, stats.approved, stats.rejected, stats.returned, 1), [stats]);
  const maxCategory = useMemo(() => Math.max(...categoryCounts.map(c => c.count), 1), [categoryCounts]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rekap & Statistik</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ringkasan data sarana dan prasarana</p>
          </div>
        </div>

        {/* Date range filter */}
        <div className="mt-6 card p-4 flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="label text-xs flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Tanggal Mulai</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input text-sm" />
          </div>
          <div className="flex-1 w-full">
            <label className="label text-xs flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Tanggal Akhir</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input text-sm" />
          </div>
          <button onClick={() => { setStartDate(''); setEndDate(''); }} className="btn-secondary text-sm whitespace-nowrap">Reset Filter</button>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-5 animate-pulse"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700" /><div className="space-y-2"><div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded" /><div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></div></div></div>)
          ) : (
            <>
              <StatCard icon={Package} label="Total Inventaris" value={stats.totalInventory} color="from-cyan-500 to-cyan-600" />
              <StatCard icon={Building2} label="Total Fasilitas" value={stats.totalFacilities} color="from-blue-500 to-blue-600" />
              <StatCard icon={ClipboardList} label="Total Peminjaman" value={stats.totalBorrowings} color="from-indigo-500 to-indigo-600" />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Borrowings by status */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Peminjaman per Status</h2>
            </div>
            {loading ? (
              <div className="space-y-3">{[0, 1, 2, 3].map(i => <div key={i} className="animate-pulse"><div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded" /></div>)}</div>
            ) : stats.totalBorrowings === 0 ? (
              <EmptyState icon={ClipboardList} title="Belum ada data" description="Tidak ada peminjaman pada rentang tanggal ini." />
            ) : (
              <div className="space-y-4">
                <BarRow label={statusLabels.pending} value={stats.pending} max={maxStatus} color={statusColors.pending} />
                <BarRow label={statusLabels.approved} value={stats.approved} max={maxStatus} color={statusColors.approved} />
                <BarRow label={statusLabels.rejected} value={stats.rejected} max={maxStatus} color={statusColors.rejected} />
                <BarRow label={statusLabels.returned} value={stats.returned} max={maxStatus} color={statusColors.returned} />
              </div>
            )}
          </div>

          {/* Inventory by category */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-cyan-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
            </div>
            {loading ? (
              <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="animate-pulse"><div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded" /></div>)}</div>
            ) : categoryCounts.length === 0 ? (
              <EmptyState icon={Package} title="Belum ada data" description="Tidak ada inventaris tercatat." />
            ) : (
              <div className="space-y-4">
                {categoryCounts.map(cat => (
                  <BarRow key={cat.name} label={cat.name} value={cat.count} max={maxCategory} color="bg-cyan-500" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status summary cards */}
        {!loading && stats.totalBorrowings > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
              <p className="text-xs text-slate-500">Menunggu</p>
            </div>
            <div className="card p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.approved}</p>
              <p className="text-xs text-slate-500">Disetujui</p>
            </div>
            <div className="card p-4 text-center">
              <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.rejected}</p>
              <p className="text-xs text-slate-500">Ditolak</p>
            </div>
            <div className="card p-4 text-center">
              <RotateCcw className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.returned}</p>
              <p className="text-xs text-slate-500">Dikembalikan</p>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

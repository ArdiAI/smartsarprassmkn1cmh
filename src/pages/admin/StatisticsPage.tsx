import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, ClipboardList, AlertTriangle, BarChart3 } from 'lucide-react';
import { cn } from '../../utils/cn';

function ChartBar({ value, max, label, color, count }: { value: number; max: number; label: string; color: string; count: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-sm text-slate-600 dark:text-slate-400 truncate">{label}</div>
      <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden relative">
        <div className={cn('h-full transition-all duration-500 rounded-lg', color)} style={{ width: `${percentage}%` }} />
        <div className="absolute inset-0 flex items-center justify-end pr-2">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{count}</span>
        </div>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('inventory').select('*, categories(*)'),
      supabase.from('borrowings').select('*, inventory(name)'),
      supabase.from('damage_reports').select('*'),
      supabase.from('categories').select('*'),
    ]).then(([inv, bor, rep, cat]) => {
      const categoryStats = (cat.data || []).map((c: any) => ({
        name: c.name,
        count: (inv.data || []).filter((i: any) => i.category_id === c.id).length,
      }));
      const conditionStats = [
        { label: 'Baik', count: (inv.data || []).filter((i: any) => i.condition === 'good').length, color: 'bg-green-500' },
        { label: 'Cukup', count: (inv.data || []).filter((i: any) => i.condition === 'fair').length, color: 'bg-yellow-500' },
        { label: 'Rusak', count: (inv.data || []).filter((i: any) => i.condition === 'poor').length, color: 'bg-red-500' },
      ];
      const borrowingStats = [
        { label: 'Menunggu', count: (bor.data || []).filter((b: any) => b.status === 'pending').length, color: 'bg-yellow-500' },
        { label: 'Disetujui', count: (bor.data || []).filter((b: any) => b.status === 'approved').length, color: 'bg-green-500' },
        { label: 'Dikembalikan', count: (bor.data || []).filter((b: any) => b.status === 'returned').length, color: 'bg-blue-500' },
        { label: 'Ditolak', count: (bor.data || []).filter((b: any) => b.status === 'rejected').length, color: 'bg-red-500' },
      ];
      const damageStats = [
        { label: 'Ringan', count: (rep.data || []).filter((r: any) => r.severity === 'minor').length, color: 'bg-blue-500' },
        { label: 'Sedang', count: (rep.data || []).filter((r: any) => r.severity === 'moderate').length, color: 'bg-yellow-500' },
        { label: 'Berat', count: (rep.data || []).filter((r: any) => r.severity === 'severe').length, color: 'bg-red-500' },
      ];
      const totalItems = (inv.data || []).reduce((sum: number, i: any) => sum + i.quantity, 0);
      const totalValue = (inv.data || []).reduce((sum: number, i: any) => sum + i.price, 0);
      setStats({ categoryStats, conditionStats, borrowingStats, damageStats, totalItems, totalValue, borrowings: bor.data || [] });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="space-y-6">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
      </div>
    </div>;
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik & Analitik</h1></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Package, label: 'Total Item', value: stats?.totalItems || 0 },
          { icon: BarChart3, label: 'Nilai Aset', value: formatCurrency(stats?.totalValue || 0) },
          { icon: ClipboardList, label: 'Peminjaman', value: (stats?.borrowings || []).length },
          { icon: AlertTriangle, label: 'Laporan', value: (stats?.damageStats || []).reduce((sum: number, d: any) => sum + d.count, 0) },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <s.icon className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
              <p className="text-xs text-slate-500">Distribusi barang berdasarkan kategori</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats?.categoryStats?.map((cat: any) => (
              <ChartBar key={cat.name} label={cat.name} value={cat.count} max={Math.max(...(stats?.categoryStats || []).map((c: any) => c.count), 1)} count={cat.count} color="bg-gradient-to-r from-blue-500 to-cyan-400" />
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Kondisi Inventaris</h2>
              <p className="text-xs text-slate-500">Status kondisi seluruh barang</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats?.conditionStats?.map((c: any) => (
              <ChartBar key={c.label} label={c.label} value={c.count} max={Math.max(...(stats?.conditionStats || []).map((x: any) => x.count), 1)} count={c.count} color={c.color} />
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Status Peminjaman</h2>
              <p className="text-xs text-slate-500">Statistik permintaan peminjaman</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats?.borrowingStats?.map((b: any) => (
              <ChartBar key={b.label} label={b.label} value={b.count} max={Math.max(...(stats?.borrowingStats || []).map((x: any) => x.count), 1)} count={b.count} color={b.color} />
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Tingkat Kerusakan</h2>
              <p className="text-xs text-slate-500">Distribusi laporan berdasarkan severity</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats?.damageStats?.map((d: any) => (
              <ChartBar key={d.label} label={d.label} value={d.count} max={Math.max(...(stats?.damageStats || []).map((x: any) => x.count), 1)} count={d.count} color={d.color} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

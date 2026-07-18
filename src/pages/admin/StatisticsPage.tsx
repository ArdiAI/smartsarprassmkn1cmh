import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Package, ClipboardList, AlertTriangle, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface Borrowing {
  id: string;
  status: string;
  created_at: string;
}

interface InventoryWithCategory {
  id: string;
  quantity: number;
  categories: { id: string; name: string } | null;
}

interface DamageReport {
  id: string;
  severity: string;
  status: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-emerald-400',
  returned: 'bg-blue-400',
  rejected: 'bg-red-400',
  completed: 'bg-slate-400',
  cancelled: 'bg-slate-300',
};

const severityColors: Record<string, string> = {
  minor: 'bg-emerald-400',
  moderate: 'bg-amber-400',
  severe: 'bg-red-400',
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [inventory, setInventory] = useState<InventoryWithCategory[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, iRes, dRes] = await Promise.all([
          supabase.from('borrowings').select('id, status, created_at'),
          supabase.from('inventory').select('id, quantity, categories(id, name)'),
          supabase.from('damage_reports').select('id, severity, status'),
        ]);
        setBorrowings((bRes.data as unknown as Borrowing[]) ?? []);
        setInventory((iRes.data as unknown as InventoryWithCategory[]) ?? []);
        setDamageReports((dRes.data as unknown as DamageReport[]) ?? []);
      } catch {
        showToast('Gagal memuat statistik', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = monthNames[d.getMonth()];
      const count = borrowings.filter((b) => {
        const bd = new Date(b.created_at ?? '');
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
      }).length;
      months.push({ label, count });
    }
    return months;
  }, [borrowings]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    borrowings.forEach((b) => {
      const s = b.status ?? 'pending';
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [borrowings]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    inventory.forEach((i) => {
      const catName = i.categories?.name ?? 'Tanpa Kategori';
      counts[catName] = (counts[catName] ?? 0) + (i.quantity ?? 0);
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [inventory]);

  const severityData = useMemo(() => {
    const counts: Record<string, number> = {};
    damageReports.forEach((d) => {
      const s = d.severity ?? 'minor';
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [damageReports]);

  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);
  const maxStatusCount = Math.max(...Object.values(statusData), 1);
  const maxCategoryCount = Math.max(...categoryData.map((c) => c[1]), 1);

  const summaryCards = [
    { label: 'Total Peminjaman', value: borrowings.length, icon: ClipboardList, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Inventaris', value: inventory.length, icon: Package, color: 'from-cyan-500 to-teal-500' },
    { label: 'Laporan Kerusakan', value: damageReports.length, icon: AlertTriangle, color: 'from-amber-500 to-orange-500' },
    { label: 'Pending Approvals', value: statusData['pending'] ?? 0, icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analisis data SMART SARPRAS</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3', card.color)}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend bar chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tren Peminjaman (6 Bulan)</h2>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {monthlyData.map((m, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{m.count}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-all hover:opacity-80"
                  style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? '8px' : '2px' }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-5">
            <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>
          <div className="space-y-3">
            {Object.keys(statusColors).map((status) => {
              const count = statusData[status] ?? 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">{status}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', statusColors[status])}
                      style={{ width: `${(count / maxStatusCount) * 100}%`, minWidth: count > 0 ? '8px' : '0' }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(statusData).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
            )}
          </div>
        </div>

        {/* Inventory by category */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
          </div>
          {categoryData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categoryData.map(([name, count]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{name}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all"
                      style={{ width: `${(count / maxCategoryCount) * 100}%`, minWidth: count > 0 ? '8px' : '0' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Damage by severity */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Laporan Kerusakan per Tingkat</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Object.keys(severityColors).map((sev) => {
              const count = severityData[sev] ?? 0;
              return (
                <div key={sev} className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className={cn('w-3 h-3 rounded-full mx-auto mb-2', severityColors[sev])} />
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{sev}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

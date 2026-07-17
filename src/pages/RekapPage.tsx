import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Boxes,
  Building2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  TrendingUp,
  Package,
  AlertTriangle,
} from 'lucide-react';

interface BorrowingStatusCount {
  status: string;
  count: number;
}

interface InventoryConditionCount {
  condition: string;
  count: number;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const monthAgoStr = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
};

export default function RekapPage() {
  const [totalInventory, setTotalInventory] = useState(0);
  const [totalFacilities, setTotalFacilities] = useState(0);
  const [borrowingStatuses, setBorrowingStatuses] = useState<BorrowingStatusCount[]>([]);
  const [inventoryConditions, setInventoryConditions] = useState<InventoryConditionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(monthAgoStr());
  const [dateTo, setDateTo] = useState(todayStr());

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [invRes, facRes] = await Promise.all([
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('facilities').select('id', { count: 'exact', head: true }),
        ]);

        setTotalInventory(invRes.count ?? 0);
        setTotalFacilities(facRes.count ?? 0);

        // Fetch borrowing statuses within date range
        const borQuery = supabase
          .from('borrowings')
          .select('status, created_at')
          .gte('created_at', `${dateFrom}T00:00:00`)
          .lte('created_at', `${dateTo}T23:59:59`);

        const { data: borData } = await borQuery;
        const borRows = (borData as unknown as { status: string }[]) ?? [];
        const statusCounts: Record<string, number> = {};
        borRows.forEach((r) => {
          statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
        });
        setBorrowingStatuses(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));

        // Fetch inventory condition distribution
        const { data: invCondData } = await supabase
          .from('inventory')
          .select('condition');
        const invCondRows = (invCondData as unknown as { condition: string }[]) ?? [];
        const condCounts: Record<string, number> = {};
        invCondRows.forEach((r) => {
          condCounts[r.condition] = (condCounts[r.condition] ?? 0) + 1;
        });
        setInventoryConditions(Object.entries(condCounts).map(([condition, count]) => ({ condition, count })));
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [dateFrom, dateTo]);

  const totalBorrowings = useMemo(() => borrowingStatuses.reduce((sum, s) => sum + s.count, 0), [borrowingStatuses]);

  const statusConfig: Record<string, { label: string; color: string; classes: string }> = {
    pending: { label: 'Menunggu', color: 'bg-amber-500', classes: 'text-amber-600 dark:text-amber-400' },
    approved: { label: 'Disetujui', color: 'bg-emerald-500', classes: 'text-emerald-600 dark:text-emerald-400' },
    rejected: { label: 'Ditolak', color: 'bg-red-500', classes: 'text-red-600 dark:text-red-400' },
    returned: { label: 'Dikembalikan', color: 'bg-blue-500', classes: 'text-blue-600 dark:text-blue-400' },
  };

  const conditionConfig: Record<string, { label: string; color: string }> = {
    good: { label: 'Baik', color: 'bg-emerald-500' },
    damaged: { label: 'Rusak', color: 'bg-red-500' },
    maintenance: { label: 'Maintenance', color: 'bg-amber-500' },
  };

  const summaryCards = [
    { label: 'Total Inventaris', value: totalInventory, icon: Boxes, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Fasilitas', value: totalFacilities, icon: Building2, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Total Peminjaman', value: totalBorrowings, icon: ClipboardList, color: 'from-emerald-500 to-emerald-600' },
  ];

  const statusIcons: Record<string, any> = {
    pending: Clock,
    approved: CheckCircle2,
    rejected: XCircle,
    returned: Package,
  };

  const maxBorrowingCount = Math.max(...borrowingStatuses.map((s) => s.count), 1);
  const maxConditionCount = Math.max(...inventoryConditions.map((c) => c.count), 1);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            Rekap & Statistik
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Ringkasan statistik sarana, prasarana, dan peminjaman
          </p>
        </div>

        {/* Date range filter */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-5 h-5 text-blue-500" />
              Rentang Tanggal
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Dari</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Sampai</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              {summaryCards.map((s) => (
                <div
                  key={s.label}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                      <s.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Borrowing status chart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-500" />
                  Status Peminjaman
                </h2>
                {borrowingStatuses.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                    Tidak ada data peminjaman pada rentang tanggal ini
                  </p>
                ) : (
                  <div className="space-y-4">
                    {borrowingStatuses.map((s) => {
                      const cfg = statusConfig[s.status] ?? { label: s.status, color: 'bg-slate-500', classes: 'text-slate-600 dark:text-slate-400' };
                      const Icon = statusIcons[s.status] ?? Clock;
                      const pct = (s.count / maxBorrowingCount) * 100;
                      return (
                        <div key={s.status}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${cfg.classes}`} />
                              {cfg.label}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{s.count}</span>
                          </div>
                          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${cfg.color} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inventory condition chart */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-cyan-500" />
                  Kondisi Inventaris
                </h2>
                {inventoryConditions.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                    Tidak ada data inventaris
                  </p>
                ) : (
                  <div className="space-y-4">
                    {inventoryConditions.map((c) => {
                      const cfg = conditionConfig[c.condition] ?? { label: c.condition, color: 'bg-slate-500' };
                      const pct = (c.count / maxConditionCount) * 100;
                      return (
                        <div key={c.condition}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cfg.label}</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{c.count}</span>
                          </div>
                          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700/50 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${cfg.color} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick stats grid */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 lg:col-span-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Ringkasan Cepat</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {borrowingStatuses.map((s) => {
                    const cfg = statusConfig[s.status] ?? { label: s.status, color: 'bg-slate-500', classes: 'text-slate-600 dark:text-slate-400' };
                    const Icon = statusIcons[s.status] ?? Clock;
                    return (
                      <div key={s.status} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <Icon className={`w-6 h-6 mb-2 ${cfg.classes}`} />
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.count}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{cfg.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

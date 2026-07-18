import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Loader2, Package, CheckCircle, Clock, XCircle, BarChart3,
  TrendingUp, Building2, AlertCircle,
} from 'lucide-react';

interface Borrowing {
  id: string;
  status: string;
  borrow_date: string;
  created_at: string;
}

interface Inventory {
  id: string;
  category_id: string | null;
  condition: string;
}

interface Category {
  id: string;
  name: string;
}

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-500' },
  approved: { label: 'Disetujui', color: 'bg-emerald-500' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-500' },
  rejected: { label: 'Ditolak', color: 'bg-red-500' },
  completed: { label: 'Selesai', color: 'bg-cyan-500' },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-400' },
};

const conditionConfig: Record<string, { label: string; color: string }> = {
  good: { label: 'Baik', color: 'bg-emerald-500' },
  fair: { label: 'Cukup', color: 'bg-amber-500' },
  poor: { label: 'Rusak', color: 'bg-red-500' },
};

export default function StatisticsPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [bRes, iRes, cRes] = await Promise.all([
        supabase.from('borrowings').select('id, status, borrow_date, created_at').order('created_at', { ascending: false }),
        supabase.from('inventory').select('id, category_id, condition'),
        supabase.from('categories').select('id, name').order('name'),
      ]);
      if (bRes.data) setBorrowings((bRes.data as unknown as Borrowing[]) || []);
      if (iRes.data) setInventory((iRes.data as unknown as Inventory[]) || []);
      if (cRes.data) setCategories((cRes.data as unknown as Category[]) || []);
      setLoading(false);
    })();
  }, []);

  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [categories]);

  const monthlyData = useMemo(() => {
    const counts = new Array(12).fill(0);
    const currentYear = new Date().getFullYear();
    borrowings.forEach((b) => {
      const dateStr = b.borrow_date || b.created_at;
      const d = new Date(dateStr);
      if (d.getFullYear() === currentYear) {
        counts[d.getMonth()] += 1;
      }
    });
    return counts;
  }, [borrowings]);

  const maxMonthly = Math.max(...monthlyData, 1);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    borrowings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return counts;
  }, [borrowings]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    inventory.forEach((i) => {
      const key = i.category_id || 'uncategorized';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [inventory]);

  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = { good: 0, fair: 0, poor: 0 };
    inventory.forEach((i) => {
      counts[i.condition] = (counts[i.condition] || 0) + 1;
    });
    return counts;
  }, [inventory]);

  const totalBorrowings = borrowings.length;
  const totalInventory = inventory.length;
  const pendingCount = statusCounts['pending'] || 0;
  const approvedCount = (statusCounts['approved'] || 0) + (statusCounts['completed'] || 0);
  const rejectedCount = statusCounts['rejected'] || 0;

  const maxStatusCount = Math.max(...Object.values(statusCounts), 1);
  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  const statCards = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Menunggu', value: pendingCount, icon: Clock, color: 'from-amber-500 to-amber-600' },
    { label: 'Disetujui', value: approvedCount, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Ditolak', value: rejectedCount, icon: XCircle, color: 'from-red-500 to-red-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan data sistem</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trends bar chart */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tren Bulanan Peminjaman</h2>
          </div>
          <div className="flex items-end justify-between gap-1.5 h-48 pt-4">
            {monthlyData.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  {count}
                </div>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:from-blue-600 hover:to-cyan-500 min-h-[4px]"
                  style={{ height: `${(count / maxMonthly) * 100}%` }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{monthLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrowings by status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(statusConfig).map(([key, cfg]) => {
              const count = statusCounts[key] || 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 dark:text-slate-300">{cfg.label}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.color} transition-all`}
                      style={{ width: `${(count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(statusCounts).length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Tidak ada data</p>
            )}
          </div>
        </div>

        {/* Inventory by category */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(categoryCounts).map(([key, count]) => {
              const name = key === 'uncategorized' ? 'Tanpa Kategori' : (categoryMap[key] || 'Tidak diketahui');
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 dark:text-slate-300 truncate">{name}</span>
                    <span className="font-medium text-slate-900 dark:text-white ml-2">{count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(categoryCounts).length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8 col-span-2">Tidak ada data</p>
            )}
          </div>
        </div>

        {/* Inventory condition summary */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Kondisi Inventaris</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(conditionConfig).map(([key, cfg]) => {
              const count = conditionCounts[key] || 0;
              return (
                <div key={key} className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                  <div className={`w-3 h-3 rounded-full ${cfg.color} mx-auto mb-2`} />
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{cfg.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inventory total + facilities count */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Item Inventaris</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalInventory}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kategori Terdaftar</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{categories.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

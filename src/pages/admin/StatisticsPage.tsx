import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import {
  BarChart3, Loader2, Package, Building2, FileText, MessageSquare,
  Megaphone, Users, TrendingUp,
} from 'lucide-react';

interface CategoryCount {
  category_id: string | null;
  category_name: string | null;
  count: number;
}

interface MonthlyCount {
  month: string;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-emerald-400',
  returned: 'bg-blue-400',
  rejected: 'bg-red-400',
  completed: 'bg-emerald-500',
  cancelled: 'bg-slate-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [facilityCount, setFacilityCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [aspirasiCount, setAspirasiCount] = useState(0);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [borrowingCount, setBorrowingCount] = useState(0);
  const [monthlyBorrowings, setMonthlyBorrowings] = useState<MonthlyCount[]>([]);
  const [borrowingsByStatus, setBorrowingsByStatus] = useState<StatusCount[]>([]);
  const [inventoryByCategory, setInventoryByCategory] = useState<CategoryCount[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [
        invRes, facRes, repRes, aspRes, annRes, teamRes, borRes,
      ] = await Promise.all([
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        supabase.from('damage_reports').select('id', { count: 'exact', head: true }),
        supabase.from('aspirasi').select('id', { count: 'exact', head: true }),
        supabase.from('announcements').select('id', { count: 'exact', head: true }),
        supabase.from('team_members').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
      ]);

      setInventoryCount(invRes.count ?? 0);
      setFacilityCount(facRes.count ?? 0);
      setReportCount(repRes.count ?? 0);
      setAspirasiCount(aspRes.count ?? 0);
      setAnnouncementCount(annRes.count ?? 0);
      setTeamCount(teamRes.count ?? 0);
      setBorrowingCount(borRes.count ?? 0);

      const { data: borData } = await supabase
        .from('borrowings')
        .select('borrow_date, status');
      const borrowings = (borData as unknown as Array<{ borrow_date: string; status: string }>) || [];

      const monthlyMap: Record<string, number> = {};
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < 12; i++) {
        monthlyMap[`${currentYear}-${String(i + 1).padStart(2, '0')}`] = 0;
      }
      borrowings.forEach(b => {
        if (!b.borrow_date) return;
        const monthKey = b.borrow_date.slice(0, 7);
        if (monthlyMap[monthKey] !== undefined) {
          monthlyMap[monthKey] += 1;
        }
      });
      setMonthlyBorrowings(
        Object.entries(monthlyMap).map(([month, count]) => ({ month, count })),
      );

      const statusMap: Record<string, number> = {};
      borrowings.forEach(b => {
        const s = b.status || 'pending';
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      setBorrowingsByStatus(
        Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      );

      const { data: invCatData } = await supabase
        .from('inventory')
        .select('category_id, category:categories(name)');
      const invWithCat = (invCatData as unknown as Array<{ category_id: string | null; category: { name: string } | null }>) || [];
      const catMap: Record<string, { id: string; name: string; count: number }> = {};
      invWithCat.forEach(item => {
        const id = item.category_id || 'uncategorized';
        const name = item.category?.name || 'Tanpa Kategori';
        if (!catMap[id]) catMap[id] = { id, name, count: 0 };
        catMap[id].count += 1;
      });
      setInventoryByCategory(
        Object.values(catMap).map(c => ({
          category_id: c.id,
          category_name: c.name,
          count: c.count,
        })),
      );
    } catch (e) {
      showToast('Gagal memuat statistik', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const summaryCards = [
    { label: 'Inventaris', value: inventoryCount, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Fasilitas', value: facilityCount, icon: Building2, color: 'from-cyan-500 to-teal-500' },
    { label: 'Peminjaman', value: borrowingCount, icon: TrendingUp, color: 'from-indigo-500 to-blue-500' },
    { label: 'Laporan', value: reportCount, icon: FileText, color: 'from-amber-500 to-orange-500' },
    { label: 'Aspirasi', value: aspirasiCount, icon: MessageSquare, color: 'from-purple-500 to-pink-500' },
    { label: 'Pengumuman', value: announcementCount, icon: Megaphone, color: 'from-emerald-500 to-green-500' },
    { label: 'Tim', value: teamCount, icon: Users, color: 'from-slate-500 to-slate-600' },
  ];

  const maxMonthly = Math.max(1, ...monthlyBorrowings.map(m => m.count));
  const maxStatusCount = Math.max(1, ...borrowingsByStatus.map(s => s.count));
  const maxCatCount = Math.max(1, ...inventoryByCategory.map(c => c.count));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan data sistem SMART SARPRAS</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Tren Peminjaman Bulanan</h2>
          </div>
          <div className="flex items-end justify-between gap-1 h-48">
            {monthlyBorrowings.map(m => {
              const monthIdx = parseInt(m.month.split('-')[1], 10) - 1;
              const heightPct = (m.count / maxMonthly) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:opacity-80 relative group"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                      title={`${m.count} peminjaman`}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.count}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{monthNames[monthIdx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Peminjaman per Status</h2>
          </div>
          {borrowingsByStatus.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Belum ada data</p>
          ) : (
            <div className="space-y-3">
              {borrowingsByStatus.map(s => {
                const widthPct = (s.count / maxStatusCount) * 100;
                const color = statusColors[s.status] || 'bg-slate-400';
                const label = statusLabels[s.status] || s.status;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-300">{label}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{s.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(widthPct, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Inventaris per Kategori</h2>
        </div>
        {inventoryByCategory.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Belum ada data</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryByCategory.map(c => {
              const widthPct = (c.count / maxCatCount) * 100;
              return (
                <div key={c.category_id || 'uncategorized'}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-300 truncate">{c.category_name || 'Tanpa Kategori'}</span>
                    <span className="font-medium text-slate-900 dark:text-white ml-2">{c.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.max(widthPct, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

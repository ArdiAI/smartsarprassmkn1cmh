import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchTodayCounts } from '../../lib/timeline';
import {
  Package, Clock, CheckCircle, Calendar, CalendarDays, Loader2, ArrowRight, TrendingUp,
} from 'lucide-react';

interface RecentBorrowing {
  id: string;
  borrower_name: string;
  status: string;
  borrow_date: string;
  purpose: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalBorrowings: 0, pending: 0, approved: 0, inventoryCount: 0 });
  const [todayCounts, setTodayCounts] = useState({ agendaToday: 0, borrowToday: 0, weekTotal: 0 });
  const [recent, setRecent] = useState<RecentBorrowing[]>([]);

  useEffect(() => {
    (async () => {
      const [borrowingsRes, pendingRes, approvedRes, invRes, recentRes, todayRes] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id, borrower_name, status, borrow_date, purpose').order('created_at', { ascending: false }).limit(5),
        fetchTodayCounts(),
      ]);

      setStats({
        totalBorrowings: borrowingsRes.count || 0,
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        inventoryCount: invRes.count || 0,
      });
      setTodayCounts(todayRes);
      setRecent((recentRes.data as unknown as RecentBorrowing[]) || []);
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Menunggu Approval', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-green-500' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
  ];

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan aktivitas SMART SARPRAS</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline widgets — Agenda Hari Ini, Peminjaman Hari Ini, Kegiatan Minggu Ini */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Aktivitas Terkini</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/timeline')}
            className="card p-5 text-left hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Agenda Hari Ini</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{todayCounts.agendaToday}</p>
          </button>

          <button
            onClick={() => navigate('/admin/timeline')}
            className="card p-5 text-left hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Peminjaman Hari Ini</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{todayCounts.borrowToday}</p>
          </button>

          <button
            onClick={() => navigate('/admin/timeline')}
            className="card p-5 text-left hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kegiatan Minggu Ini</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{todayCounts.weekTotal}</p>
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Klik widget untuk membuka halaman Timeline</p>
      </div>

      {/* Recent borrowings */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Peminjaman Terbaru</h2>
        <div className="card divide-y divide-slate-100 dark:divide-slate-700/50">
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 p-5 text-center">Belum ada peminjaman</p>
          ) : (
            recent.map(b => {
              const sc = statusConfig[b.status] || statusConfig.pending;
              return (
                <div key={b.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{b.borrower_name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{b.purpose}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-slate-500">{b.borrow_date}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { to: '/admin/borrowings', label: 'Peminjaman', icon: Package },
            { to: '/admin/agendas', label: 'Agenda', icon: Calendar },
            { to: '/admin/timeline', label: 'Timeline', icon: CalendarDays },
            { to: '/admin/inventory', label: 'Inventaris', icon: TrendingUp },
          ].map(a => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

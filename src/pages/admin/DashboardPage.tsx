import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { brandConfig } from '../../brand/config';
import {
  Package, Clock, CheckCircle, TrendingUp, Plus, FileText,
  AlertTriangle, Users, Loader2, ArrowRight,
} from 'lucide-react';

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  status: string;
  created_at: string;
  purpose: string;
}

interface DashboardStats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
  damageCount: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    inventoryCount: 0,
    damageCount: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [borrowingsRes, pendingRes, approvedRes, inventoryRes, damageRes, recentRes] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase.from('damage_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id, borrower_name, borrower_class, status, created_at, purpose').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        totalBorrowings: borrowingsRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        inventoryCount: inventoryRes.count ?? 0,
        damageCount: damageRes.count ?? 0,
      });
      setRecentBorrowings((recentRes.data as unknown as Borrowing[]) || []);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: TrendingUp, color: 'blue' },
    { label: 'Menunggu Persetujuan', value: stats.pending, icon: Clock, color: 'amber' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle, color: 'emerald' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Package, color: 'cyan' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    cyan: 'bg-cyan-500',
  };

  const quickActions = [
    { label: 'Tambah Inventaris', to: '/admin/inventory', icon: Plus },
    { label: 'Kelola Fasilitas', to: '/admin/facilities', icon: Package },
    { label: 'Laporan Kerusakan', to: '/admin/reports', icon: AlertTriangle },
    { label: 'Pengumuman', to: '/admin/announcements', icon: FileText },
    { label: 'Tim & PJ', to: '/admin/team', icon: Users },
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
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Selamat datang di {brandConfig.system.shortName} Admin Panel
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${colorMap[card.color]} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <Icon className="w-5 h-5 text-blue-600 dark:text-blue-300 group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Borrowings */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
          <Link to="/admin/borrowings" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
            Lihat semua <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentBorrowings.length === 0 ? (
          <div className="text-center py-10">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 dark:text-slate-400">Belum ada peminjaman</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentBorrowings.map(b => {
              const sc = statusConfig[b.status] || statusConfig.pending;
              return (
                <div key={b.id} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">{b.borrower_name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {b.borrower_class} · {new Date(b.created_at).toLocaleDateString('id-ID')}
                    </p>
                    {b.purpose && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">{b.purpose}</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${sc.color}`}>{sc.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

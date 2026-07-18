import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { brandConfig } from '../../brand/config';
import {
  Package, Clock, CheckCircle, Boxes, ArrowRight, TrendingUp,
  AlertTriangle, Megaphone, FileText, Users,
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
  pendingBorrowings: number;
  approvedBorrowings: number;
  inventoryCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBorrowings: 0,
    pendingBorrowings: 0,
    approvedBorrowings: 0,
    inventoryCount: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [borrowingsRes, pendingRes, approvedRes, inventoryRes, recentRes] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id, borrower_name, borrower_class, status, created_at, purpose').order('created_at', { ascending: false }).limit(5),
        ]);

        setStats({
          totalBorrowings: borrowingsRes.count ?? 0,
          pendingBorrowings: pendingRes.count ?? 0,
          approvedBorrowings: approvedRes.count ?? 0,
          inventoryCount: inventoryRes.count ?? 0,
        });
        setRecentBorrowings((recentRes.data as unknown as Borrowing[]) ?? []);
      } catch (e) {
        console.error(e);
        showToast('Gagal memuat statistik dashboard', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    approved: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    returned: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    cancelled: { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300' },
  };

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Menunggu Persetujuan', value: stats.pendingBorrowings, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: stats.approvedBorrowings, icon: CheckCircle, color: 'from-emerald-500 to-green-500' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Boxes, color: 'from-purple-500 to-pink-500' },
  ];

  const quickActions = [
    { label: 'Kelola Peminjaman', to: '/admin/borrowings', icon: Package },
    { label: 'Kelola Inventaris', to: '/admin/inventory', icon: Boxes },
    { label: 'Kelola Fasilitas', to: '/admin/facilities', icon: FileText },
    { label: 'Lihat Statistik', to: '/admin/statistics', icon: TrendingUp },
    { label: 'Pengumuman', to: '/admin/announcements', icon: Megaphone },
    { label: 'Tim', to: '/admin/team', icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Selamat datang di panel admin {brandConfig.system.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Borrowings */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
            <Link to="/admin/borrowings" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
              Lihat semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentBorrowings.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Belum ada peminjaman</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBorrowings.map((b) => {
                const sc = statusConfig[b.status] || statusConfig.pending;
                return (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{b.borrower_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {b.borrower_class} · {new Date(b.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                >
                  <Icon className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alert for pending */}
      {stats.pendingBorrowings > 0 && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {stats.pendingBorrowings} peminjaman menunggu persetujuan
              </p>
              <Link to="/admin/borrowings" className="text-xs text-amber-600 hover:underline">
                Tinjau sekarang →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  ClipboardList, Clock, CheckCircle, Package, TrendingUp,
  ArrowRight, Users, AlertTriangle, Building2,
} from 'lucide-react';

interface Borrowing {
  id: string;
  borrower_name: string;
  item_type: string;
  status: string;
  created_at: string;
}

interface Stats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
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
  const [stats, setStats] = useState<Stats>({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    inventoryCount: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          { count: totalBorrowings },
          { count: pending },
          { count: approved },
          { count: inventoryCount },
          { data: recentData },
        ] = await Promise.all([
          supabase.from('borrowings').select('*', { count: 'exact', head: true }),
          supabase.from('borrowings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
          supabase
            .from('borrowings')
            .select('id, borrower_name, item_type, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        setStats({
          totalBorrowings: totalBorrowings ?? 0,
          pending: pending ?? 0,
          approved: approved ?? 0,
          inventoryCount: inventoryCount ?? 0,
        });
        setRecentBorrowings((recentData as unknown as Borrowing[]) || []);
      } catch {
        showToast('Gagal memuat data dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'from-blue-500 to-cyan-500' },
    { label: 'Menunggu', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Package, color: 'from-purple-500 to-pink-500' },
  ];

  const quickActions = [
    { label: 'Kelola Inventaris', icon: Package, path: '/admin/inventory', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Kelola Fasilitas', icon: Building2, color: 'bg-cyan-500 hover:bg-cyan-600', path: '/admin/facilities' },
    { label: 'Laporan Kerusakan', icon: AlertTriangle, path: '/admin/reports', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'Kelola Tim', icon: Users, path: '/admin/team', color: 'bg-purple-500 hover:bg-purple-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan sistem manajemen sarana dan prasarana
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center', card.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent borrowings */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h3>
            </div>
            <button
              onClick={() => navigate('/admin/borrowings')}
              className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              Lihat semua <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {recentBorrowings.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              Belum ada peminjaman
            </p>
          ) : (
            <div className="space-y-3">
              {recentBorrowings.map(b => {
                const status = statusConfig[b.status] ?? statusConfig.pending;
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {b.borrower_name ?? 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {b.item_type ?? 'N/A'} • {new Date(b.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0', status.color)}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Aksi Cepat</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl text-white transition-colors',
                    action.color
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, Building2, TrendingUp, ArrowRight,
  AlertCircle, Plus, FileText, Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface Stats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
}

interface RecentBorrowing {
  id: string;
  borrower_name: string;
  status: string;
  created_at: string;
  borrowing_items?: { id: string; item_name: string }[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalBorrowings: 0, pending: 0, approved: 0, inventoryCount: 0 });
  const [recent, setRecent] = useState<RecentBorrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [borrowingsRes, pendingRes, approvedRes, inventoryRes] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalBorrowings: borrowingsRes.count || 0,
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        inventoryCount: inventoryRes.count || 0,
      });

      const { data: recentData } = await supabase
        .from('borrowings')
        .select('id, borrower_name, status, created_at, borrowing_items(id, item_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecent((recentData as unknown as RecentBorrowing[]) || []);
    } catch (err) {
      showToast('Gagal memuat dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Menunggu Approval', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-green-500' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Building2, color: 'from-cyan-500 to-teal-500' },
  ];

  const quickActions = [
    { label: 'Kelola Peminjaman', icon: Package, path: '/admin/borrowings', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Kelola Inventaris', icon: Building2, path: '/admin/inventory', color: 'bg-cyan-500 hover:bg-cyan-600' },
    { label: 'Lihat Laporan', icon: FileText, path: '/admin/reports', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'Kelola Tim', icon: Users, path: '/admin/team', color: 'bg-emerald-500 hover:bg-emerald-600' },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      returned: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return map[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  };

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ringkasan aktivitas sistem</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center', card.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-2xl text-white font-medium transition-colors text-left',
                  action.color
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{action.label}</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent borrowings */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
          <button
            onClick={() => navigate('/admin/borrowings')}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
          >
            Lihat semua <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-10">
            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada peminjaman</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {b.borrower_name || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {(b.borrowing_items || []).map((i) => i.item_name).join(', ') || '—'}
                  </p>
                </div>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', statusBadge(b.status))}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

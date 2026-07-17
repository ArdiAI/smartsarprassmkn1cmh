import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PackageOpen,
  Clock,
  CheckCircle2,
  Boxes,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  status: string;
  borrow_date: string;
  current_status_label: string | null;
}

interface Stats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700/30 dark:text-slate-400',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    inventoryCount: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [borrowingsRes, pendingRes, approvedRes, inventoryRes] = await Promise.all([
          supabase.from('borrowings').select('*', { count: 'exact', head: true }),
          supabase.from('borrowings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
        ]);

        setStats({
          totalBorrowings: borrowingsRes.count ?? 0,
          pending: pendingRes.count ?? 0,
          approved: approvedRes.count ?? 0,
          inventoryCount: inventoryRes.count ?? 0,
        });

        const { data: recent } = await supabase
          .from('borrowings')
          .select('id, borrower_name, borrower_class, status, borrow_date, current_status_label')
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentBorrowings((recent as unknown as Borrowing[]) || []);
      } catch {
        showToast('Gagal memuat data dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    {
      label: 'Total Peminjaman',
      value: stats.totalBorrowings,
      icon: PackageOpen,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Menunggu Persetujuan',
      value: stats.pending,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Disetujui',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Total Inventaris',
      value: stats.inventoryCount,
      icon: Boxes,
      color: 'from-violet-500 to-purple-500',
    },
  ];

  const quickActions = [
    { label: 'Kelola Peminjaman', to: '/admin/borrowings', icon: PackageOpen },
    { label: 'Kelola Inventaris', to: '/admin/inventory', icon: Boxes },
    { label: 'Lihat Laporan', to: '/admin/reports', icon: AlertTriangle },
    { label: 'Statistik', to: '/admin/statistics', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan aktivitas sistem SMART SARPRAS
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                    {loading ? '—' : card.value}
                  </p>
                </div>
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center',
                    card.color
                  )}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent borrowings */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
            <h2 className="font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
            <Link
              to="/admin/borrowings"
              className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Memuat...</div>
            ) : recentBorrowings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Belum ada peminjaman</div>
            ) : (
              recentBorrowings.map(b => (
                <div key={b.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                      {b.borrower_name ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {b.borrower_class ?? '—'} • {b.borrow_date ?? '—'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0',
                      statusColors[b.status] ?? statusColors.pending
                    )}
                  >
                    {b.current_status_label ?? b.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Aksi Cepat</h2>
          <div className="space-y-2">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                    <Icon className="w-5 h-5 text-blue-500 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">
                    {action.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

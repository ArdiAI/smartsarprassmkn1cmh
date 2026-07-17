import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  Package,
  TrendingUp,
  ArrowRight,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface DashboardStats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrow_date: string;
  status: string;
  item_type: string | null;
  purpose: string | null;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  completed: 'Selesai',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    inventoryCount: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [borrowingsRes, pendingRes, approvedRes, inventoryRes, recentRes] =
        await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase
            .from('borrowings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('borrowings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'approved'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase
            .from('borrowings')
            .select('id, borrower_name, borrow_date, status, item_type, purpose')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

      setStats({
        totalBorrowings: borrowingsRes.count || 0,
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        inventoryCount: inventoryRes.count || 0,
      });
      setRecentBorrowings((recentRes.data || []) as unknown as Borrowing[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const statCards = [
    {
      label: 'Total Peminjaman',
      value: stats.totalBorrowings,
      icon: ClipboardList,
      color: 'from-blue-500 to-cyan-500',
      to: '/admin/borrowings',
    },
    {
      label: 'Menunggu Persetujuan',
      value: stats.pending,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      to: '/admin/borrowings',
    },
    {
      label: 'Disetujui',
      value: stats.approved,
      icon: CheckCircle,
      color: 'from-emerald-500 to-teal-500',
      to: '/admin/borrowings',
    },
    {
      label: 'Total Inventaris',
      value: stats.inventoryCount,
      icon: Package,
      color: 'from-purple-500 to-indigo-500',
      to: '/admin/inventory',
    },
  ];

  const quickActions = [
    { label: 'Kelola Peminjaman', to: '/admin/borrowings', icon: ClipboardList },
    { label: 'Kelola Inventaris', to: '/admin/inventory', icon: Package },
    { label: 'Kelola Fasilitas', to: '/admin/facilities', icon: Building2 },
    { label: 'Lihat Laporan', to: '/admin/reports', icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan aktivitas dan statistik sistem
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {card.label}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                    {loading ? '...' : card.value}
                  </p>
                </div>
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white',
                    card.color
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent borrowings */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Peminjaman Terbaru
            </h2>
            <Link
              to="/admin/borrowings"
              className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentBorrowings.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Belum ada peminjaman</p>
              </div>
            ) : (
              recentBorrowings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {b.borrower_name}
                    </p>
                    <p className="text-sm text-slate-400 truncate">
                      {b.item_type || '—'} · {b.purpose || 'Tanpa keterangan'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-slate-400 hidden sm:block">
                      {new Date(b.borrow_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium',
                        statusStyles[b.status] || statusStyles.pending
                      )}
                    >
                      {statusLabel[b.status] || b.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
            Aksi Cepat
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-blue-500 group-hover:text-blue-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {action.label}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-blue-500" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

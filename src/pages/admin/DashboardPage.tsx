import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PackageOpen,
  Clock,
  CheckCircle2,
  Boxes,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface Stats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  item_type: string;
  status: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    inventoryCount: 0,
  });
  const [recent, setRecent] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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
      setRecent((recentData as unknown as Borrowing[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const cards = [
    {
      label: 'Total Peminjaman',
      value: stats.totalBorrowings,
      icon: PackageOpen,
      color: 'from-blue-500 to-cyan-400',
      to: '/admin/borrowings',
    },
    {
      label: 'Menunggu Persetujuan',
      value: stats.pending,
      icon: Clock,
      color: 'from-amber-500 to-orange-400',
      to: '/admin/borrowings',
    },
    {
      label: 'Disetujui',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-green-400',
      to: '/admin/borrowings',
    },
    {
      label: 'Total Inventaris',
      value: stats.inventoryCount,
      icon: Boxes,
      color: 'from-violet-500 to-purple-400',
      to: '/admin/inventory',
    },
  ];

  const quickActions = [
    { label: 'Kelola Inventaris', to: '/admin/inventory', icon: Boxes },
    { label: 'Kelola Fasilitas', to: '/admin/facilities', icon: PackageOpen },
    { label: 'Tinjau Laporan', to: '/admin/reports', icon: AlertTriangle },
    { label: 'Lihat Statistik', to: '/admin/statistics', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan aktivitas dan statistik sistem
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', card.color)}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">
              {loading ? '...' : card.value}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Aksi Cepat</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <action.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent borrowings */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Peminjaman Terbaru</h3>
          <Link
            to="/admin/borrowings"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Lihat semua <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {recent.length === 0 ? (
            <p className="p-5 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada peminjaman</p>
          ) : (
            recent.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <PackageOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{b.borrower_name ?? 'N/A'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {b.item_type ?? 'Item'} • {new Date(b.created_at ?? '').toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                <span className={cn('px-3 py-1 rounded-full text-xs font-medium', statusStyles[b.status] ?? statusStyles.pending)}>
                  {statusLabels[b.status] ?? b.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

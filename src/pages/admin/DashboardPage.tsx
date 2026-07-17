import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Package,
  TrendingUp,
  ArrowRight,
  FileWarning,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface BorrowingRow {
  id: string;
  borrower_name: string;
  item_type: string;
  status: string;
  created_at: string;
  current_status_label: string | null;
}

interface Stats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    inventoryCount: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<BorrowingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [borrowingsRes, pendingRes, approvedRes, inventoryRes, recentRes] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase
          .from('borrowings')
          .select('id, borrower_name, item_type, status, created_at, current_status_label')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalBorrowings: borrowingsRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        inventoryCount: inventoryRes.count ?? 0,
      });
      setRecentBorrowings((recentRes.data as unknown as BorrowingRow[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'from-blue-500 to-blue-600' },
    { label: 'Menunggu Persetujuan', value: stats.pending, icon: Clock, color: 'from-amber-500 to-amber-600' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Package, color: 'from-cyan-500 to-cyan-600' },
  ];

  const quickActions = [
    { to: '/admin/borrowings', label: 'Kelola Peminjaman', icon: ClipboardList, color: 'bg-blue-500 hover:bg-blue-600' },
    { to: '/admin/inventory', label: 'Kelola Inventaris', icon: Package, color: 'bg-cyan-500 hover:bg-cyan-600' },
    { to: '/admin/reports', label: 'Laporan Kerusakan', icon: FileWarning, color: 'bg-amber-500 hover:bg-amber-600' },
    { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone, color: 'bg-purple-500 hover:bg-purple-600' },
    { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare, color: 'bg-rose-500 hover:bg-rose-600' },
    { to: '/admin/statistics', label: 'Statistik', icon: TrendingUp, color: 'bg-emerald-500 hover:bg-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Selamat datang di panel admin SMART SARPRAS
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white',
                    card.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {loading ? '...' : card.value}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent borrowings */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Peminjaman Terbaru
            </h2>
            <Link
              to="/admin/borrowings"
              className="text-sm text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentBorrowings.length === 0 && !loading && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                Belum ada peminjaman
              </p>
            )}
            {recentBorrowings.map(b => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                    {b.borrower_name ?? 'N/A'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {b.item_type ?? 'item'} • {new Date(b.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium capitalize',
                    statusColors[b.status] ?? statusColors.pending
                  )}
                >
                  {b.current_status_label ?? b.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Aksi Cepat
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl text-white text-center transition-colors',
                    action.color
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, Boxes, ArrowRight, TrendingUp,
  AlertTriangle, Megaphone, MessageSquare, Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { brandConfig } from '../../brand/config';
import { showToast } from '../../components/Toast';

interface Stats {
  totalBorrowings: number;
  pendingBorrowings: number;
  approvedBorrowings: number;
  inventoryCount: number;
}

interface RecentBorrowing {
  id: string;
  borrower_name: string;
  borrower_class: string | null;
  status: string;
  created_at: string;
  item_type: string | null;
  inventory_id: string | null;
  facility_id: string | null;
  inventory?: { name: string } | null;
  facility?: { name: string } | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalBorrowings: 0,
    pendingBorrowings: 0,
    approvedBorrowings: 0,
    inventoryCount: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<RecentBorrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const [borrowingsRes, pendingRes, approvedRes, inventoryRes, recentRes] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase
          .from('borrowings')
          .select(`
            id, borrower_name, borrower_class, status, created_at, item_type, inventory_id, facility_id,
            inventory:inventory_id(name),
            facility:facility_id(name)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalBorrowings: borrowingsRes.count ?? 0,
        pendingBorrowings: pendingRes.count ?? 0,
        approvedBorrowings: approvedRes.count ?? 0,
        inventoryCount: inventoryRes.count ?? 0,
      });

      setRecentBorrowings((recentRes.data as unknown as RecentBorrowing[]) ?? []);
    } catch (err) {
      console.error('Dashboard error:', err);
      showToast('Gagal memuat data dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Menunggu Persetujuan', value: stats.pendingBorrowings, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: stats.approvedBorrowings, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Boxes, color: 'from-indigo-500 to-purple-500' },
  ];

  const quickActions = [
    { label: 'Kelola Inventaris', to: '/admin/inventory', icon: Package, color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Kelola Fasilitas', to: '/admin/facilities', icon: Boxes, color: 'bg-cyan-500 hover:bg-cyan-600' },
    { label: 'Laporan Kerusakan', to: '/admin/reports', icon: AlertTriangle, color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'Pengumuman', to: '/admin/announcements', icon: Megaphone, color: 'bg-purple-500 hover:bg-purple-600' },
    { label: 'Aspirasi', to: '/admin/aspirasi', icon: MessageSquare, color: 'bg-pink-500 hover:bg-pink-600' },
    { label: 'Tim', to: '/admin/team', icon: Users, color: 'bg-indigo-500 hover:bg-indigo-600' },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    returned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    completed: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  };

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getItemName(b: RecentBorrowing): string {
    if (b.inventory && b.inventory.name) return b.inventory.name;
    if (b.facility && b.facility.name) return b.facility.name;
    return b.item_type ?? 'Item';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Selamat datang di {brandConfig.system.name} Admin Panel
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', card.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {loading ? (
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {loading ? '...' : card.value}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl text-white transition-colors',
                  action.color
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium text-center">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Borrowings */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
          <Link
            to="/admin/borrowings"
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Lihat semua <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentBorrowings.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada peminjaman</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentBorrowings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {b.borrower_name}
                      {b.borrower_class ? ` (${b.borrower_class})` : ''}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {getItemName(b)} • {formatDate(b.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0',
                    statusColors[b.status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  )}
                >
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

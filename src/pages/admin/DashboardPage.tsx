import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Package, Building2, Clock, CheckCircle2,
  TrendingUp, ArrowRight, AlertCircle, FileText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface BorrowingRow {
  id: string;
  borrower_name: string;
  borrower_class: string | null;
  status: string;
  created_at: string;
  item_type: string | null;
  purpose: string | null;
}

interface DashboardStats {
  totalBorrowings: number;
  pendingBorrowings: number;
  approvedBorrowings: number;
  inventoryCount: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalBorrowings: 0,
    pendingBorrowings: 0,
    approvedBorrowings: 0,
    inventoryCount: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<BorrowingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const [borrowingsRes, pendingRes, approvedRes, inventoryRes, recentRes] = await Promise.all([
        supabase.from('borrowings').select('id', { count: 'exact', head: true }),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase
          .from('borrowings')
          .select('id, borrower_name, borrower_class, status, created_at, item_type, purpose')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalBorrowings: borrowingsRes.count ?? 0,
        pendingBorrowings: pendingRes.count ?? 0,
        approvedBorrowings: approvedRes.count ?? 0,
        inventoryCount: inventoryRes.count ?? 0,
      });

      if (recentRes.data) {
        setRecentBorrowings(recentRes.data as unknown as BorrowingRow[]);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      showToast('Gagal memuat data dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    returned: 'Dikembalikan',
    rejected: 'Ditolak',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  };

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Menunggu Persetujuan', value: stats.pendingBorrowings, icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Disetujui', value: stats.approvedBorrowings, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Package, color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  ];

  const quickActions = [
    { label: 'Kelola Peminjaman', icon: ClipboardList, to: '/admin/borrowings', color: 'from-blue-500 to-cyan-500' },
    { label: 'Kelola Inventaris', icon: Package, to: '/admin/inventory', color: 'from-cyan-500 to-teal-500' },
    { label: 'Kelola Fasilitas', icon: Building2, to: '/admin/facilities', color: 'from-indigo-500 to-blue-500' },
    { label: 'Lihat Laporan', icon: FileText, to: '/admin/reports', color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan aktivitas dan statistik sistem
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                    {loading ? '...' : card.value}
                  </p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', card.bg)}>
                  <Icon className={cn('w-6 h-6 text-transparent bg-gradient-to-br bg-clip-text', card.color)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Aksi Cepat</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-left hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', action.color)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{action.label}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Buka</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Borrowings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h3>
          </div>
          <button
            onClick={() => navigate('/admin/borrowings')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Lihat Semua <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">Memuat...</div>
          ) : recentBorrowings.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada peminjaman</p>
            </div>
          ) : (
            recentBorrowings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {b.borrower_name ?? 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {b.borrower_class ?? '-'} {b.item_type ? `• ${b.item_type}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', statusColors[b.status] ?? statusColors.pending)}>
                    {statusLabels[b.status] ?? b.status}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                    {new Date(b.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

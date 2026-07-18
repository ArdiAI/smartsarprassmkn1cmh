import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Package, Clock, CheckCircle, Building2, Loader2, ArrowRight,
  Users, FileText, Megaphone, MessageSquare, BarChart3,
} from 'lucide-react';

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  status: string;
  created_at: string;
  purpose: string;
}

interface Stats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalBorrowings: 0, pending: 0, approved: 0, inventoryCount: 0 });
  const [recentBorrowings, setRecentBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { count: totalBorrowings } = await supabase
          .from('borrowings')
          .select('*', { count: 'exact', head: true });

        const { count: pending } = await supabase
          .from('borrowings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const { count: approved } = await supabase
          .from('borrowings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved');

        const { count: inventoryCount } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true });

        const { data: recent } = await supabase
          .from('borrowings')
          .select('id, borrower_name, borrower_class, status, created_at, purpose')
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          totalBorrowings: totalBorrowings ?? 0,
          pending: pending ?? 0,
          approved: approved ?? 0,
          inventoryCount: inventoryCount ?? 0,
        });
        setRecentBorrowings((recent as unknown as Borrowing[]) || []);
      } catch (e) {
        console.error('Dashboard load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

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
    { label: 'Menunggu Persetujuan', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Building2, color: 'from-violet-500 to-purple-500' },
  ];

  const quickActions = [
    { to: '/admin/borrowings', label: 'Peminjaman', icon: Package },
    { to: '/admin/inventory', label: 'Inventaris', icon: Building2 },
    { to: '/admin/reports', label: 'Laporan', icon: FileText },
    { to: '/admin/team', label: 'Tim', icon: Users },
    { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone },
    { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare },
    { to: '/admin/statistics', label: 'Statistik', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ringkasan aktivitas SMART SARPRAS</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
            <Link to="/admin/borrowings" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
              Lihat semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentBorrowings.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada peminjaman</p>
          ) : (
            <div className="space-y-3">
              {recentBorrowings.map(b => {
                const sc = statusConfig[b.status] || statusConfig.pending;
                return (
                  <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{b.borrower_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {b.borrower_class} · {new Date(b.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${sc.color}`}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Icon className="w-6 h-6 text-blue-500" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

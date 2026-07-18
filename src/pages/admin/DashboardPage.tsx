import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Clock, CheckCircle, Package, ArrowRight,
  TrendingUp, AlertTriangle, Plus,
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
  created_at: string;
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
    const fetchData = async () => {
      try {
        const [borrowingsRes, pendingRes, approvedRes, inventoryRes, recentRes] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id, borrower_name, borrower_class, status, borrow_date, created_at').order('created_at', { ascending: false }).limit(5),
        ]);

        setStats({
          totalBorrowings: borrowingsRes.count ?? 0,
          pending: pendingRes.count ?? 0,
          approved: approvedRes.count ?? 0,
          inventoryCount: inventoryRes.count ?? 0,
        });
        setRecentBorrowings((recentRes.data as unknown as Borrowing[]) ?? []);
      } catch {
        showToast('Gagal memuat data dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: ClipboardList, color: 'from-blue-500 to-blue-600' },
    { label: 'Menunggu Persetujuan', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-green-500' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Package, color: 'from-cyan-500 to-teal-500' },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    returned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    completed: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  };

  const quickActions = [
    { label: 'Kelola Inventaris', to: '/admin/inventory', icon: Package },
    { label: 'Lihat Peminjaman', to: '/admin/borrowings', icon: ClipboardList },
    { label: 'Buat Pengumuman', to: '/admin/announcements', icon: Plus },
    { label: 'Lihat Laporan', to: '/admin/reports', icon: AlertTriangle },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ringkasan aktivitas SMART SARPRAS</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center', card.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent borrowings */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
            <Link to="/admin/borrowings" className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Lihat semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentBorrowings.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Belum ada peminjaman</p>
            ) : (
              recentBorrowings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{b.borrower_name ?? ''}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{b.borrower_class ?? ''}</p>
                    </div>
                  </div>
                  <span className={cn('px-3 py-1 rounded-full text-xs font-medium', statusColors[b.status] ?? statusColors.pending)}>
                    {b.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Aksi Cepat</h2>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{action.label}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

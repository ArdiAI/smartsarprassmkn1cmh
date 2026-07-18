import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { brandConfig } from '../../brand/config';
import {
  Package, Clock, CheckCircle, AlertCircle, Loader2, ArrowRight,
  Calendar, User, LayoutDashboard, FileText, Megaphone, Users, Wrench,
} from 'lucide-react';

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  borrow_date: string;
  return_date: string;
  status: string;
  purpose: string;
  created_at: string;
}

interface Stats {
  totalBorrowings: number;
  pendingBorrowings: number;
  approvedBorrowings: number;
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
  const [stats, setStats] = useState<Stats>({
    totalBorrowings: 0,
    pendingBorrowings: 0,
    approvedBorrowings: 0,
    inventoryCount: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [borrowingsRes, pendingRes, approvedRes, inventoryRes, recentRes] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings')
            .select('id, borrower_name, borrower_class, borrow_date, return_date, status, purpose, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        setStats({
          totalBorrowings: borrowingsRes.count ?? 0,
          pendingBorrowings: pendingRes.count ?? 0,
          approvedBorrowings: approvedRes.count ?? 0,
          inventoryCount: inventoryRes.count ?? 0,
        });
        setRecentBorrowings((recentRes.data as unknown as Borrowing[]) || []);
      } catch (e) {
        console.error(e);
        showToast('Gagal memuat data dashboard', 'error');
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

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: Package, color: 'from-blue-500 to-blue-600', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Menunggu Persetujuan', value: stats.pendingBorrowings, icon: Clock, color: 'from-amber-500 to-amber-600', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Disetujui', value: stats.approvedBorrowings, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: AlertCircle, color: 'from-cyan-500 to-cyan-600', iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  ];

  const quickActions = [
    { label: 'Peminjaman', desc: 'Kelola pengajuan', icon: FileText, to: '/admin/borrowings', color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Inventaris', desc: 'Kelola barang', icon: Package, to: '/admin/inventory', color: 'bg-cyan-500 hover:bg-cyan-600' },
    { label: 'Fasilitas', desc: 'Kelola ruangan', icon: LayoutDashboard, to: '/admin/facilities', color: 'bg-indigo-500 hover:bg-indigo-600' },
    { label: 'Laporan Kerusakan', desc: 'Tinjau laporan', icon: Wrench, to: '/admin/reports', color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'Pengumuman', desc: 'Buat pengumuman', icon: Megaphone, to: '/admin/announcements', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'Tim', desc: 'Kelola anggota', icon: Users, to: '/admin/team', color: 'bg-purple-500 hover:bg-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Selamat datang di {brandConfig.system.name} — ringkasan aktivitas sarana dan prasarana
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Borrowings */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
            <Link to="/admin/borrowings" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
              Lihat semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentBorrowings.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada peminjaman</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBorrowings.map(b => {
                const sc = statusConfig[b.status] || statusConfig.pending;
                return (
                  <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{b.borrower_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {b.borrow_date} → {b.return_date}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${sc.color}`}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${action.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{action.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{action.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

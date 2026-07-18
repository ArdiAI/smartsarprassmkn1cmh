import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { brandConfig } from '../../brand/config';
import {
  Package, Clock, CheckCircle, Boxes, ArrowRight, Calendar, User, Mail, Loader2,
} from 'lucide-react';

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  borrower_email: string;
  borrow_date: string;
  return_date: string;
  status: string;
  purpose: string;
  created_at: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
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
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, inventoryCount: 0 });
  const [recentBorrowings, setRecentBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: borrowings, error: bErr }, { count, error: iErr }] = await Promise.all([
          supabase.from('borrowings').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('inventory').select('*', { count: 'exact', head: true }),
        ]);
        if (bErr) throw bErr;
        if (iErr) throw iErr;

        const all = (borrowings as unknown as Borrowing[]) || [];
        setRecentBorrowings(all);
        setStats({
          total: all.length,
          pending: all.filter(b => b.status === 'pending').length,
          approved: all.filter(b => b.status === 'approved' || b.status === 'completed').length,
          inventoryCount: count ?? 0,
        });
      } catch (e) {
        console.error(e);
        showToast('Gagal memuat data dashboard', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.total, icon: Package, color: 'from-blue-500 to-cyan-500' },
    { label: 'Menunggu Persetujuan', value: stats.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
    { label: 'Total Inventaris', value: stats.inventoryCount, icon: Boxes, color: 'from-purple-500 to-indigo-500' },
  ];

  const quickActions = [
    { label: 'Kelola Inventaris', desc: 'Tambah dan atur barang', icon: Package, path: '/admin/inventory' },
    { label: 'Peminjaman', desc: 'Setujui pengajuan', icon: CheckCircle, path: '/admin/borrowings' },
    { label: 'Fasilitas', desc: 'Kelola ruangan', icon: Boxes, path: '/admin/facilities' },
    { label: 'Laporan Kerusakan', desc: 'Tindak lanjut laporan', icon: Clock, path: '/admin/reports' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Selamat datang di {brandConfig.system.fullName}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="card p-5 text-left hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-500" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mt-3">{action.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{action.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Borrowings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
          <button
            onClick={() => navigate('/admin/borrowings')}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
          >
            Lihat Semua <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="card divide-y divide-slate-200/50 dark:divide-slate-700/50">
          {recentBorrowings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400">Belum ada peminjaman</p>
            </div>
          ) : (
            recentBorrowings.map(b => {
              const sc = statusConfig[b.status] || statusConfig.pending;
              return (
                <div key={b.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{b.borrower_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {b.borrower_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {b.borrow_date}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

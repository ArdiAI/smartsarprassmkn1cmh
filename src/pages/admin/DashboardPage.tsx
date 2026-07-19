import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { fetchTodayCounts } from '../../lib/timeline.ts';
import { showToast } from '../../components/Toast';
import {
  Package,
  Clock,
  CheckCircle2,
  ArrowRight,
  Calendar,
  TrendingUp,
  Users,
  FileText,
  Boxes,
  AlertTriangle,
  CalendarDays,
  Activity,
} from 'lucide-react';

interface DashboardStats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
}

interface RecentBorrowing {
  id: string;
  borrower_name: string;
  item_type: string;
  borrow_date: string;
  status: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalBorrowings: 0,
    pending: 0,
    approved: 0,
    inventoryCount: 0,
  });
  const [todayCounts, setTodayCounts] = useState({ agendaToday: 0, borrowToday: 0, weekTotal: 0 });
  const [recent, setRecent] = useState<RecentBorrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [borrowCount, pendingCount, approvedCount, invCount] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
        ]);
        setStats({
          totalBorrowings: borrowCount.count ?? 0,
          pending: pendingCount.count ?? 0,
          approved: approvedCount.count ?? 0,
          inventoryCount: invCount.count ?? 0,
        });

        const tc = await fetchTodayCounts();
        setTodayCounts(tc);

        const { data: recentData } = await supabase
          .from('borrowings')
          .select('id, borrower_name, item_type, borrow_date, status')
          .order('created_at', { ascending: false })
          .limit(5);
        setRecent((recentData as unknown as RecentBorrowing[]) ?? []);
      } catch {
        showToast('Gagal memuat data dashboard', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.totalBorrowings, icon: Package, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-900/30' },
    { label: 'Menunggu', value: stats.pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Total Barang', value: stats.inventoryCount, icon: Boxes, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
  ];

  const widgets = [
    { label: 'Agenda Hari Ini', value: todayCounts.agendaToday, icon: Calendar, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Peminjaman Hari Ini', value: todayCounts.borrowToday, icon: Activity, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    { label: 'Kegiatan Minggu Ini', value: todayCounts.weekTotal, icon: CalendarDays, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
  ];

  const quickActions = [
    { label: 'Peminjaman', icon: Package, path: '/admin/borrowings' },
    { label: 'Inventaris', icon: Boxes, path: '/admin/inventory' },
    { label: 'Laporan', icon: AlertTriangle, path: '/admin/reports' },
    { label: 'Agenda', icon: Calendar, path: '/admin/agenda' },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'returned':
      case 'completed':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ringkasan aktivitas sarana dan prasarana sekolah</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${card.bg}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today widgets */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">Hari Ini</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {widgets.map((w) => {
            const Icon = w.icon;
            return (
              <button
                key={w.label}
                onClick={() => navigate('/admin/timeline')}
                className="card group flex items-center justify-between text-left transition hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-3 ${w.bg}`}>
                    <Icon className={`h-6 w-6 ${w.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{w.label}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{w.value}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:text-brand-500" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent borrowings */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Peminjaman Terbaru</h2>
            </div>
            <button
              onClick={() => navigate('/admin/borrowings')}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Lihat semua
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada peminjaman</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.borrower_name ?? 'N/A'}</p>
                      <p className="text-xs text-slate-400">{r.item_type ?? 'Barang'} • {r.borrow_date ?? '-'}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(r.status ?? '')}`}>
                    {r.status ?? '-'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Aksi Cepat</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.label}
                  onClick={() => navigate(qa.path)}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-700 dark:hover:bg-slate-700/50"
                >
                  <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{qa.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

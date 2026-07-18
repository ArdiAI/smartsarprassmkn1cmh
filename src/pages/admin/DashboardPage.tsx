import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchTodayCounts } from '../../lib/timeline';
import { useAuth } from '../../context/AuthContext';

interface Stats {
  totalBorrowings: number;
  pending: number;
  approved: number;
  inventoryCount: number;
}

interface RecentBorrowing {
  id: string;
  borrower_name: string;
  status: string;
  borrow_date: string;
  item_type: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  returned: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  borrowed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

function statusLabel(s: string) {
  switch (s) {
    case 'pending': return 'Menunggu';
    case 'approved': return 'Disetujui';
    case 'rejected': return 'Ditolak';
    case 'returned': return 'Dikembalikan';
    case 'borrowed': return 'Dipinjam';
    default: return s;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { adminProfile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<{ agendaToday: number; borrowToday: number; weekTotal: number } | null>(null);
  const [recent, setRecent] = useState<RecentBorrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [borrowCount, pendingCount, approvedCount, invCount, recentData, todayCounts] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id, borrower_name, status, borrow_date, item_type').order('created_at', { ascending: false }).limit(5),
          fetchTodayCounts(),
        ]);
        setStats({
          totalBorrowings: borrowCount.count ?? 0,
          pending: pendingCount.count ?? 0,
          approved: approvedCount.count ?? 0,
          inventoryCount: invCount.count ?? 0,
        });
        setToday(todayCounts);
        setRecent((recentData.data as unknown as RecentBorrowing[]) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Peminjaman', value: stats?.totalBorrowings ?? 0, icon: Package, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300' },
    { label: 'Menunggu Persetujuan', value: stats?.pending ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300' },
    { label: 'Disetujui', value: stats?.approved ?? 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { label: 'Total Inventaris', value: stats?.inventoryCount ?? 0, icon: TrendingUp, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-300' },
  ];

  const widgets = [
    { label: 'Agenda Hari Ini', value: today?.agendaToday ?? 0, desc: 'Kegiatan terjadwal hari ini', icon: CalendarDays, color: 'from-blue-500 to-blue-600' },
    { label: 'Peminjaman Hari Ini', value: today?.borrowToday ?? 0, desc: 'Peminjaman aktif hari ini', icon: Package, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Kegiatan Minggu Ini', value: today?.weekTotal ?? 0, desc: 'Agenda + peminjaman 7 hari', icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
  ];

  const quickActions = [
    { label: 'Peminjaman', path: '/admin/borrowings', icon: Package },
    { label: 'Inventaris', path: '/admin/inventory', icon: Package },
    { label: 'Laporan Kerusakan', path: '/admin/reports', icon: Clock },
    { label: 'Agenda', path: '/admin/agenda', icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Selamat datang kembali{adminProfile?.name ? `, ${adminProfile.name}` : ''}!
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${s.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline widgets */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Ringkasan Timeline</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {widgets.map((w) => {
            const Icon = w.icon;
            return (
              <button
                key={w.label}
                onClick={() => navigate('/admin/timeline')}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${w.color} p-5 text-left text-white shadow-sm transition hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80">{w.label}</p>
                    <p className="mt-1 text-3xl font-bold">{w.value}</p>
                    <p className="mt-1 text-xs text-white/70">{w.desc}</p>
                  </div>
                  <Icon className="h-8 w-8 text-white/70" />
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-white/90">
                  Lihat Timeline
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent borrowings + quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Peminjaman Terbaru</h2>
            <button
              onClick={() => navigate('/admin/borrowings')}
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Lihat semua
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada peminjaman.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {r.borrower_name ?? 'Peminjam'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.item_type ?? 'Barang'} • {r.borrow_date ?? '-'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[r.status] ?? statusStyles.pending}`}>
                    {statusLabel(r.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.label}
                  onClick={() => navigate(q.path)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center transition hover:border-brand-400 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-500 dark:hover:bg-brand-900/20"
                >
                  <Icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{q.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

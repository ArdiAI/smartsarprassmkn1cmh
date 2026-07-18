import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Clock, CheckCircle2, CalendarDays, ArrowRight, Plus, FileText, AlertTriangle, Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchTodayCounts } from '../../lib/timeline';
import EmptyState from '../../components/EmptyState';

interface RecentBorrowing {
  id: string;
  borrower_name: string | null;
  item_type: string | null;
  borrow_date: string | null;
  status: string | null;
  purpose: string | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, inventory: 0 });
  const [counts, setCounts] = useState({ agendaToday: 0, borrowToday: 0, weekTotal: 0 });
  const [recent, setRecent] = useState<RecentBorrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [borrowRes, invRes, todayCounts] = await Promise.all([
          supabase.from('borrowings').select('id, status'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          fetchTodayCounts(),
        ]);
        const borrowings = (borrowRes.data ?? []) as unknown as { status: string }[];
        setStats({
          total: borrowings.length,
          pending: borrowings.filter((b) => b.status === 'pending').length,
          approved: borrowings.filter((b) => b.status === 'approved').length,
          inventory: invRes.count ?? 0,
        });
        setCounts(todayCounts);

        const { data: recentData } = await supabase
          .from('borrowings')
          .select('id, borrower_name, item_type, borrow_date, status, purpose')
          .order('created_at', { ascending: false })
          .limit(5);
        setRecent((recentData ?? []) as unknown as RecentBorrowing[]);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.total, icon: Package, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30' },
    { label: 'Menunggu Persetujuan', value: stats.pending, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Total Inventaris', value: stats.inventory, icon: Package, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30' },
  ];

  const widgets = [
    { label: 'Agenda Hari Ini', value: counts.agendaToday, icon: CalendarDays, color: 'from-blue-500 to-blue-600' },
    { label: 'Peminjaman Hari Ini', value: counts.borrowToday, icon: Package, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Kegiatan Minggu Ini', value: counts.weekTotal, icon: Calendar, color: 'from-purple-500 to-purple-600' },
  ];

  const quickActions = [
    { label: 'Kelola Peminjaman', icon: Package, path: '/admin/borrowings' },
    { label: 'Kelola Inventaris', icon: Package, path: '/admin/inventory' },
    { label: 'Laporan Kerusakan', icon: AlertTriangle, path: '/admin/reports' },
    { label: 'Buat Agenda', icon: CalendarDays, path: '/admin/agenda' },
  ];

  const statusColor = (s: string | null) => {
    switch (s) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'returned': return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ringkasan aktivitas sarana dan prasarana sekolah.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline widgets */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">Aktivitas Timeline</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {widgets.map((w) => (
            <button
              key={w.label}
              onClick={() => navigate('/admin/timeline')}
              className={`card flex items-center justify-between bg-gradient-to-br ${w.color} text-white transition hover:scale-[1.02] hover:shadow-md`}
            >
              <div className="text-left">
                <p className="text-sm font-medium text-white/90">{w.label}</p>
                <p className="mt-1 text-3xl font-bold">{w.value}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-white/80" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent borrowings + Quick actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Peminjaman Terbaru</h2>
            <button onClick={() => navigate('/admin/borrowings')} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Lihat semua
            </button>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="Belum ada peminjaman" description="Peminjaman terbaru akan muncul di sini." />
          ) : (
            <div className="space-y-3">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {r.purpose ?? r.borrower_name ?? 'Peminjaman'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {r.borrower_name ?? '-'} • {r.item_type ?? '-'} • {r.borrow_date ?? '-'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(r.status)}`}>
                    {r.status ?? '-'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Aksi Cepat</h2>
          <div className="space-y-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <a.icon className="h-4 w-4 text-brand-600" />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

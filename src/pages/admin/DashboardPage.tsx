import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  ClipboardList,
  AlertTriangle,
  CalendarPlus,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchTodayCounts } from '../../lib/timeline';
import { showToast } from '../../components/Toast';

interface RecentBorrowing {
  id: string;
  borrower_name: string;
  item_type: string;
  borrow_date: string;
  status: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalBorrowings, setTotalBorrowings] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [todayCounts, setTodayCounts] = useState({ agendaToday: 0, borrowToday: 0, weekTotal: 0 });
  const [recentBorrowings, setRecentBorrowings] = useState<RecentBorrowing[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [borrowRes, pendingRes, approvedRes, invRes, counts, recentRes] = await Promise.all([
          supabase.from('borrowings').select('id', { count: 'exact', head: true }),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('inventory').select('id', { count: 'exact', head: true }),
          fetchTodayCounts(),
          supabase
            .from('borrowings')
            .select('id, borrower_name, item_type, borrow_date, status')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);
        setTotalBorrowings(borrowRes.count ?? 0);
        setPendingCount(pendingRes.count ?? 0);
        setApprovedCount(approvedRes.count ?? 0);
        setInventoryCount(invRes.count ?? 0);
        setTodayCounts(counts);
        setRecentBorrowings((recentRes.data as unknown as RecentBorrowing[]) ?? []);
      } catch {
        showToast('Gagal memuat data dashboard', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = [
    { label: 'Total Peminjaman', value: totalBorrowings, icon: ClipboardList, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40' },
    { label: 'Menunggu Persetujuan', value: pendingCount, icon: Clock, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' },
    { label: 'Disetujui', value: approvedCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' },
    { label: 'Total Inventaris', value: inventoryCount, icon: Package, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40' },
  ];

  const widgets = [
    { label: 'Agenda Hari Ini', value: todayCounts.agendaToday, icon: CalendarDays, color: 'from-blue-500 to-blue-600' },
    { label: 'Peminjaman Hari Ini', value: todayCounts.borrowToday, icon: ClipboardList, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Kegiatan Minggu Ini', value: todayCounts.weekTotal, icon: CalendarPlus, color: 'from-purple-500 to-purple-600' },
  ];

  const quickActions = [
    { label: 'Peminjaman', path: '/admin/borrowings', icon: ClipboardList },
    { label: 'Inventaris', path: '/admin/inventory', icon: Package },
    { label: 'Laporan Kerusakan', path: '/admin/reports', icon: AlertTriangle },
    { label: 'Agenda', path: '/admin/agenda', icon: CalendarPlus },
  ];

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      returned: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
      borrowed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    };
    return map[status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ringkasan aktivitas sarana dan prasarana sekolah.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
              </div>
              <div className={`rounded-xl p-3 ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline widgets */}
      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-800 dark:text-slate-100">Timeline Hari Ini</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {widgets.map((w) => (
          <button
            key={w.label}
            onClick={() => navigate('/admin/timeline')}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${w.color} p-5 text-left text-white shadow-sm transition hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">{w.label}</p>
                <p className="mt-1 text-3xl font-bold">{w.value}</p>
              </div>
              <w.icon className="h-8 w-8 opacity-80" />
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm opacity-90 transition group-hover:gap-2">
              Lihat Timeline <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>

      {/* Recent borrowings + quick actions */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">Peminjaman Terbaru</h2>
          {recentBorrowings.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada peminjaman.</p>
          ) : (
            <div className="space-y-3">
              {recentBorrowings.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{b.borrower_name ?? '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {b.item_type ?? 'Barang'} • {b.borrow_date ?? '—'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(b.status)}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-center transition hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:bg-brand-900/20"
              >
                <a.icon className="h-6 w-6 text-brand-600" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

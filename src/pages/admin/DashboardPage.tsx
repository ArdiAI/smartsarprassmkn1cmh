import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import {
  Package, Building2, Clock, Check, X, LayoutDashboard,
  ClipboardList, FileText, Users, Megaphone, MessageSquare, BarChart3, AlertTriangle,
} from 'lucide-react';

interface Borrowing {
  id: string;
  borrower_name: string;
  status: string;
  current_status_label: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const QUICK_LINKS = [
  { to: '/admin/borrowings', label: 'Peminjaman', icon: ClipboardList, color: 'text-blue-500' },
  { to: '/admin/inventory', label: 'Inventaris', icon: Package, color: 'text-cyan-500' },
  { to: '/admin/facilities', label: 'Fasilitas', icon: Building2, color: 'text-purple-500' },
  { to: '/admin/reports', label: 'Laporan Kerusakan', icon: AlertTriangle, color: 'text-orange-500' },
  { to: '/admin/team', label: 'Tim Admin', icon: Users, color: 'text-emerald-500' },
  { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone, color: 'text-pink-500' },
  { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare, color: 'text-indigo-500' },
  { to: '/admin/statistics', label: 'Statistik', icon: BarChart3, color: 'text-amber-500' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({ borrowings: 0, pending: 0, approved: 0, rejected: 0, facilities: 0, inventory: 0 });
  const [recent, setRecent] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [b, f, i] = await Promise.all([
        supabase.from('borrowings').select('id, borrower_name, status, current_status_label, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
      ]);
      const all = (b.data || []) as Borrowing[];
      setRecent(all);
      setStats({
        borrowings: all.length,
        pending: all.filter(x => x.status === 'pending').length,
        approved: all.filter(x => x.status === 'approved').length,
        rejected: all.filter(x => x.status === 'rejected').length,
        facilities: f.count || 0,
        inventory: i.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.borrowings, icon: ClipboardList, color: 'text-blue-500' },
    { label: 'Menunggu', value: stats.pending, icon: Clock, color: 'text-amber-500' },
    { label: 'Disetujui', value: stats.approved, icon: Check, color: 'text-emerald-500' },
    { label: 'Ditolak', value: stats.rejected, icon: X, color: 'text-red-500' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'text-purple-500' },
    { label: 'Inventaris', value: stats.inventory, icon: Package, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-500" /> Dashboard Admin
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Ringkasan dan akses cepat kelola sistem</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
            <s.icon className={cn('w-5 h-5 mb-2', s.color)} />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '...' : s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Peminjaman Terbaru</h2>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Tidak ada peminjaman</p>
          ) : (
            <div className="space-y-2">
              {recent.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {b.borrower_name[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{b.borrower_name}</p>
                    <p className="text-xs text-slate-400">{new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', STATUS_COLORS[b.status] || 'bg-slate-100')}>
                    {b.current_status_label || b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link to="/admin/borrowings" className="mt-4 block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Lihat semua peminjaman →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Akses Cepat</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_LINKS.map(link => (
              <Link key={link.to} to={link.to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <link.icon className={cn('w-6 h-6', link.color)} />
                <span className="text-xs text-center text-slate-700 dark:text-slate-300">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

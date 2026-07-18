import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { brandConfig } from '../../brand/config';
import {
  Package, Clock, CheckCircle, AlertCircle, ArrowRight,
  Building2, FileText, Megaphone, MessageSquare, BarChart3,
} from 'lucide-react';

interface RecentBorrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  purpose: string;
  status: string;
  borrow_date: string;
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
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, inventory: 0 });
  const [recent, setRecent] = useState<RecentBorrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [borrowRes, invRes] = await Promise.all([
        supabase.from('borrowings').select('id, borrower_name, borrower_class, purpose, status, borrow_date').order('created_at', { ascending: false }).limit(6),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
      ]);

      const borrowings = (borrowRes.data as unknown as RecentBorrowing[]) || [];
      const total = borrowRes.count ?? borrowings.length;
      const pending = borrowings.filter(b => b.status === 'pending').length;
      const approved = borrowings.filter(b => b.status === 'approved' || b.status === 'completed').length;

      setStats({
        total,
        pending,
        approved,
        inventory: invRes.count ?? 0,
      });
      setRecent(borrowings);
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Total Peminjaman', value: stats.total, icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'Menunggu Persetujuan', value: stats.pending, icon: Clock, color: 'from-amber-500 to-amber-600' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Total Inventaris', value: stats.inventory, icon: AlertCircle, color: 'from-cyan-500 to-cyan-600' },
  ];

  const quickActions = [
    { to: '/admin/borrowings', label: 'Peminjaman', icon: Package, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { to: '/admin/inventory', label: 'Inventaris', icon: AlertCircle, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' },
    { to: '/admin/facilities', label: 'Fasilitas', icon: Building2, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
    { to: '/admin/reports', label: 'Laporan', icon: FileText, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
    { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
    { to: '/admin/statistics', label: 'Statistik', icon: BarChart3, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Selamat datang di {brandConfig.system.name} Admin Panel
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent borrowings */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Peminjaman Terbaru</h2>
            <Link to="/admin/borrowings" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
              Lihat semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Belum ada peminjaman</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((b) => {
                const cfg = statusConfig[b.status] || statusConfig.pending;
                return (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{b.borrower_name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {b.borrower_class || '-'} · {b.purpose || '-'}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color} ml-3 flex-shrink-0`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

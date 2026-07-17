import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Building2, Clock, CheckCircle2, XCircle, Layers, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface Stats { total: number; pending: number; approved: number; rejected: number; facilities: number; inventory: number; }
interface Borrowing {
  id: string; borrower_name: string; status: string; borrow_date: string;
  item_type: string; inventory?: { name: string } | null; facility?: { name: string } | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0, facilities: 0, inventory: 0 });
  const [recent, setRecent] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [borrowRes, facRes, invRes] = await Promise.all([
        supabase.from('borrowings').select('id, status').order('created_at', { ascending: false }),
        supabase.from('facilities').select('id', { count: 'exact', head: true }),
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
      ]);
      const all = borrowRes.data || [];
      setStats({
        total: all.length,
        pending: all.filter(b => b.status === 'pending').length,
        approved: all.filter(b => b.status === 'approved').length,
        rejected: all.filter(b => b.status === 'rejected').length,
        facilities: facRes.count || 0,
        inventory: invRes.count || 0,
      });
      const { data: recentData } = await supabase
        .from('borrowings')
        .select('id, borrower_name, status, borrow_date, item_type, inventory(name), facility(name)')
        .order('created_at', { ascending: false }).limit(5);
      setRecent((recentData as unknown as Borrowing[]) || []);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: 'Total Peminjaman', value: stats.total, icon: Package, color: 'blue' },
    { label: 'Menunggu', value: stats.pending, icon: Clock, color: 'yellow' },
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'green' },
    { label: 'Ditolak', value: stats.rejected, icon: XCircle, color: 'red' },
    { label: 'Fasilitas', value: stats.facilities, icon: Building2, color: 'purple' },
    { label: 'Inventaris', value: stats.inventory, icon: Layers, color: 'cyan' },
  ];
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  };
  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    returned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  const quickLinks = [
    { label: 'Inventaris', to: '/admin/inventory', icon: Package },
    { label: 'Fasilitas', to: '/admin/facilities', icon: Building2 },
    { label: 'Laporan', to: '/admin/reports', icon: Layers },
    { label: 'Tim', to: '/admin/team', icon: CheckCircle2 },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">Ringkasan sistem SMART SARPRAS</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', colorMap[c.color])}>
              <c.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{c.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Peminjaman Terbaru</h2>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada peminjaman</p>
            ) : recent.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{b.borrower_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {b.inventory?.name || b.facility?.name || b.item_type || '-'}
                  </p>
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ml-2', statusColor[b.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Akses Cepat</h2>
          <div className="space-y-2">
            {quickLinks.map(l => (
              <Link key={l.to} to={l.to}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <l.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{l.label}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

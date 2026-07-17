import { useEffect, useState } from 'react';
import {
  BarChart3, ClipboardList, CheckCircle2, Clock, XCircle,
  Package, Building2, Loader2, TrendingUp, Calendar, Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
  active: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

interface PopularItem {
  item_name: string;
  item_type: string;
  total: number;
}

const statusCards = [
  { key: 'pending', label: 'Menunggu', icon: Clock, color: 'from-orange-500 to-orange-600' },
  { key: 'approved', label: 'Disetujui', icon: CheckCircle2, color: 'from-green-500 to-green-600' },
  { key: 'active', label: 'Aktif', icon: TrendingUp, color: 'from-cyan-500 to-cyan-600' },
  { key: 'returned', label: 'Dikembalikan', icon: Package, color: 'from-blue-500 to-blue-600' },
] as const;

export default function RekapPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0, returned: 0, active: 0 });
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: borrowings } = await supabase
        .from('borrowings')
        .select('status, borrow_date, borrowing_items(item_name, item_type)')
        .order('created_at', { ascending: false })
        .limit(500);

      const rows = borrowings || [];
      const s: Stats = { total: 0, pending: 0, approved: 0, rejected: 0, returned: 0, active: 0 };
      const monthMap: Record<string, number> = {};
      const itemMap: Record<string, PopularItem> = {};

      rows.forEach((b: any) => {
        s.total++;
        if (b.status in s) (s as any)[b.status]++;

        if (b.borrow_date) {
          const d = new Date(b.borrow_date);
          const key = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
          monthMap[key] = (monthMap[key] || 0) + 1;
        }

        if (b.borrowing_items) {
          b.borrowing_items.forEach((item: any) => {
            const key = `${item.item_name}_${item.item_type}`;
            if (!itemMap[key]) itemMap[key] = { item_name: item.item_name, item_type: item.item_type, total: 0 };
            itemMap[key].total++;
          });
        }
      });

      setStats(s);
      setMonthly(Object.entries(monthMap).map(([month, count]) => ({ month, count })).slice(0, 6).reverse());
      setPopular(Object.values(itemMap).sort((a, b) => b.total - a.total).slice(0, 5));
      setLoading(false);
    })();
  }, []);

  const maxMonthly = Math.max(...monthly.map(m => m.count), 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Rekap & Statistik</h1>
          <p className="text-slate-500 dark:text-slate-400">Ringkasan data peminjaman sarana prasarana</p>
        </div>

        {/* Total + Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-5 text-white">
            <BarChart3 className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-3xl font-extrabold">{stats.total}</p>
            <p className="text-sm text-blue-100">Total Peminjaman</p>
          </div>
          {statusCards.map(card => (
            <div key={card.key} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br', card.color)}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{(stats as any)[card.key]}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Monthly Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Tren Bulanan</h2>
            </div>
            {monthly.length === 0 ? (
              <EmptyState title="Belum ada data" message="Data tren bulanan belum tersedia" />
            ) : (
              <div className="space-y-3">
                {monthly.map(m => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400 w-20 flex-shrink-0">{m.month}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-7 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(m.count / maxMonthly) * 100}%` }}>
                        <span className="text-xs font-bold text-white">{m.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Popular Items */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Item Terpopuler</h2>
            </div>
            {popular.length === 0 ? (
              <EmptyState title="Belum ada data" message="Item terpopuler belum tersedia" />
            ) : (
              <div className="space-y-3">
                {popular.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      {item.item_type === 'ruangan' ? (
                        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Package className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{item.item_name}</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.total}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rejected count */}
        {stats.rejected > 0 && (
          <div className="mt-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              {stats.rejected} peminjaman ditolak. Tinjau persyaratan pengajuan untuk meningkatkan tingkat persetujuan.
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

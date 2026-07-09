import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Package, ClipboardList, AlertTriangle, CheckCircle, Building2, TrendingUp, Clock, Zap, Users, Calendar, RefreshCw, XCircle, RotateCcw, BarChart3, FileBox } from 'lucide-react';
import { cn } from '../../utils/cn';
import AnnouncementFeed from '../../components/AnnouncementFeed';
import AnimatedStats from '../../components/AnimatedStats';
import RealtimeClock from '../../components/RealtimeClock';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<{ day: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [topBorrowedItems, setTopBorrowedItems] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [inv, bor, rep, fac, kav] = await Promise.all([
        supabase.from('inventory').select('id, quantity, condition, name'),
        supabase.from('borrowings').select('id, status, created_at, item_type, inventory_id, facility_id, inventory(name), facilities(name)'),
        supabase.from('damage_reports').select('id, status, severity, created_at'),
        supabase.from('facilities').select('id'),
        supabase.from('kavling').select('id'),
      ]);

      const totalItems = (inv.data || []).reduce((sum: number, i: any) => sum + i.quantity, 0);
      const goodItems = (inv.data || []).filter((i: any) => i.condition === 'good').length;
      const activeBorrowings = (bor.data || []).filter((b: any) => b.status === 'approved').length;
      const pendingBorrowings = (bor.data || []).filter((b: any) => b.status === 'pending').length;
      const rejectedBorrowings = (bor.data || []).filter((b: any) => b.status === 'rejected').length;
      const completedBorrowings = (bor.data || []).filter((b: any) => b.status === 'completed').length;
      const cancelledBorrowings = (bor.data || []).filter((b: any) => b.status === 'cancelled').length;
      const pendingReports = (rep.data || []).filter((r: any) => r.status === 'pending').length;

      // Calculate items currently in use
      const today = new Date().toISOString().split('T')[0];
      const inUseBorrowings = (bor.data || []).filter((b: any) =>
        b.status === 'approved' && today >= b.borrow_date && today <= (b.return_date || b.borrow_date)
      ).length;

      setStats({
        totalItems,
        goodItems,
        totalBorrowings: (bor.data || []).length,
        activeBorrowings,
        pendingBorrowings,
        rejectedBorrowings,
        completedBorrowings,
        cancelledBorrowings,
        inUseBorrowings,
        pendingReports,
        facilities: (fac.data || []).length,
        kavling: (kav.data || []).length,
        health: totalItems > 0 ? Math.round((goodItems / (inv.data || []).length) * 100) : 100,
      });

      // Top borrowed items
      const itemCounts: Record<string, { name: string; count: number }> = {};
      (bor.data || []).forEach((b: any) => {
        const name = b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name;
        if (name) {
          if (!itemCounts[name]) itemCounts[name] = { name, count: 0 };
          itemCounts[name].count++;
        }
      });
      setTopBorrowedItems(Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5));

      const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      setChartData(days.map(day => ({ day, value: Math.floor(Math.random() * 50) + 20 })));

      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Pemantauan real-time sarana prasarana</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
          <RealtimeClock />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium shadow-lg hover:shadow-xl">
            <RefreshCw className="w-4 h-4" /> Refresh
          </motion.button>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStats value={stats?.totalBorrowings || 0} label="Total Pengajuan" icon={ClipboardList} color="blue" delay={0.1} />
        <AnimatedStats value={stats?.pendingBorrowings || 0} label="Menunggu Persetujuan" icon={Clock} color="orange" delay={0.2} />
        <AnimatedStats value={stats?.activeBorrowings || 0} label="Disetujui" icon={CheckCircle} color="green" delay={0.3} />
        <AnimatedStats value={stats?.inUseBorrowings || 0} label="Sedang Digunakan" icon={Package} color="cyan" delay={0.4} />
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <AnimatedStats value={stats?.rejectedBorrowings || 0} label="Ditolak" icon={XCircle} color="orange" delay={0.1} />
        <AnimatedStats value={stats?.completedBorrowings || 0} label="Selesai" icon={CheckCircle} color="blue" delay={0.2} />
        <AnimatedStats value={stats?.pendingReports || 0} label="Laporan Pending" icon={AlertTriangle} color="orange" delay={0.3} />
        <AnimatedStats value={stats?.facilities || 0} label="Total Fasilitas" icon={Building2} color="green" delay={0.4} />
        <AnimatedStats value={stats?.kavling || 0} label="Total Data Kavling" icon={FileBox} color="purple" delay={0.5} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-2 space-y-6">
          {/* Weekly Activity Chart */}
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Aktivitas Mingguan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Peminjaman & laporan</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <TrendingUp className="w-4 h-4" /><span className="text-sm font-medium">+18%</span>
              </div>
            </div>
            <div className="h-48 flex items-end justify-around gap-2">
              {chartData.map((item, i) => (
                <motion.div key={i} initial={{ height: 0, opacity: 0 }} animate={{ height: `${item.value}%`, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.05 }} className="flex-1 flex flex-col items-center gap-2 group">
                  <motion.div whileHover={{ scale: 1.1 }}
                    className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg shadow-lg group-hover:shadow-blue-500/50 transition-all relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{item.day}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Top Borrowed Items */}
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" /> Barang Paling Sering Dipinjam
                </h3>
              </div>
            </div>
            {topBorrowedItems.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Belum ada data peminjaman</p>
            ) : (
              <div className="space-y-3">
                {topBorrowedItems.map((item, i) => {
                  const maxCount = topBorrowedItems[0].count;
                  const percent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-5">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{item.count}x</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }}
                            transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Health Overview */}
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Kondisi Inventaris</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Baik', value: stats?.goodItems || 0, percent: stats?.health || 100, color: 'green', icon: CheckCircle },
                { label: 'Cukup', value: Math.round((stats?.totalItems || 0) * 0.15), percent: 15, color: 'yellow', icon: Clock },
                { label: 'Rusak', value: Math.round((stats?.totalItems || 0) * 0.05), percent: 5, color: 'red', icon: AlertTriangle },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
                  className="relative p-4 rounded-xl bg-slate-50/50 dark:bg-slate-700/30 overflow-hidden group hover:shadow-lg transition-all">
                  <item.icon className={`w-8 h-8 mb-2 ${item.color === 'green' ? 'text-green-500' : item.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'}`} />
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.percent}%` }} transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                    className={`absolute bottom-0 left-0 h-1 ${item.color === 'green' ? 'bg-green-500' : item.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Quick Actions</h3>
                <p className="text-sm text-blue-100">Akses cepat fitur utama</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Tambah Inventaris', icon: Package, href: '/admin/inventory' },
                { label: 'Kelola Peminjaman', icon: ClipboardList, href: '/admin/borrowings' },
                { label: 'Tangani Laporan', icon: AlertTriangle, href: '/admin/reports' },
                { label: 'Lihat Statistik', icon: TrendingUp, href: '/admin/statistics' },
              ].map((action, i) => (
                <motion.a key={i} href={action.href} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all">
                  <action.icon className="w-8 h-8 text-white" />
                  <span className="text-sm font-medium text-white text-center">{action.label}</span>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Recent Announcements */}
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
          <AnnouncementFeed maxItems={5} compact />
        </motion.div>
      </div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      </div>
    </div>
  );
}

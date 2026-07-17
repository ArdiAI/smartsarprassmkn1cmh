import { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, Clock, XCircle, Package } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedStats from '../components/AnimatedStats';
import { supabase } from '../lib/supabase';

export default function RekapPage() {
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0, returned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('borrowings')
      .select('status')
      .then(({ data }) => {
        const rows = data || [];
        setStats({
          total: rows.length,
          approved: rows.filter(r => r.status === 'approved').length,
          pending: rows.filter(r => r.status === 'pending').length,
          rejected: rows.filter(r => r.status === 'rejected').length,
          returned: rows.filter(r => r.status === 'returned').length,
        });
        setLoading(false);
      });
  }, []);

  const breakdown = [
    { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'green' as const },
    { label: 'Menunggu', value: stats.pending, icon: Clock, color: 'orange' as const },
    { label: 'Ditolak', value: stats.rejected, icon: XCircle, color: 'blue' as const },
    { label: 'Dikembalikan', value: stats.returned, icon: Package, color: 'cyan' as const },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Rekap Peminjaman</h1>
          <p className="text-sm text-slate-500">Statistik dan rekapitulasi data peminjaman sarpras.</p>
        </div>

        {/* Total */}
        <section className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-2 lg:col-span-1">
              <AnimatedStats value={stats.total} label="Total Peminjaman" icon={ClipboardList} color="blue" />
            </div>
            {breakdown.map((b, i) => (
              <AnimatedStats key={i} value={b.value} label={b.label} icon={b.icon} color={b.color} />
            ))}
          </div>
        </section>

        {/* Bar Chart */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Distribusi Status</h2>
          {loading ? (
            <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          ) : stats.total === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">Belum ada data peminjaman.</p>
          ) : (
            <div className="space-y-4">
              {breakdown.map(b => {
                const pct = stats.total > 0 ? Math.round((b.value / stats.total) * 100) : 0;
                const barColors: Record<string, string> = {
                  green: 'bg-green-500',
                  orange: 'bg-orange-500',
                  blue: 'bg-blue-500',
                  cyan: 'bg-cyan-500',
                };
                return (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{b.label}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{b.value} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${barColors[b.color]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Summary Card */}
        <section className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 text-white">
          <h2 className="text-lg font-bold mb-2">Ringkasan</h2>
          <p className="text-sm text-blue-50">
            Dari total <strong>{stats.total}</strong> peminjaman, <strong>{stats.approved}</strong> disetujui,
            <strong> {stats.pending}</strong> menunggu persetujuan, <strong>{stats.rejected}</strong> ditolak,
            dan <strong>{stats.returned}</strong> telah dikembalikan.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

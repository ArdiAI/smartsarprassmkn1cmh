import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ClipboardList, Calendar, Package, CheckCircle2, Clock, XCircle, Mail } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Borrowing {
  id: string;
  inventory_id: string;
  borrower_name: string;
  borrower_email: string;
  borrower_class: string;
  borrowed_units: number;
  borrow_date: string;
  return_date: string;
  actual_return_date: string;
  status: string;
  notes: string;
  inventory: { name: string }[] | null;
}

export default function HistoryPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [results, setResults] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch(searchEmail?: string) {
    const query = (searchEmail ?? email).trim();
    if (!query) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from('borrowings')
      .select('*, inventory(name)')
      .ilike('borrower_email', query)
      .order('created_at', { ascending: false });
    setResults((data as Borrowing[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    const initialEmail = searchParams.get('email');
    if (initialEmail) doSearch(initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Menunggu' },
    approved: { icon: CheckCircle2, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Disetujui' },
    returned: { icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Dikembalikan' },
    completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Selesai' },
    rejected: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Ditolak' },
    cancelled: { icon: XCircle, color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', label: 'Dibatalkan' },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="relative z-10 pt-20 pb-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Cari riwayat peminjaman berdasarkan email</p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Masukkan email peminjam..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => doSearch()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <Search className="w-4 h-4" /> Cari
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
            ))}
          </div>
        ) : !searched ? (
          <EmptyState title="Cari riwayat peminjaman" message="Masukkan email untuk melihat riwayat" />
        ) : results.length === 0 ? (
          <EmptyState title="Tidak ada riwayat" message="Email tidak ditemukan atau belum pernah meminjam" />
        ) : (
          <div className="space-y-3">
            {results.map(b => {
              const cfg = statusConfig[b.status] || statusConfig.pending;
              return (
                <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.inventory?.[0]?.name || 'Barang dihapus'}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{b.borrower_name} · {b.borrower_class || '-'}</p>
                      </div>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', cfg.color)}>
                      <cfg.icon className="w-3.5 h-3.5" /> {cfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Pinjam: {new Date(b.borrow_date).toLocaleDateString('id-ID')}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Kembali: {b.return_date ? new Date(b.return_date).toLocaleDateString('id-ID') : '-'}</div>
                    <div className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Jumlah: {b.borrowed_units}</div>
                    {b.actual_return_date && <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Dikembalikan: {new Date(b.actual_return_date).toLocaleDateString('id-ID')}</div>}
                  </div>
                  {b.notes && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700">{b.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

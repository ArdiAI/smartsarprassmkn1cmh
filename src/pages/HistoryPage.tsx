import { useEffect, useState } from 'react';
import { Search, History, Loader2, Calendar, User, Mail, Package } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string | null;
  item_name: string | null;
  quantity: number;
  status: string | null;
  current_status_label: string | null;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrow_date: string | null;
  return_date: string | null;
  actual_return_date: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  purpose: string | null;
  item_type: string | null;
  current_status_label: string | null;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Menunggu', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { label: 'Ditolak', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  returned: { label: 'Dikembalikan', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Selesai', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled: { label: 'Dibatalkan', badge: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
};

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('borrowings')
          .select('*, borrowing_items(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBorrowings((data as unknown as Borrowing[]) || []);
      } catch (e) {
        console.error('Failed to load history:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = borrowings.filter((b) =>
    b.borrower_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.borrower_class ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (b.borrower_email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-7 h-7 text-blue-500" /> Riwayat Peminjaman
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar seluruh transaksi peminjaman.</p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kelas, atau email peminjam..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
                <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={History} title="Belum ada riwayat" description="Riwayat peminjaman akan tampil di sini." />
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const st = statusConfig[b.status] || statusConfig.pending;
              return (
                <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', st.badge)}>{st.label}</span>
                        {b.current_status_label && (
                          <span className="text-xs text-slate-400">• {b.current_status_label}</span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        {b.borrower_class && (
                          <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> {b.borrower_class}</div>
                        )}
                        {b.borrower_email && (
                          <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {b.borrower_email}</div>
                        )}
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {formatDate(b.borrow_date)} → {formatDate(b.return_date)}</div>
                      </div>
                      {b.purpose && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2"><span className="font-medium">Keperluan:</span> {b.purpose}</p>}
                    </div>
                  </div>

                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Item Dipinjam</p>
                      <div className="flex flex-wrap gap-2">
                        {b.borrowing_items.map((it) => (
                          <span key={it.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200">
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                            {it.item_name || 'Item'} ×{it.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && borrowings.length > 0 && (
          <p className="text-center text-sm text-slate-400 mt-6 flex items-center justify-center gap-1">
            <Loader2 className="w-3 h-3" /> Menampilkan {filtered.length} dari {borrowings.length} riwayat
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}

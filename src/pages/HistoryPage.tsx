import { useEffect, useState, useMemo } from 'react';
import { Search, History, Calendar, User, Package, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingItem {
  id: string;
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
  status: 'pending' | 'approved' | 'rejected' | 'returned' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  purpose: string | null;
  item_type: string | null;
  current_status_label: string | null;
  borrowing_items: BorrowingItem[] | null;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Disetujui', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Ditolak', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  returned: { label: 'Dikembalikan', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Dibatalkan', classes: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
};

function formatDate(d: string | null) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function RowSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex justify-between">
        <div className="w-1/3 h-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="w-20 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
      <div className="w-1/2 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="w-2/3 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
    </div>
  );
}

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('borrowings')
          .select('*, borrowing_items(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBorrowings((data as unknown as Borrowing[]) || []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return borrowings;
    return borrowings.filter(
      (b) =>
        b.borrower_name.toLowerCase().includes(q) ||
        (b.borrower_class || '').toLowerCase().includes(q) ||
        (b.borrower_email || '').toLowerCase().includes(q) ||
        (b.purpose || '').toLowerCase().includes(q)
    );
  }, [borrowings, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Daftar semua peminjaman yang pernah diajukan.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kelas, atau keperluan..."
            className="input pl-10"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={History}
              title="Belum ada riwayat peminjaman"
              description={search ? 'Coba kata kunci lain.' : 'Peminjaman akan muncul di sani.'}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const cfg = statusConfig[b.status] || statusConfig.pending;
              return (
                <div key={b.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                        {b.borrower_class && (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {b.borrower_class}
                          </span>
                        )}
                        {b.borrower_email && <span>{b.borrower_email}</span>}
                      </div>
                    </div>
                    <span className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap', cfg.classes)}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-600 dark:text-slate-300 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Pinjam: {formatDate(b.borrow_date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Kembali: {formatDate(b.return_date)}
                    </span>
                    {b.actual_return_date && (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        Dikembalikan: {formatDate(b.actual_return_date)}
                      </span>
                    )}
                  </div>

                  {/* Items */}
                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Barang Dipinjam</p>
                      <div className="flex flex-wrap gap-2">
                        {b.borrowing_items.map((it) => (
                          <span
                            key={it.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-300"
                          >
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            {it.item_name || 'Item'} × {it.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Purpose */}
                  {b.purpose && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Keperluan: </span>
                      {b.purpose}
                    </p>
                  )}

                  {/* Status label */}
                  {b.current_status_label && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                      Status: {b.current_status_label}
                    </p>
                  )}
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

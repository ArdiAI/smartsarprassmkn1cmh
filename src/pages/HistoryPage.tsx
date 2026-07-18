import { useEffect, useState, useMemo } from 'react';
import { Search, History, User, Calendar, Package, Building2, Clock, FileText } from 'lucide-react';
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
  item_type: string;
  item_name: string | null;
  quantity: number;
  status: string;
  current_status_label: string | null;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string | null;
  borrowed_units: number | null;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  borrower_email: string | null;
  item_type: string | null;
  purpose: string | null;
  current_status_label: string | null;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; badge: string; dot: string }> = {
  pending: {
    label: 'Menunggu',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  approved: {
    label: 'Disetujui',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    dot: 'bg-green-500',
  },
  rejected: {
    label: 'Ditolak',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    dot: 'bg-red-500',
  },
  returned: {
    label: 'Dikembalikan',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  completed: {
    label: 'Selesai',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Dibatalkan',
    badge: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    dot: 'bg-slate-500',
  },
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
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
        console.error('Failed to load borrowings:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return borrowings;
    return borrowings.filter(
      (b) =>
        b.borrower_name?.toLowerCase().includes(q) ||
        b.borrower_class?.toLowerCase().includes(q) ||
        b.borrower_email?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q) ||
        b.status?.toLowerCase().includes(q),
    );
  }, [borrowings, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Lihat semua riwayat peminjaman barang dan fasilitas beserta statusnya.
          </p>
        </section>

        {/* Search */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama, kelas, email, atau keperluan..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </section>

        {/* List */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      <div className="h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </div>
                    <div className="h-8 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <EmptyState
                icon={History}
                title="Tidak ada riwayat peminjaman"
                description={search ? "Coba kata kunci lain." : "Belum ada peminjaman yang tercatat."}
              />
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Menampilkan {filtered.length} riwayat peminjaman
              </p>
              <div className="space-y-4">
                {filtered.map((b) => {
                  const st = statusConfig[b.status] || statusConfig.pending;
                  const items = b.borrowing_items || [];
                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 sm:p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        {/* Borrower info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                            {b.borrower_class && (
                              <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                            )}
                            {b.purpose && (
                              <div className="flex items-start gap-1.5 mt-2 text-sm text-slate-600 dark:text-slate-400">
                                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{b.purpose}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Status badge */}
                        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0', st.badge)}>
                          <span className={cn('w-2 h-2 rounded-full', st.dot)} />
                          {b.current_status_label || st.label}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-400">Pinjam</p>
                            <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(b.borrow_date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-400">Kembali</p>
                            <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(b.return_date)}</p>
                          </div>
                        </div>
                        {b.actual_return_date && (
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-400">Dikembalikan</p>
                              <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(b.actual_return_date)}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      {items.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                            Item ({items.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {items.map((it) => (
                              <span
                                key={it.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                              >
                                {it.item_type === 'fasilitas' ? (
                                  <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                                ) : (
                                  <Package className="w-3.5 h-3.5 text-blue-500" />
                                )}
                                <span>{it.item_name || 'Item'}</span>
                                <span className="text-slate-400">×{it.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {b.notes && (
                        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                          <span className="font-medium">Catatan:</span> {b.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

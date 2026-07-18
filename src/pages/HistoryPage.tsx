import { useEffect, useState, useMemo } from 'react';
import { Search, History, User, Calendar, Package, Building2, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
  borrower_class: string;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  item_type: string | null;
  purpose: string | null;
  current_status_label: string | null;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; badge: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  approved: { label: 'Disetujui', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
  returned: { label: 'Dikembalikan', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle2 },
  completed: { label: 'Selesai', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan', badge: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300', icon: XCircle },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchBorrowings() {
      try {
        const { data, error } = await supabase
          .from('borrowings')
          .select('*, borrowing_items(*)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBorrowings((data as unknown as Borrowing[]) || []);
      } catch (err) {
        console.error('Error fetching borrowings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBorrowings();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return borrowings;
    const q = search.toLowerCase();
    return borrowings.filter(
      (b) =>
        b.borrower_name?.toLowerCase().includes(q) ||
        b.borrower_class?.toLowerCase().includes(q) ||
        b.borrower_email?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q) ||
        b.current_status_label?.toLowerCase().includes(q),
    );
  }, [borrowings, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Daftar semua peminjaman beserta statusnya.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, kelas, email, atau tujuan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title="Tidak ada riwayat peminjaman"
            description={search ? "Coba kata kunci lain." : "Belum ada peminjaman yang tercatat."}
          />
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} peminjaman
            </p>
            <div className="space-y-4">
              {filtered.map((b) => {
                const status = statusConfig[b.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                        </div>
                      </div>
                      <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium', status.badge)}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {b.current_status_label || status.label}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 dark:text-slate-500">Pinjam</p>
                          <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(b.borrow_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 dark:text-slate-500">Kembali</p>
                          <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(b.return_date)}</p>
                        </div>
                      </div>
                      {b.actual_return_date && (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Dikembalikan</p>
                            <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(b.actual_return_date)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Purpose */}
                    {b.purpose && (
                      <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Keperluan</p>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{b.purpose}</p>
                      </div>
                    )}

                    {/* Items */}
                    {b.borrowing_items && b.borrowing_items.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Item Dipinjam</p>
                        <div className="flex flex-wrap gap-2">
                          {b.borrowing_items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm"
                            >
                              {item.item_type === 'fasilitas' ? (
                                <Building2 className="w-3.5 h-3.5" />
                              ) : (
                                <Package className="w-3.5 h-3.5" />
                              )}
                              {item.item_name || 'Item'} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {b.notes && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Catatan</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{b.notes}</p>
                      </div>
                    )}

                    {/* Created at */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      Diajukan pada {formatDate(b.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

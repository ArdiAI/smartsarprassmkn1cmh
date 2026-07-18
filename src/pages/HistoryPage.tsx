import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, History, Calendar, User, Package, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
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
  inventory_id: string | null;
  borrower_name: string;
  borrower_class: string;
  borrowed_units: number | null;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  borrower_email: string | null;
  borrower_phone: string | null;
  item_type: string | null;
  facility_id: string | null;
  purpose: string | null;
  start_time: string | null;
  end_time: string | null;
  borrowing_items: BorrowingItem[] | null;
}

const statusConfig: Record<string, { label: string; class: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  approved: { label: 'Disetujui', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'Ditolak', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  returned: { label: 'Dikembalikan', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
  completed: { label: 'Selesai', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', class: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', icon: XCircle },
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
}

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  const filtered = useMemo(() => {
    if (!search.trim()) return borrowings;
    const q = search.toLowerCase();
    return borrowings.filter(
      (b) =>
        b.borrower_name.toLowerCase().includes(q) ||
        b.borrower_class.toLowerCase().includes(q) ||
        (b.borrower_email?.toLowerCase().includes(q) ?? false) ||
        (b.purpose?.toLowerCase().includes(q) ?? false),
    );
  }, [borrowings, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Daftar riwayat peminjaman barang dan fasilitas
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, kelas, email, atau keperluan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={History} title="Tidak ada riwayat peminjaman" description="Riwayat peminjaman akan muncul di sini" />
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} peminjaman
            </p>
            <div className="space-y-4">
              {filtered.map((borrowing) => {
                const status = statusConfig[borrowing.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <div
                    key={borrowing.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', status.class)}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                          {borrowing.item_type && (
                            <span className="text-xs text-slate-400 capitalize">{borrowing.item_type}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{borrowing.borrower_name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{borrowing.borrower_class}</p>
                      </div>
                      <div className="text-right text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                        <p>{formatDate(borrowing.created_at)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>Pinjam: {formatDate(borrowing.borrow_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>Kembali: {formatDate(borrowing.return_date)}</span>
                      </div>
                      {borrowing.start_time && borrowing.end_time && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>{borrowing.start_time} - {borrowing.end_time}</span>
                        </div>
                      )}
                      {borrowing.borrower_email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{borrowing.borrower_email}</span>
                        </div>
                      )}
                    </div>

                    {borrowing.purpose && (
                      <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          <span className="font-medium">Keperluan: </span>{borrowing.purpose}
                        </p>
                      </div>
                    )}

                    {/* Items */}
                    {borrowing.borrowing_items && borrowing.borrowing_items.length > 0 && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Item Dipinjam</p>
                        <div className="flex flex-wrap gap-2">
                          {borrowing.borrowing_items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium"
                            >
                              <Package className="w-3.5 h-3.5" />
                              {item.item_name || 'Item'}
                              <span className="text-blue-500 dark:text-blue-400">×{item.quantity}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {borrowing.notes && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          <span className="font-medium">Catatan: </span>{borrowing.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Search, History, User, Calendar, Package, Clock, Mail, Phone, FileText, CheckCircle2 } from 'lucide-react';
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
  item_name: string;
  quantity: number;
  status: string;
  current_status_label: string;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  borrower_email: string;
  borrower_phone: string;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  notes: string;
  purpose: string;
  start_time: string;
  end_time: string;
  item_type: string;
  current_status_label: string;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', dot: 'bg-green-500' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-500' },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
};

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function HistorySkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
        </div>
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
    </div>
  );
}

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBorrowings = async () => {
      try {
        const { data, error } = await supabase
          .from('borrowings')
          .select('*, borrowing_items(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBorrowings((data as unknown as Borrowing[]) || []);
      } catch (e) {
        console.error('Failed to fetch borrowings:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchBorrowings();
  }, []);

  const filtered = borrowings.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.borrower_name?.toLowerCase().includes(q) ||
      b.borrower_class?.toLowerCase().includes(q) ||
      b.borrower_email?.toLowerCase().includes(q) ||
      b.status?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Daftar semua peminjaman barang dan fasilitas.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, kelas, atau status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <HistorySkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title="Belum ada riwayat peminjaman"
            description={search ? 'Coba kata kunci lain.' : 'Riwayat akan muncul di sini.'}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const st = statusConfig[b.status] || statusConfig.pending;
              return (
                <div key={b.id} className="card p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-700/50 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                      </div>
                    </div>
                    <span className={cn('px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0', st.color)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                      {b.current_status_label || st.label}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Pinjam: {formatDate(b.borrow_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Kembali: {formatDate(b.return_date)}</span>
                    </div>
                    {(b.start_time || b.end_time) && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{b.start_time || '-'} - {b.end_time || '-'}</span>
                      </div>
                    )}
                    {b.borrower_email && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{b.borrower_email}</span>
                      </div>
                    )}
                    {b.borrower_phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{b.borrower_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Purpose */}
                  {b.purpose && (
                    <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-600 dark:text-slate-300">{b.purpose}</p>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Item Dipinjam ({b.borrowing_items.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {b.borrowing_items.map((bi) => (
                          <span
                            key={bi.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-300"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>{bi.item_name || 'Item'}</span>
                            <span className="text-slate-400">×{bi.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {b.notes && (
                    <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Catatan: </span>{b.notes}
                    </div>
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

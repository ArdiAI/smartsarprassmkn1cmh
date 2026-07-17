import { useEffect, useState, useMemo } from 'react';
import { History, Search, Calendar, User, Package, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingItem {
  id: string;
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
  purpose: string | null;
  created_at: string;
  item_type: string | null;
  current_status_label: string | null;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { label: 'Ditolak', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  returned: { label: 'Dikembalikan', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled: { label: 'Dibatalkan', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300' },
};

function HistorySkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
      <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
      } catch (err) {
        console.error('Failed to fetch borrowings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBorrowings();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return borrowings;
    return borrowings.filter(
      (b) =>
        b.borrower_name?.toLowerCase().includes(q) ||
        b.borrower_class?.toLowerCase().includes(q) ||
        b.borrower_email?.toLowerCase().includes(q)
    );
  }, [borrowings, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            Riwayat Peminjaman
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 ml-13">
            Daftar riwayat peminjaman barang dan fasilitas.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, kelas, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => <HistorySkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-8">
            <EmptyState icon={History} title="Tidak ada riwayat peminjaman" description={search ? 'Coba kata kunci lain.' : 'Belum ada peminjaman yang tercatat.'} />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const st = statusConfig[b.status] ?? statusConfig.pending;
              return (
                <div key={b.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', st.classes)}>
                          {b.current_status_label || st.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> {b.borrower_class}
                        </span>
                        {b.borrower_email && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {b.borrower_email}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Date range */}
                  <div className="flex flex-wrap items-center gap-2 text-sm mb-4">
                    <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" /> Pinjam: {formatDate(b.borrow_date)}
                    </div>
                    <span className="text-slate-300">→</span>
                    <div className="px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 text-xs">
                      <Calendar className="w-3.5 h-3.4 inline mr-1" /> Kembali: {formatDate(b.return_date)}
                    </div>
                    {b.actual_return_date && (
                      <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs">
                        Dikembalikan: {formatDate(b.actual_return_date)}
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" /> Item Dipinjam
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {b.borrowing_items.map((bi) => (
                          <span key={bi.id} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-300">
                            {bi.item_name || 'Item'} × {bi.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {b.purpose && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <span className="font-medium">Keperluan: </span>{b.purpose}
                    </p>
                  )}
                  {b.notes && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-medium">Catatan: </span>{b.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Search, History, Calendar, User, Package, Building2, Clock } from 'lucide-react';
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
  inventory_id: string | null;
  borrower_name: string;
  borrower_class: string;
  borrowed_units: number;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  borrower_email: string;
  borrower_phone: string;
  item_type: string;
  facility_id: string | null;
  purpose: string;
  start_time: string;
  end_time: string;
  current_status_label: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
};

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
      } catch (e) {
        console.error('Error fetching borrowings:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchBorrowings();
  }, []);

  const filtered = borrowings.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.borrower_name?.toLowerCase().includes(q) ||
      b.borrower_class?.toLowerCase().includes(q) ||
      b.borrower_email?.toLowerCase().includes(q) ||
      b.purpose?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Riwayat Peminjaman</h1>
          <p className="text-slate-600 dark:text-slate-400">Daftar semua peminjaman yang pernah diajukan</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kelas, atau tujuan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={History} title="Belum ada riwayat peminjaman" description="Riwayat peminjaman akan muncul di sini" />
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const st = statusConfig[b.status] || statusConfig.pending;
              const items = b.borrowing_items || [];
              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        {b.item_type === 'fasilitas' ? (
                          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                      </div>
                    </div>
                    <span className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap', st.color)}>
                      {b.current_status_label || st.label}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Tanggal Pinjam</p>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(b.borrow_date)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Tanggal Kembali</p>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(b.return_date)}</span>
                      </div>
                    </div>
                    {(b.start_time || b.end_time) && (
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Waktu</p>
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Clock className="w-4 h-4" />
                          <span>{b.start_time || '-'} - {b.end_time || '-'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Purpose */}
                  {b.purpose && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Keperluan</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{b.purpose}</p>
                    </div>
                  )}

                  {/* Items */}
                  {items.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Item Dipinjam</p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-300"
                          >
                            {item.item_type === 'fasilitas' ? (
                              <Building2 className="w-3.5 h-3.5" />
                            ) : (
                              <Package className="w-3.5 h-3.5" />
                            )}
                            {item.item_name || 'Item'}
                            <span className="text-slate-400 dark:text-slate-500">×{item.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {b.notes && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Catatan</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{b.notes}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{b.borrower_email || b.borrower_phone || '-'}</span>
                    </div>
                    <span>Diajukan {formatDate(b.created_at)}</span>
                  </div>
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

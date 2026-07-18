import { useEffect, useState } from 'react';
import { History, Search, Calendar, User, Package, Clock } from 'lucide-react';
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
  created_at: string;
  updated_at: string | null;
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
  current_status_label: string | null;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Menunggu', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { label: 'Ditolak', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  returned: { label: 'Dikembalikan', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Selesai', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled: { label: 'Dibatalkan', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300' },
};

function formatDate(dateStr: string | null) {
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
      } catch (err) {
        console.error('Error fetching borrowings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBorrowings();
  }, []);

  const filtered = borrowings.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.borrower_name.toLowerCase().includes(q) ||
      (b.borrower_class || '').toLowerCase().includes(q) ||
      (b.borrower_email || '').toLowerCase().includes(q) ||
      (b.purpose || '').toLowerCase().includes(q) ||
      (b.current_status_label || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daftar semua riwayat peminjaman</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, kelas, email, atau keperluan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                </div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={History} title="Tidak ada riwayat peminjaman" description="Belum ada data peminjaman yang cocok" />
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const st = statusConfig[b.status] || statusConfig.pending;
              return (
                <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                      </div>
                    </div>
                    <span className={cn('px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap', st.badge)}>
                      {b.current_status_label || st.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>Pinjam: {formatDate(b.borrow_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>Kembali: {formatDate(b.return_date)}</span>
                    </div>
                    {b.start_time && b.end_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{b.start_time} - {b.end_time}</span>
                      </div>
                    )}
                    {b.borrower_email && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{b.borrower_email}</span>
                      </div>
                    )}
                  </div>

                  {b.purpose && (
                    <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                      <p className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Keperluan:</span> {b.purpose}</p>
                    </div>
                  )}

                  {/* Items */}
                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Item Dipinjam</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {b.borrowing_items.map((item) => (
                          <span key={item.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-300">
                            <span>{item.item_name || 'Item'}</span>
                            <span className="text-slate-400">×{item.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {b.notes && (
                    <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Catatan:</span> {b.notes}
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

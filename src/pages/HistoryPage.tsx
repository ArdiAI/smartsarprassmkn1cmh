import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import {
  History,
  Search,
  Loader2,
  Calendar,
  User,
  Package,
  Clock,
} from 'lucide-react';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  item_name: string;
  item_type: string | null;
  quantity: number;
  status: string;
  current_step: number | null;
  current_status_label: string | null;
}

interface Borrowing {
  id: string;
  borrower_name: string | null;
  borrower_email: string | null;
  borrower_class: string | null;
  borrow_date: string | null;
  return_date: string | null;
  start_time: string | null;
  end_time: string | null;
  purpose: string | null;
  status: string;
  current_status_label: string | null;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Disetujui', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { label: 'Ditolak', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  returned: { label: 'Dikembalikan', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBorrowings = async () => {
      try {
        const { data, error } = await supabase
          .from('borrowings')
          .select(`
            id,
            borrower_name,
            borrower_email,
            borrower_class,
            borrow_date,
            return_date,
            start_time,
            end_time,
            purpose,
            status,
            current_status_label,
            created_at,
            borrowing_items (
              id,
              borrowing_id,
              item_name,
              item_type,
              quantity,
              status,
              current_step,
              current_status_label
            )
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBorrowings((data as unknown as Borrowing[]) ?? []);
      } catch {
        setBorrowings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBorrowings();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return borrowings;
    const q = search.toLowerCase();
    return borrowings.filter(
      (b) =>
        (b.borrower_name ?? '').toLowerCase().includes(q) ||
        (b.borrower_email ?? '').toLowerCase().includes(q) ||
        (b.borrower_class ?? '').toLowerCase().includes(q) ||
        b.borrowing_items?.some((item) => item.item_name.toLowerCase().includes(q))
    );
  }, [borrowings, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Riwayat Peminjaman</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Daftar riwayat peminjaman barang dan fasilitas
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, email, atau barang..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <EmptyState
              icon={History}
              title={search ? 'Tidak ada riwayat ditemukan' : 'Belum ada riwayat peminjaman'}
              description={search ? 'Coba kata kunci lain' : 'Riwayat peminjaman akan tampil di sini'}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const st = statusConfig[b.status] ?? statusConfig.pending;
              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {b.borrower_name ?? 'Peminjam tidak diketahui'}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {new Date(b.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${st.classes}`}>
                      {b.current_status_label ?? st.label}
                    </span>
                  </div>

                  {/* Borrower info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                    {b.borrower_name && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <User className="w-4 h-4 text-slate-400" />
                        {b.borrower_name}
                        {b.borrower_class && ` · ${b.borrower_class}`}
                      </div>
                    )}
                    {b.borrow_date && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(b.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {b.return_date && ` → ${new Date(b.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </div>
                    )}
                    {b.start_time && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {b.start_time}{b.end_time && ` - ${b.end_time}`}
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        Barang Dipinjam ({b.borrowing_items.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {b.borrowing_items.map((item) => {
                          const itemSt = statusConfig[item.status] ?? statusConfig.pending;
                          return (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-300"
                            >
                              <Package className="w-3.5 h-3.5 text-slate-400" />
                              {item.item_name}
                              <span className="text-slate-400">×{item.quantity}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${itemSt.classes}`}>
                                {item.current_status_label ?? itemSt.label}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Purpose */}
                  {b.purpose && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Keperluan</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{b.purpose}</p>
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

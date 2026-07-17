import { useEffect, useState, useMemo } from 'react';
import { Search, History, User, Calendar, Package, Building2, Clock, FileText } from 'lucide-react';
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
  borrowed_units: number;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  item_type: string;
  facility_id: string | null;
  purpose: string;
  start_time: string;
  end_time: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Menunggu', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { label: 'Ditolak', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  returned: { label: 'Dikembalikan', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Selesai', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled: { label: 'Dibatalkan', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
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
        b.status?.toLowerCase().includes(q)
    );
  }, [borrowings, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Riwayat Peminjaman</h1>
          <p className="text-slate-500 dark:text-slate-400">Daftar semua peminjaman yang pernah diajukan</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, kelas, email, atau status..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <EmptyState
              icon={History}
              title="Belum ada riwayat peminjaman"
              description={search ? "Coba kata kunci lain" : "Riwayat peminjaman akan muncul di sini"}
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} peminjaman
            </p>
            <div className="space-y-4">
              {filtered.map((b) => {
                const st = statusConfig[b.status] || statusConfig.pending;
                return (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                        </div>
                      </div>
                      <span className={cn('px-3 py-1 rounded-full text-sm font-medium', st.badge)}>
                        {st.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>Pinjam: {formatDate(b.borrow_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>Kembali: {formatDate(b.return_date)}</span>
                      </div>
                      {(b.start_time || b.end_time) && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>{b.start_time || '-'} - {b.end_time || '-'}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span>Diajukan: {formatDateTime(b.created_at)}</span>
                      </div>
                    </div>

                    {b.purpose && (
                      <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          <span className="font-medium">Tujuan: </span>{b.purpose}
                        </p>
                      </div>
                    )}

                    {/* Items */}
                    {b.borrowing_items && b.borrowing_items.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">Item Dipinjam</p>
                        {b.borrowing_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30"
                          >
                            <div className="flex items-center gap-2">
                              {item.item_type === 'fasilitas' ? (
                                <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                              ) : (
                                <Package className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              )}
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {item.item_name || 'Item'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-slate-500 dark:text-slate-400">×{item.quantity}</span>
                              {item.current_status_label && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                                  {item.current_status_label}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {b.item_type === 'fasilitas' ? 'Fasilitas' : 'Barang'} · {b.borrowed_units || 1} unit
                        </span>
                      </div>
                    )}

                    {b.notes && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          <span className="font-medium">Catatan: </span>{b.notes}
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

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

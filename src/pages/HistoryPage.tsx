import { useEffect, useState } from 'react';
import { Search, ClipboardList, User, Calendar, Mail, Phone, Package, Building2, Clock, FileText } from 'lucide-react';
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
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; classes: string; dot: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  approved: { label: 'Disetujui', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500' },
  rejected: { label: 'Ditolak', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
  returned: { label: 'Dikembalikan', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
  completed: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  cancelled: { label: 'Dibatalkan', classes: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
};

function HistorySkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-slate-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

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
      b.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pantau semua peminjaman dan statusnya</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kelas, email, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <HistorySkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Tidak ada riwayat" description={search ? 'Coba kata kunci lain' : 'Belum ada peminjaman yang tercatat'} />
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const st = statusConfig[b.status] || statusConfig.pending;
              const items = b.borrowing_items || [];
              return (
                <div
                  key={b.id}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        {b.item_type === 'fasilitas' ? (
                          <Building2 className="w-6 h-6 text-blue-500" />
                        ) : (
                          <Package className="w-6 h-6 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                      </div>
                    </div>
                    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap', st.classes)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                      {st.label}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{formatDate(b.borrow_date)} → {formatDate(b.return_date)}</span>
                    </div>
                    {(b.start_time || b.end_time) && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{b.start_time || '-'} - {b.end_time || '-'}</span>
                      </div>
                    )}
                    {b.borrower_email && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{b.borrower_email}</span>
                      </div>
                    )}
                    {b.borrower_phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{b.borrower_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Purpose */}
                  {b.purpose && (
                    <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>{b.purpose}</span>
                    </div>
                  )}

                  {/* Items */}
                  {items.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Item Dipinjam ({items.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-700 dark:text-slate-300"
                          >
                            {item.item_type === 'fasilitas' ? <Building2 className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                            <span>{item.item_name || 'Item'}</span>
                            <span className="text-slate-400">×{item.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {b.notes && (
                    <div className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">
                      Catatan: {b.notes}
                    </div>
                  )}

                  {/* Created at */}
                  <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                    Diajukan: {new Date(b.created_at).toLocaleString('id-ID')}
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

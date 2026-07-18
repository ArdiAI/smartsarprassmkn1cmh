import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import {
  Search, ClipboardList, Loader2, User, Calendar, Mail, Phone, Package,
  Building2, Clock, FileText,
} from 'lucide-react';

interface BorrowingItem {
  id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string | null;
  item_name: string | null;
  quantity: number;
  status: string;
  current_status_label: string | null;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  notes: string | null;
  purpose: string | null;
  item_type: string | null;
  start_time: string | null;
  end_time: string | null;
  current_status_label: string | null;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  completed: { label: 'Selesai', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusOptions = ['all', 'pending', 'approved', 'returned', 'rejected', 'completed', 'cancelled'];

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('borrowings')
        .select('*, borrowing_items(*)')
        .order('created_at', { ascending: false });
      if (!error) setBorrowings((data as unknown as Borrowing[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return borrowings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.borrower_name?.toLowerCase().includes(q) ||
          b.borrower_class?.toLowerCase().includes(q) ||
          b.borrower_email?.toLowerCase().includes(q) ||
          b.purpose?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [borrowings, search, statusFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Daftar semua transaksi peminjaman
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kelas, email, atau keperluan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Semua Status' : statusConfig[s]?.label || s}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Tidak ada riwayat peminjaman" description="Belum ada data peminjaman yang sesuai filter" />
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const st = statusConfig[b.status] || statusConfig.pending;
              return (
                <div key={b.id} className="card p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                        {b.current_status_label && b.current_status_label !== st.label && (
                          <span className="text-xs text-slate-400">{b.current_status_label}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                      {b.borrower_class && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                      <p className="text-xs">
                        {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Borrower info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-sm">
                    {b.borrower_email && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Mail className="w-4 h-4 text-slate-400" />
                        {b.borrower_email}
                      </div>
                    )}
                    {b.borrower_phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {b.borrower_phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(b.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' → '}
                      {new Date(b.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {(b.start_time || b.end_time) && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}
                      </div>
                    )}
                  </div>

                  {/* Purpose */}
                  {b.purpose && (
                    <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-600 dark:text-slate-300">{b.purpose}</p>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">ITEM DIPINJAM</p>
                      <div className="flex flex-wrap gap-2">
                        {b.borrowing_items.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
                          >
                            {item.item_type === 'fasilitas' ? (
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <Package className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            {item.item_name || 'Item'}
                            <span className="text-xs text-slate-400">×{item.quantity}</span>
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
        )}
      </main>
      <Footer />
    </div>
  );
}

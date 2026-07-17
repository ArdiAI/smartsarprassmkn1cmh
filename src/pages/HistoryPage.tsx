import { useEffect, useState, useMemo } from 'react';
import { Search, History, Calendar, User, Package } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  item_name: string;
  item_type: string | null;
  quantity: number;
  status: string;
  current_step: number | null;
  current_status_label: string | null;
  workflow_template_id: string | null;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrow_date: string | null;
  return_date: string | null;
  purpose: string | null;
  status: string;
  current_step: number | null;
  current_status_label: string | null;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  returned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  returned: 'Dikembalikan',
};

function HistorySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50">
      <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
      <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
      <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
    </div>
  );
}

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBorrowings = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('borrowings')
        .select('id, borrower_name, borrower_class, borrower_email, borrower_phone, borrow_date, return_date, purpose, status, current_step, current_status_label, created_at, borrowing_items (id, borrowing_id, item_name, item_type, quantity, status, current_step, current_status_label, workflow_template_id)')
        .order('created_at', { ascending: false });
      setBorrowings((data as unknown as Borrowing[]) || []);
      setLoading(false);
    };
    fetchBorrowings();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return borrowings;
    const q = search.toLowerCase();
    return borrowings.filter(
      (b) =>
        b.borrower_name?.toLowerCase().includes(q) ||
        b.borrower_class?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q) ||
        b.borrowing_items?.some((item) => item.item_name?.toLowerCase().includes(q))
    );
  }, [borrowings, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-6 h-6 text-blue-500" />
            <h1 className="text-3xl font-bold">Riwayat Peminjaman</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">Pantau status dan riwayat peminjaman barang.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, kelas, atau barang..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <HistorySkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={History} title="Belum ada riwayat peminjaman" description="Riwayat peminjaman akan muncul di sini." />
        ) : (
          <div className="space-y-4">
            {filtered.map((borrowing, i) => {
              const statusKey = (borrowing.status || '').toLowerCase();
              return (
                <div
                  key={borrowing.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md transition-all animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{borrowing.borrower_name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {borrowing.borrower_class || 'N/A'} &middot; {new Date(borrowing.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium self-start',
                        STATUS_STYLES[statusKey] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      )}
                    >
                      {borrowing.current_status_label || STATUS_LABELS[statusKey] || borrowing.status}
                    </span>
                  </div>

                  {borrowing.purpose && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3">
                      <span className="font-medium">Keperluan:</span> {borrowing.purpose}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-3">
                    {borrowing.borrow_date && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        Pinjam: {new Date(borrowing.borrow_date).toLocaleDateString('id-ID')}
                      </span>
                    )}
                    {borrowing.return_date && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        Kembali: {new Date(borrowing.return_date).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>

                  {/* Items */}
                  {borrowing.borrowing_items && borrowing.borrowing_items.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700/50 pt-3">
                      <p className="text-xs font-medium text-slate-400 mb-2">Barang Dipinjam:</p>
                      <div className="flex flex-wrap gap-2">
                        {borrowing.borrowing_items.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm"
                          >
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                            {item.item_name} &times;{item.quantity}
                          </span>
                        ))}
                      </div>
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

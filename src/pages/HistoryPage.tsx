import { useEffect, useState, useMemo } from 'react';
import { Search, History, Calendar, User, Mail, Package, Clock, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  item_name: string;
  item_type: string;
  quantity: number;
  status: string;
  current_step: number;
  current_status_label: string | null;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_email: string | null;
  borrower_class: string | null;
  borrow_date: string;
  return_date: string;
  status: string;
  purpose: string | null;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  returned: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
  return <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium', cfg.color)}>{cfg.label}</span>;
}

function BorrowingCard({ borrowing }: { borrowing: Borrowing }) {
  return (
    <div className="card p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 dark:text-white">{borrowing.borrower_name}</h3>
            <StatusBadge status={borrowing.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
            {borrowing.borrower_class && (
              <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {borrowing.borrower_class}</span>
            )}
            {borrowing.borrower_email && (
              <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {borrowing.borrower_email}</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-blue-500" />
          Pinjam: {new Date(borrowing.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-cyan-500" />
          Kembali: {new Date(borrowing.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          {new Date(borrowing.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {borrowing.purpose && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{borrowing.purpose}</p>
      )}

      {/* Items */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Item Dipinjam</p>
        <div className="space-y-2">
          {borrowing.borrowing_items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 truncate">{item.item_name}</span>
                <span className="text-xs text-slate-400">×{item.quantity}</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                {item.current_status_label ?? item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="w-1/3 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
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
          .select('id, borrower_name, borrower_email, borrower_class, borrow_date, return_date, status, purpose, created_at, borrowing_items(id, borrowing_id, item_name, item_type, quantity, status, current_step, current_status_label)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBorrowings((data ?? []) as unknown as Borrowing[]);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () => borrowings.filter(b =>
      b.borrower_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.borrower_email ?? '').toLowerCase().includes(search.toLowerCase()),
    ),
    [borrowings, search],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Daftar semua peminjaman</p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama atau email..."
            className="input pl-10"
          />
        </div>

        {/* List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState icon={History} title="Belum ada riwayat" description={search ? 'Coba kata kunci lain.' : 'Belum ada peminjaman tercatat.'} />
          ) : (
            filtered.map(b => <BorrowingCard key={b.id} borrowing={b} />)
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

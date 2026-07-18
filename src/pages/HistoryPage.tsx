import { useEffect, useMemo, useState } from 'react';
import {
  History, Search, Loader2, Calendar, User, Mail, Package, Building2, Clock, FileText,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

type BorrowingStatus = 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string;
  item_name: string;
  quantity: number;
  status: string;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  borrower_email: string;
  borrower_phone: string | null;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: BorrowingStatus;
  notes: string | null;
  purpose: string | null;
  item_type: string | null;
  start_time: string | null;
  end_time: string | null;
  current_status_label: string | null;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<BorrowingStatus, { label: string; classes: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  rejected: { label: 'Ditolak', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  returned: { label: 'Dikembalikan', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  cancelled: { label: 'Dibatalkan', classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300' },
};

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('borrowings')
          .select('*, borrowing_items(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBorrowings((data as unknown as Borrowing[]) ?? []);
      } catch (e) {
        console.error('Failed to fetch borrowings:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return borrowings;
    return borrowings.filter(
      (b) =>
        b.borrower_name.toLowerCase().includes(q) ||
        b.borrower_class.toLowerCase().includes(q) ||
        b.borrower_email.toLowerCase().includes(q) ||
        (b.purpose || '').toLowerCase().includes(q),
    );
  }, [borrowings, search]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-6 h-6 text-blue-500" /> Riwayat Peminjaman
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Daftar seluruh pengajuan peminjaman.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kelas, atau tujuan..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse">
                <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <EmptyState icon={History} title="Belum ada riwayat" description="Peminjaman akan muncul di sini." />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const cfg = statusConfig[b.status] ?? statusConfig.pending;
              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.classes)}>
                          {cfg.label}
                        </span>
                        {b.current_status_label && (
                          <span className="text-xs text-slate-400">• {b.current_status_label}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{b.borrower_class}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(b.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-400" /> {b.borrower_email}
                    </div>
                    {b.borrower_phone && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-cyan-400" /> {b.borrower_phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" /> {formatDate(b.borrow_date)} → {formatDate(b.return_date)}
                    </div>
                    {(b.start_time || b.end_time) && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" /> {b.start_time || '-'} - {b.end_time || '-'}
                      </div>
                    )}
                  </div>

                  {b.purpose && (
                    <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-600 dark:text-slate-300">{b.purpose}</p>
                      </div>
                    </div>
                  )}

                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Item Dipinjam</p>
                      {b.borrowing_items.map((bi) => (
                        <div
                          key={bi.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {bi.item_type === 'fasilitas' ? (
                              <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                            ) : (
                              <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            )}
                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{bi.item_name}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {bi.quantity} unit
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {b.notes && (
                    <p className="mt-3 text-xs text-slate-400 italic">Catatan: {b.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

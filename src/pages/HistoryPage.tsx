import { useEffect, useState, useMemo } from 'react';
import {
  History,
  Search,
  Loader2,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Package,
  Building2,
  FileText,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
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
  current_status_label: string | null;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrow_date: string;
  return_date: string | null;
  start_time: string | null;
  end_time: string | null;
  purpose: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  item_type: string | null;
  current_status_label: string | null;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { badge: string; label: string }> = {
  pending: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Menunggu' },
  approved: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Disetujui' },
  returned: { badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', label: 'Dikembalikan' },
  rejected: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Ditolak' },
  completed: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Selesai' },
  cancelled: { badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', label: 'Dibatalkan' },
};

const statusOptions = ['pending', 'approved', 'returned', 'rejected', 'completed', 'cancelled'];

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('borrowings')
          .select('*, borrowing_items(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBorrowings((data as unknown as Borrowing[]) ?? []);
      } catch {
        showToast('Gagal memuat riwayat peminjaman', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return borrowings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.borrower_name.toLowerCase().includes(q) ||
          (b.borrower_class ?? '').toLowerCase().includes(q) ||
          (b.purpose ?? '').toLowerCase().includes(q) ||
          b.borrowing_items?.some((it) => it.item_name?.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [borrowings, search, statusFilter]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="relative mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <History className="h-7 w-7 text-brand-600" />
            Riwayat Peminjaman
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Daftar semua pengajuan peminjaman barang dan fasilitas.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Cari nama, kelas, keperluan, item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {statusConfig[s]?.label ?? s}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<History className="h-8 w-8 text-slate-400" />}
            title="Tidak ada riwayat"
            description="Belum ada pengajuan peminjaman."
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const sc = statusConfig[b.status] ?? statusConfig.pending;
              return (
                <div key={b.id} className="card">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', sc.badge)}>
                          {sc.label}
                        </span>
                      </div>
                      {b.borrower_class && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{formatDate(b.created_at)}</p>
                  </div>

                  {/* Info Grid */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-brand-500" />
                        Pinjam: <span className="font-medium">{formatDate(b.borrow_date)}</span>
                        {b.return_date && <> · Kembali: <span className="font-medium">{formatDate(b.return_date)}</span></>}
                      </div>
                      {(b.start_time || b.end_time) && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-brand-500" />
                          {b.start_time ?? ''}{b.start_time && b.end_time ? ' - ' : ''}{b.end_time ?? ''}
                        </div>
                      )}
                      {b.purpose && (
                        <div className="flex items-start gap-1.5">
                          <FileText className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{b.purpose}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                      {b.borrower_email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4 text-brand-500" />
                          <span className="truncate">{b.borrower_email}</span>
                        </div>
                      )}
                      {b.borrower_phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-brand-500" />
                          {b.borrower_phone}
                        </div>
                      )}
                      {b.current_status_label && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-400">Status:</span>
                          <span className="text-xs font-semibold">{b.current_status_label}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <p className="mb-2 text-xs font-semibold text-slate-400">Item Dipinjam:</p>
                      <div className="flex flex-wrap gap-2">
                        {b.borrowing_items.map((it) => (
                          <span
                            key={it.id}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                          >
                            {it.item_type === 'fasilitas' ? (
                              <Building2 className="h-3.5 w-3.5 text-brand-500" />
                            ) : (
                              <Package className="h-3.5 w-3.5 text-brand-500" />
                            )}
                            <span className="font-medium text-slate-700 dark:text-slate-200">{it.item_name}</span>
                            <span className="text-slate-400">×{it.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {b.notes && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
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

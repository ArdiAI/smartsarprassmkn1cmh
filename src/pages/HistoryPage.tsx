import { useEffect, useState, useMemo } from 'react';
import {
  History,
  Search,
  Loader2,
  User,
  Mail,
  Calendar,
  Clock,
  Package,
  Building2,
  FileText,
  MapPin,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
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
  borrower_class: string;
  borrower_email: string;
  borrower_phone: string | null;
  borrow_date: string;
  return_date: string;
  start_time: string | null;
  end_time: string | null;
  purpose: string;
  notes: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  current_status_label: string | null;
  item_type: string;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Menunggu', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  approved: { label: 'Disetujui', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  returned: { label: 'Dikembalikan', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300' },
  rejected: { label: 'Ditolak', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  completed: { label: 'Selesai', badge: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' },
  cancelled: { label: 'Dibatalkan', badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

const statusFilters = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'returned', label: 'Dikembalikan' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

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

        if (error) {
          showToast('Gagal memuat riwayat peminjaman', 'error');
          return;
        }
        setBorrowings((data as unknown as Borrowing[]) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return borrowings.filter((b) => {
      const matchesSearch =
        !q ||
        b.borrower_name?.toLowerCase().includes(q) ||
        b.borrower_class?.toLowerCase().includes(q) ||
        b.borrower_email?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [borrowings, search, statusFilter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
          <History className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          Riwayat Peminjaman
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Daftar semua pengajuan peminjaman barang dan fasilitas.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, kelas, email, atau keperluan..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {statusFilters.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada riwayat"
          description={search || statusFilter !== 'all' ? 'Tidak ada hasil untuk filter Anda.' : 'Belum ada peminjaman yang tercatat.'}
          icon={<History className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const status = statusConfig[b.status] ?? statusConfig.pending;
            return (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Top row: status + date */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', status.badge)}>
                      {b.current_status_label ?? status.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    {b.item_type === 'fasilitas' ? <Building2 className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                    {b.item_type === 'fasilitas' ? 'Fasilitas' : 'Barang'}
                  </span>
                </div>

                {/* Borrower info */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 flex-shrink-0 text-brand-500" />
                    <div>
                      <p className="text-xs text-slate-400">Peminjam</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{b.borrower_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
 <Mail className="h-4 w-4 flex-shrink-0 text-brand-500" />
                    <div className="overflow-hidden">
                      <p className="text-xs text-slate-400">Kelas/Unit</p>
                      <p className="truncate font-medium text-slate-800 dark:text-slate-200">{b.borrower_class}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 flex-shrink-0 text-brand-500" />
                    <div>
                      <p className="text-xs text-slate-400">Pinjam - Kembali</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {b.borrow_date} → {b.return_date}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Purpose */}
                {b.purpose && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
                    <div>
                      <p className="text-xs text-slate-400">Keperluan</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{b.purpose}</p>
                    </div>
                  </div>
                )}

                {/* Time */}
                {(b.start_time || b.end_time) && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {b.start_time ?? '—'} - {b.end_time ?? '—'}
                  </div>
                )}

                {/* Items */}
                {b.borrowing_items && b.borrowing_items.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-400">
                      Item ({b.borrowing_items.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {b.borrowing_items.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800/50"
                        >
                          {item.item_type === 'fasilitas' ? (
                            <Building2 className="h-3 w-3 text-brand-500" />
                          ) : (
                            <Package className="h-3 w-3 text-brand-500" />
                          )}
                          <span className="font-medium text-slate-700 dark:text-slate-300">{item.item_name}</span>
                          <span className="text-slate-400">×{item.quantity}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {b.notes && (
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Catatan:</span> {b.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="mt-6 text-center text-sm text-slate-400">
          Menampilkan {filtered.length} riwayat
        </p>
      )}
    </div>
  );
}

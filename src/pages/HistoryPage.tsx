import { useEffect, useState, useMemo } from 'react';
import { History, Search, Loader2, Calendar, Clock, User, Mail, Phone, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { cn } from '../utils/cn';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string | null;
  item_name: string | null;
  quantity: number | null;
  status: string | null;
  current_status_label: string | null;
}

interface Borrowing {
  id: string;
  borrower_name: string | null;
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrow_date: string | null;
  return_date: string | null;
  actual_return_date: string | null;
  start_time: string | null;
  end_time: string | null;
  purpose: string | null;
  notes: string | null;
  status: string;
  current_status_label: string | null;
  item_type: string | null;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  returned: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const STATUS_FILTERS = [
  { value: 'all', label: 'Semua Status' },
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
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('borrowings')
          .select('*, borrowing_items(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBorrowings((data as unknown as Borrowing[]) ?? []);
      } catch {
        setBorrowings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return borrowings.filter((b) => {
      const matchSearch =
        !q ||
        (b.borrower_name ?? '').toLowerCase().includes(q) ||
        (b.borrower_class ?? '').toLowerCase().includes(q) ||
        (b.purpose ?? '').toLowerCase().includes(q) ||
        (b.borrowing_items ?? []).some((it) => (it.item_name ?? '').toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [borrowings, search, statusFilter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <History className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Daftar semua pengajuan peminjaman barang dan fasilitas.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari nama, kelas, keperluan, atau item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="mb-3 h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mb-2 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada riwayat"
          description="Belum ada peminjaman yang sesuai dengan filter."
          icon={<History className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <div key={b.id} className="card">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {b.borrower_name ?? 'Peminjam'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {b.borrower_class ?? '-'}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    statusStyles[b.status] ?? statusStyles.pending,
                  )}
                >
                  {b.current_status_label ?? statusLabels[b.status] ?? b.status}
                </span>
              </div>

              <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                {b.borrow_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">Pinjam:</span>
                    <span className="font-medium">{b.borrow_date}</span>
                    {b.start_time && <span className="text-slate-400">({b.start_time})</span>}
                  </div>
                )}
                {b.return_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">Kembali:</span>
                    <span className="font-medium">{b.return_date}</span>
                    {b.end_time && <span className="text-slate-400">({b.end_time})</span>}
                  </div>
                )}
                {b.actual_return_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <span className="text-slate-500 dark:text-slate-400">Dikembalikan:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{b.actual_return_date}</span>
                  </div>
                )}
                {b.borrower_email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{b.borrower_email}</span>
                  </div>
                )}
                {b.borrower_phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{b.borrower_phone}</span>
                  </div>
                )}
              </div>

              {b.purpose && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                  <span className="font-medium">Keperluan: </span>{b.purpose}
                </div>
              )}

              {/* Items */}
              {b.borrowing_items && b.borrowing_items.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                    <Package className="h-3.5 w-3.5" />
                    Item Dipinjam
                  </p>
                  <ul className="space-y-1.5">
                    {b.borrowing_items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-xs font-medium',
                              it.item_type === 'fasilitas'
                                ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                            )}
                          >
                            {it.item_type === 'fasilitas' ? 'Fasilitas' : 'Barang'}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {it.item_name ?? 'Item'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            x{it.quantity ?? 1}
                          </span>
                          {it.current_status_label && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {it.current_status_label}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {b.notes && (
                <p className="mt-3 text-xs text-slate-400">
                  <span className="font-medium">Catatan: </span>{b.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

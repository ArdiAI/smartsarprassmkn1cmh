import { useEffect, useState, useMemo } from 'react';
import { Search, History, Loader2, Calendar, User, Mail, Phone, Package, Clock, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
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
  return_date: string;
  start_time: string | null;
  end_time: string | null;
  purpose: string | null;
  notes: string | null;
  status: string;
  item_type: string | null;
  current_status_label: string | null;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusStyles: Record<string, { badge: string; label: string }> = {
  pending: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Menunggu' },
  approved: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Disetujui' },
  returned: { badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', label: 'Dikembalikan' },
  rejected: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Ditolak' },
  completed: { badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300', label: 'Selesai' },
  cancelled: { badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', label: 'Dibatalkan' },
};

const STATUS_OPTIONS = [
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
      } catch (err: any) {
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
        if (
          !b.borrower_name.toLowerCase().includes(q) &&
          !(b.borrower_class ?? '').toLowerCase().includes(q) &&
          !(b.borrower_email ?? '').toLowerCase().includes(q) &&
          !(b.purpose ?? '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [borrowings, search, statusFilter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Daftar semua pengajuan peminjaman beserta status terkini.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari nama, kelas, atau keperluan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="mb-3 h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mb-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada riwayat"
          description="Belum ada pengajuan peminjaman yang cocok."
          icon={<History className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const st = statusStyles[b.status] ?? statusStyles.pending;
            return (
              <div key={b.id} className="card">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                    {b.borrower_class && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                    )}
                  </div>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-medium', st.badge)}>
                    {b.current_status_label ?? st.label}
                  </span>
                </div>

                <div className="grid gap-2 text-sm text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {b.borrow_date} → {b.return_date}
                  </div>
                  {(b.start_time || b.end_time) && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {b.start_time ?? '--:--'} - {b.end_time ?? '--:--'}
                    </div>
                  )}
                  {b.borrower_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {b.borrower_email}
                    </div>
                  )}
                  {b.borrower_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {b.borrower_phone}
                    </div>
                  )}
                </div>

                {b.purpose && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/50">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-300">{b.purpose}</span>
                  </div>
                )}

                {/* Items */}
                {b.borrowing_items && b.borrowing_items.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <Package className="h-3.5 w-3.5" />
                      Item Dipinjam
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {b.borrowing_items.map((it) => (
                        <span
                          key={it.id}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {it.item_name} × {it.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {b.notes && (
                  <p className="mt-2 text-xs text-slate-400">Catatan: {b.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { Search, History, Package, Calendar, User, Mail, Phone, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

interface BorrowingItem {
  id: string;
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
  borrower_class: string | null;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrow_date: string;
  return_date: string | null;
  start_time: string | null;
  end_time: string | null;
  purpose: string | null;
  notes: string | null;
  status: string;
  item_type: string;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  returned: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  completed: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

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
          .select('id, borrower_name, borrower_class, borrower_email, borrower_phone, borrow_date, return_date, start_time, end_time, purpose, notes, status, item_type, created_at, borrowing_items(*)')
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
    const q = search.toLowerCase().trim();
    return borrowings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.borrower_name.toLowerCase().includes(q) ||
        (b.borrower_class ?? '').toLowerCase().includes(q) ||
        (b.purpose ?? '').toLowerCase().includes(q) ||
        b.borrowing_items.some((it) => it.item_name.toLowerCase().includes(q))
      );
    });
  }, [borrowings, search, statusFilter]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Semua pengajuan peminjaman barang dan fasilitas.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Cari nama, kelas, keperluan, atau item..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Disetujui</option>
          <option value="returned">Dikembalikan</option>
          <option value="rejected">Ditolak</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Tidak ada riwayat" description="Belum ada peminjaman yang cocok." icon={<History className="h-8 w-8 text-slate-400" />} />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <div key={b.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', statusStyles[b.status] ?? statusStyles.pending)}>
                      {statusLabel[b.status] ?? b.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{b.borrower_class}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4 shrink-0 text-slate-400" />{b.borrow_date}{b.return_date ? ` → ${b.return_date}` : ''}</div>
                {(b.start_time || b.end_time) && (
                  <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 shrink-0 text-slate-400" />{b.start_time}{b.end_time ? ` - ${b.end_time}` : ''}</div>
                )}
                {b.borrower_email && <div className="flex items-center gap-1.5"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{b.borrower_email}</span></div>}
                {b.borrower_phone && <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 shrink-0 text-slate-400" />{b.borrower_phone}</div>}
              </div>

              {b.purpose && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Keperluan:</span> {b.purpose}</p>
              )}

              {b.borrowing_items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.borrowing_items.map((it) => (
                    <span key={it.id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Package className="h-3.5 w-3.5" />
                      {it.item_name} ×{it.quantity}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { History, Search, Loader2, User, Calendar, Clock, Package, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string | null;
  item_name: string | null;
  quantity: number;
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
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled' | null;
  notes: string | null;
  purpose: string | null;
  item_type: string | null;
  created_at: string;
  current_status_label: string | null;
  borrowing_items: BorrowingItem[] | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  returned: { label: 'Dikembalikan', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  completed: { label: 'Selesai', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300' },
};

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

  const filtered = borrowings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.borrower_name?.toLowerCase().includes(q) ||
        b.borrower_class?.toLowerCase().includes(q) ||
        b.borrower_email?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q) ||
        b.borrowing_items?.some(it => it.item_name?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const statuses = ['all', 'pending', 'approved', 'returned', 'rejected', 'completed', 'cancelled'];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Riwayat Peminjaman</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar seluruh riwayat peminjaman sarana dan prasarana</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kelas, atau barang..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'Semua Status' : statusConfig[s]?.label || s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={History} title="Tidak ada riwayat peminjaman" description="Riwayat peminjaman akan tampil di sini." />
        ) : (
          <div className="space-y-4">
            {filtered.map(b => {
              const st = b.status ? statusConfig[b.status] : null;
              return (
                <div key={b.id} className="card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{b.borrower_name || 'Tanpa Nama'}</h3>
                        {st && (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{b.borrower_class || '-'}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />
                          {b.borrow_date ? new Date(b.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          {' → '}
                          {b.return_date ? new Date(b.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                        {b.actual_return_date && (
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <Clock className="w-4 h-4" /> Dikembalikan: {new Date(b.actual_return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>

                  {b.purpose && <p className="text-sm text-slate-600 dark:text-slate-300 mb-3"><span className="font-medium">Keperluan:</span> {b.purpose}</p>}

                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Item Dipinjam</p>
                      <div className="flex flex-wrap gap-2">
                        {b.borrowing_items.map(it => {
                          const Icon = it.item_type === 'fasilitas' ? Building2 : Package;
                          const itemStatus = it.status && statusConfig[it.status] ? statusConfig[it.status] : null;
                          return (
                            <span key={it.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-700 dark:text-slate-200">
                              <Icon className="w-3.5 h-3.5 text-slate-400" />
                              {it.item_name || 'Item'} ({it.quantity})
                              {itemStatus && <span className={`px-1.5 py-0.5 rounded-full ${itemStatus.color} text-[10px]`}>{itemStatus.label}</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {b.notes && <p className="text-xs text-slate-400 mt-2"><span className="font-medium">Catatan:</span> {b.notes}</p>}
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

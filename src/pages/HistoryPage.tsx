import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import {
  Clock, Search, Loader2, Calendar, User, Package, Mail, Phone,
  FileText, CheckCircle, XCircle,
} from 'lucide-react';

interface BorrowingItem {
  id: string;
  borrowing_id: string;
  inventory_id: string | null;
  facility_id: string | null;
  item_type: string;
  item_name: string | null;
  quantity: number;
  status: string;
  current_status_label: string | null;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  borrow_date: string;
  return_date: string;
  actual_return_date: string | null;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  borrower_email: string | null;
  borrower_phone: string | null;
  item_type: string | null;
  facility_id: string | null;
  purpose: string | null;
  start_time: string | null;
  end_time: string | null;
  current_status_label: string | null;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
  returned: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Package },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300', icon: XCircle },
};

export default function HistoryPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('borrowings')
          .select('*, borrowing_items(*)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBorrowings((data as unknown as Borrowing[]) || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = borrowings.filter(b => {
    const matchSearch = !search ||
      b.borrower_name.toLowerCase().includes(search.toLowerCase()) ||
      b.borrower_class?.toLowerCase().includes(search.toLowerCase()) ||
      b.purpose?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-500" /> Riwayat Peminjaman
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar riwayat peminjaman sarana dan prasarana</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama, kelas, atau keperluan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="sm:w-48 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          >
            <option value="">Semua Status</option>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Tidak ada riwayat peminjaman"
            description={search || statusFilter ? 'Coba filter lain' : 'Belum ada peminjaman yang tercatat'}
          />
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Menampilkan {filtered.length} riwayat
            </p>
            <div className="space-y-4">
              {filtered.map(borrowing => {
                const sc = statusConfig[borrowing.status] || statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div key={borrowing.id} className="card p-5 hover:shadow-md transition-shadow">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{borrowing.borrower_name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{borrowing.borrower_class}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 flex-shrink-0 ${sc.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {borrowing.current_status_label || sc.label}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Tanggal Pinjam</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          {borrowing.borrow_date}
                          {borrowing.start_time && <span className="text-slate-400">· {borrowing.start_time}</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Tanggal Kembali</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-cyan-500" />
                          {borrowing.return_date}
                          {borrowing.end_time && <span className="text-slate-400">· {borrowing.end_time}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Items */}
                    {borrowing.borrowing_items && borrowing.borrowing_items.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" /> Item Dipinjam
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {borrowing.borrowing_items.map(item => (
                            <span key={item.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                              {item.item_type === 'fasilitas' ? '🏢' : '📦'}
                              {item.item_name || 'Item'} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Purpose */}
                    {borrowing.purpose && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Keperluan
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{borrowing.purpose}</p>
                      </div>
                    )}

                    {/* Contact info */}
                    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
                      {borrowing.borrower_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {borrowing.borrower_email}
                        </span>
                      )}
                      {borrowing.borrower_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {borrowing.borrower_phone}
                        </span>
                      )}
                      <span className="ml-auto">
                        {new Date(borrowing.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

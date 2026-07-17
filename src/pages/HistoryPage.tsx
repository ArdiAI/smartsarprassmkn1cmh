import { useState } from 'react';
import {
  Search, Mail, Loader2, Calendar, Package, Building2,
  Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface BorrowingItem {
  id: string;
  item_name: string;
  item_type: string;
  quantity: number;
  status: string;
  current_status_label: string;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_class: string;
  item_type: string;
  borrowed_units: number;
  borrow_date: string;
  return_date: string | null;
  status: string;
  purpose: string;
  created_at: string;
  borrowing_items: BorrowingItem[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Menunggu' },
  approved: { icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Disetujui' },
  rejected: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Ditolak' },
  returned: { icon: CheckCircle2, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Dikembalikan' },
  active: { icon: AlertCircle, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', label: 'Aktif' },
};

export default function HistoryPage() {
  const [email, setEmail] = useState('');
  const [results, setResults] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from('borrowings')
      .select('id, borrower_name, borrower_class, item_type, borrowed_units, borrow_date, return_date, status, purpose, created_at, borrowing_items(id, item_name, item_type, quantity, status, current_status_label)')
      .eq('borrower_email', email.trim())
      .order('created_at', { ascending: false });
    setResults((data as any) || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Riwayat Peminjaman</h1>
          <p className="text-slate-500 dark:text-slate-400">Cari riwayat peminjaman berdasarkan email</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="email"
              placeholder="Masukkan email Anda..."
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" disabled={loading || !email.trim()} className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Cari
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : !searched ? (
          <EmptyState title="Cari Riwayat" message="Masukkan email untuk melihat riwayat peminjaman" />
        ) : results.length === 0 ? (
          <EmptyState title="Tidak ada riwayat" message="Tidak ditemukan peminjaman untuk email tersebut" />
        ) : (
          <div className="space-y-4">
            {results.map(b => {
              const cfg = statusConfig[b.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{b.borrower_name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{b.borrower_class || '-'}</p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', cfg.color)}>
                      <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                    </span>
                  </div>

                  {b.purpose && <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{b.purpose}</p>}

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(b.borrow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {b.return_date && (
                      <div className="flex items-center gap-1.5">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        {new Date(b.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>

                  {b.borrowing_items && b.borrowing_items.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
                      {b.borrowing_items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          {item.item_type === 'ruangan' ? (
                            <Building2 className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Package className="w-4 h-4 text-cyan-500" />
                          )}
                          <span className="text-slate-700 dark:text-slate-300">{item.item_name}</span>
                          <span className="text-slate-400">×{item.quantity}</span>
                          {item.current_status_label && (
                            <span className="text-xs text-slate-400 ml-auto">{item.current_status_label}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

import { useState } from 'react';
import { Search, Mail, ClipboardList, Calendar, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';

interface BorrowingItem {
  id: string;
  quantity: number;
  inventory: { name: string } | null;
}

interface Borrowing {
  id: string;
  borrower_name: string;
  borrower_email: string;
  status: string;
  start_date: string;
  end_date: string;
  borrowing_items: BorrowingItem[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  returned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
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
      .select('id, borrower_name, borrower_email, status, start_date, end_date, borrowing_items(id, quantity, inventory(name))')
      .eq('borrower_email', email.trim())
      .order('start_date', { ascending: false });
    setResults((data as unknown as Borrowing[]) || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Riwayat Peminjaman</h1>
          <p className="text-sm text-slate-500">Cari riwayat peminjaman berdasarkan email.</p>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full pl-10 pr-28 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={loading} className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Search className="w-4 h-4" /> Cari</>}
            </button>
          </div>
        </form>

        {searched && !loading && results.length === 0 ? (
          <EmptyState title="Tidak ada riwayat" message="Tidak ditemukan peminjaman untuk email tersebut." />
        ) : (
          <div className="space-y-4">
            {results.map(b => (
              <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{b.borrower_name}</p>
                      <p className="text-xs text-slate-500">{b.borrower_email}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || 'bg-slate-100 text-slate-600'}`}>
                    {b.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(b.start_date).toLocaleDateString('id-ID')} → {new Date(b.end_date).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                  <p className="text-xs font-medium text-slate-400 uppercase mb-2">Item Dipinjam</p>
                  <div className="space-y-1.5">
                    {b.borrowing_items?.map((bi, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{bi.inventory?.name || 'Item tidak ditemukan'}</span>
                        <span className="text-slate-500">×{bi.quantity}</span>
                      </div>
                    ))}
                    {(!b.borrowing_items || b.borrowing_items.length === 0) && <p className="text-sm text-slate-400">Tidak ada item</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

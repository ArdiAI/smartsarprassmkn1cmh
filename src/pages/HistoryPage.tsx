import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Search, Package, Building2, Calendar, FileText, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Borrowing, BORROWING_STATUS_LABELS, BORROWING_STATUS_COLORS } from '../types';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';

export default function HistoryPage() {
  const [email, setEmail] = useState('');
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);
    setSearchError('');

    const { data, error } = await supabase
      .from('borrowings')
      .select('*, inventory(name, code), facilities(name)')
      .eq('borrower_email', email.trim().toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('History search error:', error);
      setSearchError(`Gagal mencari: ${error.message}`);
    }
    if (data) setBorrowings(data as Borrowing[]);
    setLoading(false);
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

  const grouped = {
    active: borrowings.filter(b => b.status === 'approved' || b.status === 'pending'),
    past: borrowings.filter(b => b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled'),
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <section className="pt-24 pb-8 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">Riwayat Peminjaman Saya</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-slate-600 dark:text-slate-400">Masukkan email untuk melihat riwayat peminjaman Anda</motion.p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6 mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" placeholder="Masukkan email yang digunakan saat mengajukan peminjaman..." value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white" />
              </div>
              <button onClick={handleSearch} disabled={loading || !email.trim()}
                className={cn('px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2',
                  loading || !email.trim() ? 'bg-slate-200 dark:bg-slate-700 text-slate-400' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                )}>
                <Search className="w-4 h-4" /> Cari
              </button>
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {searchError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">{searchError}</motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!loading && searched && borrowings.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-12 text-center">
              <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Tidak Ditemukan</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada riwayat peminjaman untuk email "{email}"</p>
            </div>
          )}

          {!loading && borrowings.length > 0 && (
            <div className="space-y-6">
              {grouped.active.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 px-1">Peminjaman Aktif ({grouped.active.length})</h2>
                  <div className="space-y-3">
                    {grouped.active.map(b => <BorrowingCard key={b.id} borrowing={b} expanded={expandedId === b.id} onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)} formatDate={formatDate} />)}
                  </div>
                </div>
              )}
              {grouped.past.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 px-1">Riwayat Sebelumnya ({grouped.past.length})</h2>
                  <div className="space-y-3">
                    {grouped.past.map(b => <BorrowingCard key={b.id} borrowing={b} expanded={expandedId === b.id} onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)} formatDate={formatDate} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function BorrowingCard({ borrowing: b, expanded, onToggle, formatDate }: { borrowing: Borrowing; expanded: boolean; onToggle: () => void; formatDate: (d: string) => string }) {
  const itemName = b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name;
  return (
    <motion.div layout className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
      <div className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
              b.item_type === 'ruangan' ? 'bg-cyan-100 dark:bg-cyan-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
            )}>
              {b.item_type === 'ruangan' ? <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> : <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-white">{itemName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <Calendar className="w-3 h-3" />
                {formatDate(b.borrow_date)} {(b.start_time || '08:00').slice(0, 5)} - {b.return_date ? formatDate(b.return_date) : '-'} {(b.end_time || '16:00').slice(0, 5)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', BORROWING_STATUS_COLORS[b.status])}>
              {BORROWING_STATUS_LABELS[b.status]}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-slate-700/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1"><FileText className="w-3 h-3" /> Keperluan</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{b.purpose || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1"><MessageSquare className="w-3 h-3" /> Catatan Admin</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{b.admin_notes || 'Belum ada catatan'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Kelas/Unit</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{b.borrower_class}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Catatan Peminjam</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{b.notes || '-'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

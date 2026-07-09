import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Filter, ChevronLeft, ChevronRight, Building2, Package, Clock, CheckCircle2, Search } from 'lucide-react';
import { Borrowing, BORROWING_STATUS_LABELS, BORROWING_STATUS_COLORS } from '../types';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function RekapPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'barang' | 'ruangan'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    supabase
      .from('borrowings')
      .select('*, inventory(name, code), facilities(name)')
      .order('borrow_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Fetch rekap error:', error);
        if (data) setBorrowings(data as Borrowing[]);
        setLoading(false);
      });
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month]);

  const getBorrowingsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredBorrowings.filter(b => dateStr >= b.borrow_date && dateStr <= (b.return_date || b.borrow_date));
  };

  const filteredBorrowings = useMemo(() => {
    return borrowings.filter(b => {
      if (filterType !== 'all' && b.item_type !== filterType) return false;
      if (filterStatus !== 'all' && b.status !== filterStatus) return false;
      if (filterDate) {
        const d = filterDate;
        if (d < b.borrow_date || d > (b.return_date || b.borrow_date)) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const itemName = b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name;
        if (!itemName?.toLowerCase().includes(q) && !b.borrower_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [borrowings, filterType, filterStatus, filterDate, searchQuery]);

  const occupiedDates = useMemo(() => {
    const dates = new Set<string>();
    filteredBorrowings
      .filter(b => b.status === 'approved' || b.status === 'completed')
      .forEach(b => {
        const start = new Date(b.borrow_date);
        const end = new Date(b.return_date || b.borrow_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.add(d.toISOString().split('T')[0]);
        }
      });
    return dates;
  }, [filteredBorrowings]);

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const stats = useMemo(() => {
    const approved = borrowings.filter(b => b.status === 'approved');
    const today = new Date().toISOString().split('T')[0];
    const inUse = approved.filter(b => today >= b.borrow_date && today <= (b.return_date || b.borrow_date));
    return { total: borrowings.length, approved: approved.length, inUse: inUse.length, availableDays: 30 - occupiedDates.size };
  }, [borrowings, occupiedDates]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <section className="pt-24 pb-8 bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">Rekap Peminjaman</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-slate-600 dark:text-slate-400">Lihat jadwal peminjaman dan ketersediaan sarana prasarana</motion.p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Pengajuan', value: stats.total, icon: CalendarIcon, color: 'blue' },
              { label: 'Disetujui', value: stats.approved, icon: CheckCircle2, color: 'green' },
              { label: 'Sedang Digunakan', value: stats.inUse, icon: Clock, color: 'orange' },
              { label: 'Tanggal Tersedia', value: stats.availableDays, icon: ChevronRight, color: 'cyan' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
                    s.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                    s.color === 'green' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    s.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                    'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600'
                  )}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Cari barang/ruangan..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
              <option value="all">Semua Jenis</option>
              <option value="barang">Barang</option>
              <option value="ruangan">Ruangan</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu Persetujuan</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              placeholder="Filter tanggal"
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300" />
            <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
              {[
                { mode: 'calendar' as const, label: 'Kalender' },
                { mode: 'list' as const, label: 'Daftar' },
              ].map(v => (
                <button key={v.mode} onClick={() => setViewMode(v.mode)}
                  className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    viewMode === v.mode ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}>{v.label}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 space-y-4 animate-pulse">
              <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="grid grid-cols-7 gap-2">{[...Array(35)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />)}</div>
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{MONTHS[month]} {year}</h2>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
              </div>
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                {DAYS.map(day => (
                  <div key={day} className="p-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="min-h-[80px] lg:min-h-[100px] p-1 border-b border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30" />;
                  }
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayBorrowings = getBorrowingsForDay(day);
                  const isOccupied = occupiedDates.has(dateStr);
                  const today = isToday(day);
                  return (
                    <div key={day} onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
                      className={cn('min-h-[80px] lg:min-h-[100px] p-1.5 border-b border-r border-slate-100 dark:border-slate-700/50 cursor-pointer transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10',
                        today && 'bg-blue-50/50 dark:bg-blue-900/10',
                        isOccupied && !today && 'bg-orange-50/30 dark:bg-orange-900/5',
                        selectedDay === dateStr && 'bg-blue-100/50 dark:bg-blue-900/20 ring-1 ring-blue-300 dark:ring-blue-600'
                      )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                          today ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-400'
                        )}>{day}</span>
                        {isOccupied && <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayBorrowings.slice(0, 2).map(b => (
                          <div key={b.id} className={cn('text-[10px] leading-tight px-1 py-0.5 rounded truncate',
                            b.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            b.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            b.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          )}>
                            {(b.start_time || '').slice(0, 5)} {b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name}
                          </div>
                        ))}
                        {dayBorrowings.length > 2 && <div className="text-[10px] text-slate-400 pl-1">+{dayBorrowings.length - 2} lainnya</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Day Detail */}
              <AnimatePresence>
                {selectedDay && (() => {
                  const day = parseInt(selectedDay.split('-')[2]);
                  const dayBorrows = getBorrowingsForDay(day);
                  return (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200 dark:border-slate-700">
                      <div className="p-6">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                          Peminjaman {new Date(selectedDay).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </h3>
                        {dayBorrows.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada peminjaman pada tanggal ini</p>
                        ) : (
                          <div className="space-y-2">
                            {dayBorrows.map(b => (
                              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                <div>
                                  <div className="font-medium text-sm text-slate-900 dark:text-white">
                                    {b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name}
                                  </div>
                                  <div className="text-xs text-slate-500">{b.borrower_name} &middot; {(b.start_time || '08:00').slice(0, 5)} - {(b.end_time || '16:00').slice(0, 5)}</div>
                                </div>
                                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', BORROWING_STATUS_COLORS[b.status])}>
                                  {BORROWING_STATUS_LABELS[b.status]}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              <div className="flex flex-wrap gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                {[
                  { label: 'Disetujui', color: 'bg-emerald-400' },
                  { label: 'Menunggu', color: 'bg-amber-400' },
                  { label: 'Selesai', color: 'bg-blue-400' },
                  { label: 'Terisi', color: 'bg-orange-400' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full', l.color)} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* List View */
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Peminjam</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Barang/Ruangan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Jam</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Keperluan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredBorrowings.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Tidak ada data peminjaman</td></tr>
                    ) : (
                      filteredBorrowings.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm text-slate-900 dark:text-white">{b.borrower_name}</div>
                            <div className="text-xs text-slate-500">{b.borrower_class}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {b.item_type === 'ruangan' ? <Building2 className="w-4 h-4 text-cyan-500" /> : <Package className="w-4 h-4 text-blue-500" />}
                              <span className="text-sm text-slate-900 dark:text-white">{b.item_type === 'ruangan' ? b.facilities?.name : b.inventory?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-900 dark:text-white">{formatDate(b.borrow_date)}</div>
                            <div className="text-xs text-slate-500">s/d {b.return_date ? formatDate(b.return_date) : '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {(b.start_time || '08:00').slice(0, 5)} - {(b.end_time || '16:00').slice(0, 5)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">{b.purpose || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', BORROWING_STATUS_COLORS[b.status])}>
                              {BORROWING_STATUS_LABELS[b.status]}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

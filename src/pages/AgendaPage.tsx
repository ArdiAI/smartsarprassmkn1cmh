import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, Filter, Search } from 'lucide-react';
import { Agenda, AGENDA_CATEGORIES } from '../types';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CATEGORY_COLORS: Record<string, string> = {
  sekolah: 'bg-blue-500',
  osis: 'bg-emerald-500',
  mpk: 'bg-purple-500',
  ekstrakurikuler: 'bg-orange-500',
  sarpras: 'bg-cyan-500',
};

export default function AgendaPage() {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('agendas').select('*').order('event_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Fetch agendas error:', error);
        if (data) setAgendas(data as Agenda[]);
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

  const filteredAgendas = useMemo(() => {
    return agendas.filter(a => selectedCategory === 'all' || a.category === selectedCategory);
  }, [agendas, selectedCategory]);

  const getAgendasForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredAgendas.filter(a => a.event_date === dateStr);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <section className="pt-24 pb-8 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">Agenda Sekolah</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-slate-600 dark:text-slate-400">Kalender kegiatan dan agenda sekolah</motion.p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setSelectedCategory('all')}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              )}>Semua</button>
            {AGENDA_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                  selectedCategory === cat ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                )}>{cat}</button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 mb-6">
            {[
              { mode: 'calendar' as const, label: 'Kalender' },
              { mode: 'list' as const, label: 'Daftar' },
            ].map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode)}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  viewMode === v.mode ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                )}>{v.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 animate-pulse">
              <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
              <div className="grid grid-cols-7 gap-2">{[...Array(35)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />)}</div>
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              {/* Calendar Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5" /></button>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{MONTHS[month]} {year}</h2>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight className="w-5 h-5" /></button>
              </div>

              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                {DAYS.map(day => (
                  <div key={day} className="p-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="min-h-[80px] p-1 border-b border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30" />;
                  }
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayAgendas = getAgendasForDay(day);
                  const today = isToday(day);
                  return (
                    <div key={day} onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
                      className={cn('min-h-[80px] p-1.5 border-b border-r border-slate-100 dark:border-slate-700/50 cursor-pointer transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10',
                        today && 'bg-blue-50/50 dark:bg-blue-900/10', selectedDay === dateStr && 'bg-blue-100/50 dark:bg-blue-900/20 ring-1 ring-blue-300'
                      )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full', today ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-400')}>{day}</span>
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayAgendas.slice(0, 2).map(a => (
                          <div key={a.id} className={cn('text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white', CATEGORY_COLORS[a.category] || 'bg-slate-500')}>
                            {a.title}
                          </div>
                        ))}
                        {dayAgendas.length > 2 && <div className="text-[10px] text-slate-400 pl-1">+{dayAgendas.length - 2}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Day Detail */}
              <AnimatePresence>
                {selectedDay && (() => {
                  const day = parseInt(selectedDay.split('-')[2]);
                  const dayAgendas = getAgendasForDay(day);
                  return (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200 dark:border-slate-700">
                      <div className="p-6">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{formatDate(selectedDay)}</h3>
                        {dayAgendas.length === 0 ? (
                          <p className="text-sm text-slate-500">Tidak ada agenda</p>
                        ) : (
                          <div className="space-y-2">
                            {dayAgendas.map(a => (
                              <div key={a.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-start gap-3">
                                <div className={cn('w-3 h-3 rounded-full mt-1 flex-shrink-0', CATEGORY_COLORS[a.category] || 'bg-slate-500')} />
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-slate-900 dark:text-white">{a.title}</div>
                                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                                    {a.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.start_time.slice(0, 5)} - {a.end_time?.slice(0, 5)}</span>}
                                    {a.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.location}</span>}
                                    {a.organizer && <span className="flex items-center gap-1"><User className="w-3 h-3" />{a.organizer}</span>}
                                  </div>
                                  {a.description && <p className="text-xs text-slate-500 mt-1">{a.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', color)} /><span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{cat}</span>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Agenda</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Kategori</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Tanggal & Jam</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Lokasi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Penanggung Jawab</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredAgendas.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Tidak ada agenda</td></tr>
                    ) : (
                      filteredAgendas.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm text-slate-900 dark:text-white">{a.title}</div>
                            {a.description && <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{a.description}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize', CATEGORY_COLORS[a.category] || 'bg-slate-500')}>{a.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-900 dark:text-white">{formatDate(a.event_date)}</div>
                            {a.start_time && <div className="text-xs text-slate-500">{a.start_time.slice(0, 5)} - {a.end_time?.slice(0, 5)}</div>}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{a.location || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{a.organizer || '-'}</td>
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

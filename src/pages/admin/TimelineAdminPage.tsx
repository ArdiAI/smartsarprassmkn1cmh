import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  fetchTimelineEvents,
  colorCategoryStyles,
  type TimelineEvent,
  type EventColorCategory,
} from '../../lib/timeline';
import {
  ChevronLeft, ChevronRight, CalendarDays, Loader2, Search, X, Clock, MapPin, User,
} from 'lucide-react';

const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function TimelineAdminPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState<'all' | 'Agenda' | 'Peminjaman'>('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrganisasi, setFilterOrganisasi] = useState('all');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const data = await fetchTimelineEvents(viewYear, viewMonth);
    setEvents(data);
    setLoading(false);
  }, [viewYear, viewMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    for (const e of events) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  const organisasiOptions = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => { if (e.organisasi) set.add(e.organisasi); });
    return Array.from(set).sort();
  }, [events]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => { if (e.status) set.add(e.status); });
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterJenis !== 'all' && e.jenis !== filterJenis) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterOrganisasi !== 'all' && e.organisasi !== filterOrganisasi) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.title?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [events, filterJenis, filterStatus, filterOrganisasi, search]);

  const filteredEventsByDate = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    for (const e of filteredEvents) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [filteredEvents]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, dateStr: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedEvents = selectedDate ? (filteredEventsByDate[selectedDate] || []) : [];
  const hasActiveFilters = filterJenis !== 'all' || filterStatus !== 'all' || filterOrganisasi !== 'all' || search;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Timeline</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kalender kegiatan sekolah — gabungan Agenda dan Peminjaman
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {(Object.keys(colorCategoryStyles) as EventColorCategory[]).map(cat => {
          const s = colorCategoryStyles[cat];
          return (
            <div key={cat} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className={`w-3 h-3 rounded-full ${s.dot}`} />
              {s.label}
            </div>
          );
        })}
      </div>

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama kegiatan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select value={filterJenis} onChange={e => setFilterJenis(e.target.value as any)} className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
            <option value="all">Semua Jenis</option>
            <option value="Agenda">Agenda</option>
            <option value="Peminjaman">Peminjaman</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
            <option value="all">Semua Status</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterOrganisasi} onChange={e => setFilterOrganisasi(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
            <option value="all">Semua Organisasi</option>
            {organisasiOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterJenis('all'); setFilterStatus('all'); setFilterOrganisasi('all'); setSearch(''); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
            >
              <X className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {monthNames[viewMonth]} {viewYear}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextMonth} className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              if (!cell.dateStr) {
                return <div key={idx} className="min-h-[80px] rounded-lg bg-slate-50 dark:bg-slate-800/30" />;
              }
              const dayEvents = filteredEventsByDate[cell.dateStr] || [];
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[80px] rounded-lg p-1.5 text-left border transition-all ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : isToday
                      ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {cell.day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(e => {
                      const s = colorCategoryStyles[e.colorCategory];
                      return (
                        <div key={`${e.jenis}-${e.id}`} className={`text-[10px] px-1 py-0.5 rounded truncate ${s.bg} ${s.text}`} title={e.title}>
                          {e.startTime ? `${e.startTime} ` : ''}{e.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-500 px-1">+{dayEvents.length - 3} lainnya</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-500" />
            {selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : 'Pilih tanggal'}
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : !selectedDate ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              Klik salah satu tanggal pada kalender untuk melihat kegiatan pada tanggal tersebut.
            </p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              Tidak ada kegiatan pada tanggal ini.
            </p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {selectedEvents.map(e => {
                const s = colorCategoryStyles[e.colorCategory];
                return (
                  <div key={`${e.jenis}-${e.id}`} className={`rounded-xl p-3 border border-slate-200 dark:border-slate-700 ${s.bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <span className={`text-xs font-semibold ${s.text}`}>{e.jenis}</span>
                      {e.status && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto capitalize">{e.status}</span>
                      )}
                    </div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{e.title}</p>
                    <div className="mt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {e.startTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {e.startTime}{e.endTime ? ` - ${e.endTime}` : ''}
                        </div>
                      )}
                      {e.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {e.location}
                        </div>
                      )}
                      {e.organisasi && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {e.organisasi}
                        </div>
                      )}
                      {e.penanggungJawab && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          PJ: {e.penanggungJawab}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

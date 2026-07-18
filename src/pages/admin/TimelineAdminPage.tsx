import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Search, RotateCcw, Calendar as CalendarIcon, Clock, MapPin, User,
} from 'lucide-react';
import {
  fetchTimelineEvents,
  colorCategoryStyles,
  colorCategoryFor,
  type TimelineEvent,
  type EventColorCategory,
} from '../../lib/timeline';
import EmptyState from '../../components/EmptyState';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const JENIS_FILTERS = ['all', 'Agenda', 'Peminjaman'];
const STATUS_FILTERS = ['all', 'scheduled', 'pending', 'approved', 'rejected', 'returned'];

export default function TimelineAdminPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTimelineEvents(year, month);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const organisations = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => { if (e.organisasi) set.add(e.organisasi); });
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (jenisFilter !== 'all' && e.jenis !== jenisFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (orgFilter !== 'all' && e.organisasi !== orgFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(e.title.toLowerCase().includes(q) || (e.description?.toLowerCase().includes(q) ?? false) || (e.penanggungJawab?.toLowerCase().includes(q) ?? false))) return false;
      }
      return true;
    });
  }, [events, jenisFilter, statusFilter, orgFilter, search]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    filteredEvents.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: (string | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  }, [year, month]);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => { setCurrentDate(new Date()); setSelectedDate(todayStr); };

  const resetFilters = () => {
    setSearch('');
    setJenisFilter('all');
    setStatusFilter('all');
    setOrgFilter('all');
  };

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Timeline Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kalender agenda sekolah dan peminjaman sarana.</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Cari kegiatan..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="input w-auto" value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value)}>
              {JENIS_FILTERS.map((j) => <option key={j} value={j}>{j === 'all' ? 'Semua Jenis' : j}</option>)}
            </select>
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === 'all' ? 'Semua Status' : s}</option>)}
            </select>
            <select className="input w-auto" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} disabled={organisations.length === 0}>
              <option value="all">Semua Organisasi</option>
              {organisations.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <button onClick={resetFilters} className="btn-secondary">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {MONTH_NAMES[month]} {year}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={goToday} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30">
                  Hari Ini
                </button>
                <button onClick={nextMonth} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dateStr, i) => {
                if (!dateStr) return <div key={i} className="min-h-[80px] rounded-lg bg-slate-50 dark:bg-slate-800/40" />;
                const dayEvents = eventsByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayNum = parseInt(dateStr.split('-')[2], 10);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[80px] rounded-lg border p-1.5 text-left transition ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30'
                        : isToday
                        ? 'border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/20'
                        : 'border-slate-100 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`mb-1 text-xs font-bold ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      {dayNum}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e, idx) => {
                        const style = colorCategoryStyles[e.colorCategory];
                        return (
                          <div key={idx} className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`} title={e.title}>
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">+{dayEvents.length - 3} lainnya</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              {(Object.keys(colorCategoryStyles) as EventColorCategory[]).map((cat) => {
                const s = colorCategoryStyles[cat];
                return (
                  <div key={cat} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="card">
          {selectedDate ? (
            <>
              <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              {selectedEvents.length === 0 ? (
                <EmptyState title="Tidak ada kegiatan" description="Tidak ada agenda atau peminjaman pada tanggal ini." />
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((e) => {
                    const style = colorCategoryStyles[e.colorCategory];
                    return (
                      <div key={e.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{e.title}</span>
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>{e.jenis}</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {(e.startTime || e.endTime) && (
                            <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {e.startTime ?? '-'} - {e.endTime ?? '-'}</div>
                          )}
                          {e.location && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {e.location}</div>}
                          {e.organisasi && <div className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> {e.organisasi}</div>}
                          {e.penanggungJawab && <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {e.penanggungJawab}</div>}
                          {e.description && <p className="mt-1 text-slate-500 dark:text-slate-400">{e.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <EmptyState title="Pilih Tanggal" description="Klik tanggal pada kalender untuk melihat detail kegiatan." icon={<CalendarIcon className="h-8 w-8 text-slate-400" />} />
          )}
        </div>
      </div>
    </div>
  );
}

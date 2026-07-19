import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar as CalendarIcon,
  X,
  MapPin,
  Clock,
  User,
} from 'lucide-react';
import {
  fetchTimelineEvents,
  colorCategoryStyles,
  type TimelineEvent,
  type EventColorCategory,
} from '../../lib/timeline';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const JENIS_OPTIONS = ['all', 'Agenda', 'Peminjaman'];
const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected', 'returned', 'scheduled', 'completed'];

export default function TimelineAdminPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTimelineEvents(year, month);
      setEvents(data);
    } catch {
      showToast('Gagal memuat timeline', 'error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const orgOptions = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => { if (e.organisasi) set.add(e.organisasi); });
    return ['all', ...Array.from(set).sort()];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
      const matchJenis = jenisFilter === 'all' || e.jenis === jenisFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchOrg = orgFilter === 'all' || e.organisasi === orgFilter;
      return matchSearch && matchJenis && matchStatus && matchOrg;
    });
  }, [events, search, jenisFilter, statusFilter, orgFilter]);

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
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days: (string | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const resetFilters = () => {
    setSearch('');
    setJenisFilter('all');
    setStatusFilter('all');
    setOrgFilter('all');
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Timeline Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kalender kegiatan sekolah, agenda, dan peminjaman.
        </p>
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari kegiatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select className="input" value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value)}>
            {JENIS_OPTIONS.map((j) => (
              <option key={j} value={j}>{j === 'all' ? 'Semua Jenis' : j}</option>
            ))}
          </select>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'Semua Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select className="input" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
            {orgOptions.map((o) => (
              <option key={o} value={o}>{o === 'all' ? 'Semua Organisasi' : o}</option>
            ))}
          </select>
          <button onClick={resetFilters} className="btn-secondary">
            <X className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Month nav */}
            <div className="mb-4 flex items-center justify-between">
              <button onClick={prevMonth} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={nextMonth} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-slate-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dateStr, i) => {
                if (!dateStr) return <div key={`empty-${i}`} />;
                const dayEvents = eventsByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayNum = parseInt(dateStr.split('-')[2], 10);
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      'min-h-[80px] rounded-lg border p-1.5 text-left transition',
                      isToday && 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20',
                      isSelected && !isToday && 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20',
                      !isToday && !isSelected && 'border-slate-100 hover:border-brand-200 dark:border-slate-800 dark:hover:border-brand-700',
                    )}
                  >
                    <span className={cn(
                      'text-xs font-medium',
                      isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400',
                    )}>
                      {dayNum}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => {
                        const style = colorCategoryStyles[e.colorCategory];
                        return (
                          <div
                            key={e.id}
                            className={cn('truncate rounded px-1 py-0.5 text-[10px] font-medium', style.bg, style.text)}
                          >
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="px-1 text-[10px] text-slate-400">
                          +{dayEvents.length - 3} lainnya
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              {(Object.keys(colorCategoryStyles) as EventColorCategory[]).map((cat) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className={cn('h-2.5 w-2.5 rounded-full', colorCategoryStyles[cat].dot)} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {colorCategoryStyles[cat].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel: selected date events */}
        <div className="card">
          {selectedDate ? (
            <>
              <div className="mb-4 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-brand-500" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              {selectedEvents.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Tidak ada kegiatan pada tanggal ini.</p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((e) => {
                    const style = colorCategoryStyles[e.colorCategory];
                    return (
                      <div
                        key={e.id}
                        className={cn('rounded-xl border p-3', style.bg, 'border-transparent')}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', style.dot)} />
                          <span className={cn('text-xs font-medium', style.text)}>{e.jenis}</span>
                          <span className="ml-auto text-xs text-slate-400">{e.status}</span>
                        </div>
                        <h4 className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {e.title}
                        </h4>
                        <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {e.startTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {e.startTime}{e.endTime ? ` - ${e.endTime}` : ''}
                            </div>
                          )}
                          {e.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {e.location}
                            </div>
                          )}
                          {e.penanggungJawab && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {e.penanggungJawab}
                            </div>
                          )}
                        </div>
                        {e.description && (
                          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{e.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">
                Pilih tanggal untuk melihat detail kegiatan.
              </p>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      )}
    </div>
  );
}

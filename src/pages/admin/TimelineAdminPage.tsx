import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCcw,
  CalendarDays,
  MapPin,
  Clock,
  User,
  Filter,
} from 'lucide-react';
import {
  fetchTimelineEvents,
  colorCategoryStyles,
  type TimelineEvent,
  type EventColorCategory,
} from '../../lib/timeline';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import EmptyState from '../../components/EmptyState';

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const JENIS_OPTIONS = ['all', 'Agenda', 'Peminjaman'];
const STATUS_OPTIONS = ['all', 'scheduled', 'pending', 'approved', 'rejected', 'borrowed', 'returned'];

export default function TimelineAdminPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTimelineEvents(year, month);
      setEvents(data);
    } catch {
      showToast('Gagal memuat timeline', 'error');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (jenisFilter !== 'all' && e.jenis !== jenisFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (orgFilter && !(e.organisasi ?? '').toLowerCase().includes(orgFilter.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q) ||
          (e.location ?? '').toLowerCase().includes(q) ||
          (e.penanggungJawab ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, search, jenisFilter, statusFilter, orgFilter]);

  // Build events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    filteredEvents.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    return cells;
  }, [year, month]);

  function dateKey(day: number) {
    return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  function resetFilters() {
    setSearch('');
    setJenisFilter('all');
    setStatusFilter('all');
    setOrgFilter('');
  }

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Timeline Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kalender kegiatan sekolah: agenda dan peminjaman.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 card">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Filter className="h-4 w-4" />
          Filter
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Cari kegiatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Organisasi..."
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
            />
            <button onClick={resetFilters} className="btn-secondary shrink-0" title="Reset filter">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Month navigation */}
            <div className="mb-4 flex items-center justify-between">
              <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                  {wd}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={idx} className="min-h-[80px]" />;
                const key = dateKey(day);
                const dayEvents = eventsByDate[key] ?? [];
                const isSelected = selectedDate === key;
                const today = new Date();
                const isToday =
                  today.getFullYear() === year &&
                  today.getMonth() === month &&
                  today.getDate() === day;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      'min-h-[80px] rounded-lg border p-1.5 text-left transition',
                      isSelected
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-slate-100 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
                      isToday && 'ring-2 ring-brand-400 ring-offset-0'
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => {
                        const style = colorCategoryStyles[e.colorCategory];
                        return (
                          <div
                            key={e.id}
                            className={cn('truncate rounded px-1 py-0.5 text-[10px]', style.bg, style.text)}
                            title={e.title}
                          >
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-slate-400">+{dayEvents.length - 3} lainnya</p>
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
                  <span className="text-xs text-slate-600 dark:text-slate-400">{colorCategoryStyles[cat].label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel: selected date events */}
        <div className="card h-fit">
          <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
              : 'Pilih tanggal untuk melihat detail'}
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            </div>
          ) : selectedDate === null ? (
            <EmptyState
              icon={<CalendarDays className="h-8 w-8 text-slate-400" />}
              title="Pilih tanggal"
              description="Klik tanggal pada kalender untuk melihat kegiatan."
            />
          ) : selectedEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-8 w-8 text-slate-400" />}
              title="Tidak ada kegiatan"
              description="Tidak ada kegiatan pada tanggal ini."
            />
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((e) => {
                const style = colorCategoryStyles[e.colorCategory];
                return (
                  <div key={e.id} className={cn('rounded-xl border p-3', style.bg)}>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn('text-sm font-semibold', style.text)}>{e.title}</h4>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', style.bg, style.text)}>
                        {e.jenis}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {e.startTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {e.startTime}{e.endTime ? ` - ${e.endTime}` : ''}
                        </div>
                      )}
                      {e.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          {e.location}
                        </div>
                      )}
                      {e.organisasi && (
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3" />
                          {e.organisasi}
                        </div>
                      )}
                      {e.penanggungJawab && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          {e.penanggungJawab}
                        </div>
                      )}
                    </div>
                    {e.description && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{e.description}</p>
                    )}
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

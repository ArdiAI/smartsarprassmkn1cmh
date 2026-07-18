import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Clock,
  MapPin,
  User,
  Tag,
  RotateCcw,
} from 'lucide-react';
import {
  fetchTimelineEvents,
  colorCategoryStyles,
  type TimelineEvent,
  type EventColorCategory,
} from '../lib/timeline';
import EmptyState from '../components/EmptyState';
import { cn } from '../utils/cn';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const JENIS_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'Agenda', label: 'Agenda' },
  { value: 'Peminjaman', label: 'Peminjaman' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'borrowed', label: 'Dipinjam' },
  { value: 'returned', label: 'Dikembalikan' },
  { value: 'completed', label: 'Selesai' },
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function TimelinePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('');

  const loadEvents = useCallback(async () => {
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
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const matchSearch = !q || (e.title?.toLowerCase().includes(q) ?? false) || (e.description?.toLowerCase().includes(q) ?? false) || (e.location?.toLowerCase().includes(q) ?? false);
      const matchJenis = jenisFilter === 'all' || e.jenis === jenisFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchOrg = !orgFilter.trim() || (e.organisasi?.toLowerCase().includes(orgFilter.trim().toLowerCase()) ?? false);
      return matchSearch && matchJenis && matchStatus && matchOrg;
    });
  }, [events, search, jenisFilter, statusFilter, orgFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    filteredEvents.forEach((e) => {
      if (!e.date) return;
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [filteredEvents]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

  const resetFilters = () => {
    setSearch('');
    setJenisFilter('all');
    setStatusFilter('all');
    setOrgFilter('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Timeline Kegiatan</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kalender kegiatan sekolah: agenda dan peminjaman.
        </p>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(colorCategoryStyles) as EventColorCategory[]).map((key) => {
          const s = colorCategoryStyles[key];
          return (
            <span
              key={key}
              className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', s.bg, s.text)}
            >
              <span className={cn('h-2 w-2 rounded-full', s.dot)} />
              {s.label}
            </span>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari kegiatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value)}>
          {JENIS_FILTERS.map((j) => (
            <option key={j.value} value={j.value}>{j.label}</option>
          ))}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Organisasi..."
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
          />
          <button onClick={resetFilters} className="btn-secondary" title="Reset filter">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Month nav */}
            <div className="mb-4 flex items-center justify-between">
              <button onClick={prevMonth} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={nextMonth} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  if (day === null) return <div key={idx} className="aspect-square" />;
                  const key = dateKey(year, month, day);
                  const dayEvents = eventsByDate.get(key) ?? [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(key)}
                      className={cn(
                        'flex aspect-square flex-col items-center gap-0.5 rounded-lg border p-1 text-left transition',
                        isSelected
                          ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30'
                          : 'border-slate-100 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50',
                        isToday && !isSelected && 'border-brand-400 dark:border-brand-600',
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300',
                        )}
                      >
                        {day}
                      </span>
                      <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const s = colorCategoryStyles[ev.colorCategory];
                          return (
                            <span
                              key={ev.id}
                              className={cn('truncate rounded px-1 py-0.5 text-[10px] font-medium', s.bg, s.text)}
                              title={ev.title}
                            >
                              {ev.title}
                            </span>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{dayEvents.length - 3} lainnya</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: selected date events */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : 'Pilih Tanggal'}
            </h3>
            {!selectedDate ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Klik tanggal pada kalender untuk melihat detail kegiatan.
              </p>
            ) : selectedEvents.length === 0 ? (
              <EmptyState
                title="Tidak ada kegiatan"
                description="Tidak ada kegiatan pada tanggal ini."
                icon={<CalendarRange className="h-8 w-8 text-slate-400" />}
              />
            ) : (
              <ul className="space-y-3">
                {selectedEvents.map((ev) => {
                  const s = colorCategoryStyles[ev.colorCategory];
                  return (
                    <li
                      key={ev.id}
                      className={cn('rounded-xl border p-3', s.bg, 'border-transparent')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ev.title}</h4>
                        <span className={cn('inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium dark:bg-slate-900/50', s.text)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                          {ev.jenis}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        {(ev.startTime || ev.endTime) && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {ev.startTime ?? '-'}{ev.endTime ? ` - ${ev.endTime}` : ''}
                          </div>
                        )}
                        {ev.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {ev.location}
                          </div>
                        )}
                        {ev.organisasi && (
                          <div className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-slate-400" />
                            {ev.organisasi}
                          </div>
                        )}
                        {ev.penanggungJawab && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {ev.penanggungJawab}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">Status:</span>
                          <span className="font-semibold">{ev.status}</span>
                        </div>
                      </div>
                      {ev.description && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{ev.description}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

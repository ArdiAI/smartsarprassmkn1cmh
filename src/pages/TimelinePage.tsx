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
  Building2,
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

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TimelinePage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(dateKey(today));

  // Filters
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState<'all' | 'Agenda' | 'Peminjaman'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTimelineEvents(currentYear, currentMonth);
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(dateKey(today));
  };

  const resetFilters = () => {
    setSearch('');
    setJenisFilter('all');
    setStatusFilter('all');
    setOrgFilter('');
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase().trim();
    return events.filter((e) => {
      const matchesSearch = !q || e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q);
      const matchesJenis = jenisFilter === 'all' || e.jenis === jenisFilter;
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchesOrg = !orgFilter || e.organisasi?.toLowerCase().includes(orgFilter.toLowerCase());
      return matchesSearch && matchesJenis && matchesStatus && matchesOrg;
    });
  }, [events, search, jenisFilter, statusFilter, orgFilter]);

  // Group events by date
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
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells: { date: Date | null; key: string | null }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: null, key: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d);
      cells.push({ date, key: dateKey(date) });
    }
    // Fill remaining cells to complete the grid
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, key: null });
    }
    return cells;
  }, [currentYear, currentMonth]);

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];

  const hasActiveFilters = search || jenisFilter !== 'all' || statusFilter !== 'all' || orgFilter;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
          <CalendarRange className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          Timeline Kegiatan
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Kalender kegiatan sekolah dan peminjaman barang/fasilitas.
        </p>
      </div>

      {/* Color Legend */}
      <div className="mb-6 flex flex-wrap gap-3">
        {(Object.keys(colorCategoryStyles) as EventColorCategory[]).map((cat) => {
          const style = colorCategoryStyles[cat];
          return (
            <span
              key={cat}
              className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', style.bg, style.text)}
            >
              <span className={cn('h-2 w-2 rounded-full', style.dot)} />
              {style.label}
            </span>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kegiatan..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <select
          value={jenisFilter}
          onChange={(e) => setJenisFilter(e.target.value as 'all' | 'Agenda' | 'Peminjaman')}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">Semua Jenis</option>
          <option value="Agenda">Agenda</option>
          <option value="Peminjaman">Peminjaman</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="returned">Dikembalikan</option>
          <option value="completed">Selesai</option>
          <option value="scheduled">Terjadwal</option>
        </select>
        <input
          type="text"
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          placeholder="Organisasi..."
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            {/* Month Navigation */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToday}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Hari Ini
                </button>
                <button
                  onClick={nextMonth}
                  className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {dayNames.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, i) => {
                if (!cell.date || !cell.key) {
                  return <div key={i} className="min-h-[80px] rounded-lg bg-slate-50 dark:bg-slate-800/30" />;
                }
                const dayEvents = eventsByDate[cell.key] ?? [];
                const isToday = cell.key === dateKey(today);
                const isSelected = cell.key === selectedDate;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(cell.key)}
                    className={cn(
                      'min-h-[80px] rounded-lg border p-1.5 text-left transition',
                      isSelected
                        ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/20'
                        : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-700',
                    )}
                  >
                    <span
                      className={cn(
                        'mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                        isToday
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-600 dark:text-slate-300',
                      )}
                    >
                      {cell.date.getDate()}
                    </span>
                    <div className="space-y-0.5">
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
                        <p className="px-1 text-[10px] text-slate-400">+{dayEvents.length - 3} lainnya</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Selected Date Events */}
        <div>
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold uppercase text-slate-400">
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : 'Pilih Tanggal'}
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              </div>
            ) : selectedEvents.length === 0 ? (
              <EmptyState
                title="Tidak ada kegiatan"
                description="Tidak ada event pada tanggal ini."
                className="py-6"
              />
            ) : (
              <div className="max-h-[500px] space-y-3 overflow-y-auto">
                {selectedEvents.map((e) => {
                  const style = colorCategoryStyles[e.colorCategory];
                  return (
                    <div
                      key={e.id}
                      className={cn('rounded-xl border-l-4 p-3', style.bg)}
                      style={{ borderLeftColor: undefined }}
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', style.dot)} />
                        <span className={cn('text-xs font-semibold', style.text)}>{e.jenis}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{e.title}</p>

                      <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {(e.startTime || e.endTime) && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {e.startTime ?? '—'} - {e.endTime ?? '—'}
                          </div>
                        )}
                        {e.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {e.location}
                          </div>
                        )}
                        {e.organisasi && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {e.organisasi}
                          </div>
                        )}
                        {e.penanggungJawab && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {e.penanggungJawab}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">Status:</span>
                          <span>{e.status}</span>
                        </div>
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
    </div>
  );
}

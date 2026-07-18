import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  MapPin,
  Users,
  User,
  Loader2,
  Filter,
  RotateCcw,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import {
  fetchTimelineEvents,
  colorCategoryStyles,
  type TimelineEvent,
  type EventColorCategory,
} from '../lib/timeline';
import { cn } from '../utils/cn';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export default function TimelinePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState<'all' | 'Agenda' | 'Peminjaman'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');

  const loadEvents = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const data = await fetchTimelineEvents(y, m);
      setEvents(data);
    } catch {
      showToast('Gagal memuat timeline', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents(year, month);
  }, [year, month, loadEvents]);

  const prevMonth = () => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const nextMonth = () => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(dateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (jenisFilter !== 'all' && e.jenis !== jenisFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (orgFilter !== 'all' && (e.organisasi ?? '') !== orgFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.title.toLowerCase().includes(q) &&
          !(e.location ?? '').toLowerCase().includes(q) &&
          !(e.penanggungJawab ?? '').toLowerCase().includes(q) &&
          !(e.organisasi ?? '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [events, jenisFilter, statusFilter, orgFilter, search]);

  // Group events by date
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

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  // Unique organisations
  const organisations = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.organisasi) set.add(e.organisasi);
    });
    return Array.from(set).sort();
  }, [events]);

  // Unique statuses
  const statuses = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.status));
    return Array.from(set).sort();
  }, [events]);

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

  const resetFilters = () => {
    setSearch('');
    setJenisFilter('all');
    setStatusFilter('all');
    setOrgFilter('all');
  };

  const formatTime = (t: string | null) => t ?? '';

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="relative mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <CalendarRange className="h-7 w-7 text-brand-600" />
            Timeline Kegiatan
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kalender kegiatan dan peminjaman sekolah.
          </p>
        </div>

        {/* Color Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">Legenda:</span>
          {(Object.keys(colorCategoryStyles) as EventColorCategory[]).map((cat) => (
            <span
              key={cat}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                colorCategoryStyles[cat].bg,
                colorCategoryStyles[cat].text,
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', colorCategoryStyles[cat].dot)} />
              {colorCategoryStyles[cat].label}
            </span>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Cari kegiatan, lokasi, PJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input lg:w-40" value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value as 'all' | 'Agenda' | 'Peminjaman')}>
            <option value="all">Semua Jenis</option>
            <option value="Agenda">Agenda</option>
            <option value="Peminjaman">Peminjaman</option>
          </select>
          <select className="input lg:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="input lg:w-48" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
            <option value="all">Semua Organisasi</option>
            {organisations.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <button onClick={resetFilters} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Calendar */}
          <div className="card">
            {/* Month Navigation */}
            <div className="mb-4 flex items-center justify-between">
              <button onClick={prevMonth} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <button onClick={goToToday} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  Hari ini
                </button>
              </div>
              <button onClick={nextMonth} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-1 text-center text-xs font-semibold text-slate-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={idx} className="min-h-[80px] rounded-lg bg-slate-50 dark:bg-slate-900/50" />;
                  }
                  const dateStr = dateKey(year, month, day);
                  const dayEvents = eventsByDate.get(dateStr) ?? [];
                  const isToday = dateStr === dateKey(today.getFullYear(), today.getMonth(), today.getDate());
                  const isSelected = dateStr === selectedDate;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        'min-h-[80px] rounded-lg border p-1.5 text-left transition',
                        isSelected
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                          : 'border-slate-100 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800',
                      )}
                    >
                      <span
                        className={cn(
                          'mb-1 inline-block text-xs font-semibold',
                          isToday ? 'rounded-full bg-brand-600 px-1.5 text-white' : 'text-slate-600 dark:text-slate-300',
                        )}
                      >
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className={cn(
                              'flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium',
                              colorCategoryStyles[e.colorCategory].bg,
                              colorCategoryStyles[e.colorCategory].text,
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', colorCategoryStyles[e.colorCategory].dot)} />
                            <span className="truncate">{e.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] font-medium text-slate-400">
                            +{dayEvents.length - 3} lainnya
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Selected Date Events */}
          <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {!selectedDate ? (
              <EmptyState
                icon={<CalendarRange className="h-8 w-8 text-slate-400" />}
                title="Pilih Tanggal"
                description="Klik tanggal pada kalender untuk melihat detail kegiatan."
              />
            ) : selectedEvents.length === 0 ? (
              <div>
                <h3 className="mb-3 font-bold text-slate-900 dark:text-white">
                  {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <EmptyState title="Tidak ada kegiatan" description="Tidak ada kegiatan pada tanggal ini." />
              </div>
            ) : (
              <div>
                <h3 className="mb-4 font-bold text-slate-900 dark:text-white">
                  {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <div className="space-y-3">
                  {selectedEvents.map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        'rounded-xl border-l-4 p-3',
                        colorCategoryStyles[e.colorCategory].bg,
                        'border-l-current',
                      )}
                      style={{ borderLeftColor: undefined }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white">{e.title}</h4>
                        <span
                          className={cn(
                            'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            colorCategoryStyles[e.colorCategory].bg,
                            colorCategoryStyles[e.colorCategory].text,
                          )}
                        >
                          <span className={cn('h-2 w-2 rounded-full', colorCategoryStyles[e.colorCategory].dot)} />
                          {e.jenis}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {(e.startTime || e.endTime) && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(e.startTime)}{e.startTime && e.endTime && ' - '}{formatTime(e.endTime)}
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
                            <Users className="h-3.5 w-3.5" />
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
                          <span className="capitalize">{e.status}</span>
                        </div>
                        {e.description && (
                          <p className="mt-1.5 rounded-lg bg-white/50 p-2 text-slate-600 dark:bg-slate-900/30 dark:text-slate-300">
                            {e.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

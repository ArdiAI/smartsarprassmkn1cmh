import { useEffect, useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, CalendarDays, Clock, MapPin, User, RotateCcw, X } from 'lucide-react';
import {
  fetchTimelineEvents,
  colorCategoryStyles,
  type TimelineEvent,
  type EventColorCategory,
} from '../lib/timeline';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const JENIS_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'Agenda', label: 'Agenda' },
  { value: 'Peminjaman', label: 'Peminjaman' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'returned', label: 'Dikembalikan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'borrowed', label: 'Dipinjam' },
];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function dateStr(y: number, m: number, d: number) {
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
  const [orgFilter, setOrgFilter] = useState('all');

  const loadEvents = useCallback(async () => {
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
    loadEvents();
  }, [loadEvents]);

  const organisations = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => { if (e.organisasi) set.add(e.organisasi); });
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.title.toLowerCase().includes(q) &&
          !(e.description ?? '').toLowerCase().includes(q) &&
          !(e.location ?? '').toLowerCase().includes(q) &&
          !(e.penanggungJawab ?? '').toLowerCase().includes(q)
        ) return false;
      }
      if (jenisFilter !== 'all' && e.jenis !== jenisFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (orgFilter !== 'all' && e.organisasi !== orgFilter) return false;
      return true;
    });
  }, [events, search, jenisFilter, statusFilter, orgFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    filteredEvents.forEach((e) => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [filteredEvents]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(dateStr(year, month, d));
    return cells;
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  }

  function resetFilters() {
    setSearch('');
    setJenisFilter('all');
    setStatusFilter('all');
    setOrgFilter('all');
  }

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];
  const todayString = dateStr(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Timeline Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kalender kegiatan sekolah — agenda dan peminjaman dalam satu tampilan.
        </p>
      </div>

      {/* Color Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {(Object.keys(colorCategoryStyles) as EventColorCategory[]).map((cat) => (
          <div key={cat} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
            <span className={cn('h-2.5 w-2.5 rounded-full', colorCategoryStyles[cat].dot)} />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {colorCategoryStyles[cat].label}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari kegiatan, lokasi, atau penanggung jawab..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input lg:w-40" value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value)}>
          {JENIS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="input lg:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="input lg:w-44" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
          <option value="all">Semua Organisasi</option>
          {organisations.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button onClick={resetFilters} className="btn-secondary shrink-0">
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Month Navigation */}
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

            {/* Day Headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dateStr_, idx) => {
                  if (!dateStr_) return <div key={idx} className="h-24" />;
                  const dayEvents = eventsByDate.get(dateStr_) ?? [];
                  const dayNum = parseInt(dateStr_.slice(-2));
                  const isToday = dateStr_ === todayString;
                  const isSelected = dateStr_ === selectedDate;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(dateStr_)}
                      className={cn(
                        'h-24 cursor-pointer rounded-lg border p-1 transition',
                        isSelected
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                          : isToday
                            ? 'border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
                      )}
                    >
                      <span className={cn(
                        'text-xs font-medium',
                        isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400',
                      )}>
                        {dayNum}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const style = colorCategoryStyles[ev.colorCategory];
                          return (
                            <div
                              key={ev.id}
                              className={cn('truncate rounded px-1 py-0.5 text-[10px] font-medium', style.bg, style.text)}
                              title={ev.title}
                            >
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-slate-400">+{dayEvents.length - 3} lainnya</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Selected Date Events */}
        <div>
          <div className="card sticky top-20">
            {!selectedDate ? (
              <EmptyState
                title="Pilih Tanggal"
                description="Klik tanggal pada kalender untuk melihat detail kegiatan."
                icon={<CalendarDays className="h-8 w-8 text-slate-400" />}
              />
            ) : selectedEvents.length === 0 ? (
              <EmptyState
                title="Tidak Ada Kegiatan"
                description={`Tidak ada kegiatan pada ${selectedDate}.`}
                icon={<CalendarDays className="h-8 w-8 text-slate-400" />}
              />
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <button onClick={() => setSelectedDate(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[500px] space-y-3 overflow-y-auto">
                  {selectedEvents.map((ev) => {
                    const style = colorCategoryStyles[ev.colorCategory];
                    return (
                      <div key={ev.id} className={cn('rounded-xl border-l-4 p-3', style.bg)} style={{ borderLeftColor: undefined }}>
                        <div className={cn('mb-2 flex items-center gap-2')}>
                          <span className={cn('h-2.5 w-2.5 rounded-full', style.dot)} />
                          <span className={cn('text-xs font-semibold', style.text)}>{ev.jenis}</span>
                          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                            {ev.status}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{ev.title}</h4>
                        <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          {(ev.startTime || ev.endTime) && (
                            <p className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ev.startTime ?? '--:--'} - {ev.endTime ?? '--:--'}
                            </p>
                          )}
                          {ev.location && (
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ev.location}
                            </p>
                          )}
                          {ev.organisasi && (
                            <p className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {ev.organisasi}
                            </p>
                          )}
                          {ev.penanggungJawab && (
                            <p className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ev.penanggungJawab}
                            </p>
                          )}
                        </div>
                        {ev.description && (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

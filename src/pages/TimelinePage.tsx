import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, CalendarRange, MapPin, Clock, User, RotateCcw } from 'lucide-react';
import {
  fetchTimelineEvents, colorCategoryStyles, colorCategoryFor,
  type TimelineEvent, type EventColorCategory,
} from '../lib/timeline';
import EmptyState from '../components/EmptyState';
import { cn } from '../utils/cn';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function pad(n: number) { return n.toString().padStart(2, '0'); }

export default function TimelinePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState<'all' | 'Agenda' | 'Peminjaman'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchTimelineEvents(year, month);
        setEvents(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (jenisFilter !== 'all' && e.jenis !== jenisFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      const q = search.toLowerCase().trim();
      if (q && !e.title.toLowerCase().includes(q) && !(e.location ?? '').toLowerCase().includes(q) && !(e.penanggungJawab ?? '').toLowerCase().includes(q)) return false;
      if (orgFilter.trim() && !(e.organisasi ?? '').toLowerCase().includes(orgFilter.toLowerCase().trim())) return false;
      return true;
    });
  }, [events, search, jenisFilter, statusFilter, orgFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    filteredEvents.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return map;
  }, [filteredEvents]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    setMonth((m) => { if (m === 0) { setYear((y) => y - 1); return 11; } return m - 1; });
  };
  const nextMonth = () => {
    setMonth((m) => { if (m === 11) { setYear((y) => y + 1); return 0; } return m + 1; });
  };

  const resetFilters = () => {
    setSearch(''); setJenisFilter('all'); setStatusFilter('all'); setOrgFilter('');
  };

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];
  const todayStr = `${year}-${pad(month + 1)}-${pad(now.getDate())}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Timeline Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kalender agenda dan peminjaman sekolah.
        </p>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {(Object.keys(colorCategoryStyles) as EventColorCategory[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
            <span className={cn('h-2.5 w-2.5 rounded-full', colorCategoryStyles[k].dot)} />
            {colorCategoryStyles[k].label}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Calendar */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={prevMonth} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{MONTH_NAMES[month]} {year}</h2>
            <button onClick={nextMonth} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ChevronRight className="h-5 w-5" /></button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-semibold text-slate-400">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    'min-h-[64px] rounded-lg border p-1.5 text-left transition',
                    isSelected ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-600',
                    isToday && !isSelected && 'border-brand-400 dark:border-brand-500',
                  )}
                >
                  <span className={cn('text-xs font-semibold', isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300')}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => {
                      const cat = colorCategoryFor(e.jenis, e.status);
                      return (
                        <div key={e.id} className={cn('truncate rounded px-1 py-0.5 text-[10px] font-medium', colorCategoryStyles[cat].bg, colorCategoryStyles[cat].text)}>
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

        {/* Right panel */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Filter</h3>
              <button onClick={resetFilters} className="text-xs font-medium text-brand-600 hover:underline">Reset</button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div>
              <label className="label">Jenis</label>
              <select className="input" value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value as any)}>
                <option value="all">Semua</option>
                <option value="Agenda">Agenda</option>
                <option value="Peminjaman">Peminjaman</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Semua</option>
                <option value="scheduled">Scheduled</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="returned">Returned</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="label">Organisasi</label>
              <input className="input" placeholder="Cari organisasi..." value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} />
            </div>
          </div>

          {/* Selected date events */}
          <div className="card">
            {selectedDate ? (
              <>
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {selectedEvents.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">Tidak ada kegiatan.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((e) => {
                      const cat = colorCategoryFor(e.jenis, e.status);
                      return (
                        <div key={e.id} className={cn('rounded-xl border p-3', colorCategoryStyles[cat].bg, 'border-transparent')}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{e.title}</p>
                            <span className={cn('shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold', colorCategoryStyles[cat].text)}>{e.jenis}</span>
                          </div>
                          <div className="mt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                            {(e.startTime || e.endTime) && (
                              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{e.startTime}{e.endTime ? ` - ${e.endTime}` : ''}</div>
                            )}
                            {e.location && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{e.location}</div>}
                            {e.organisasi && <div className="flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5" />{e.organisasi}</div>}
                            {e.penanggungJawab && <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{e.penanggungJawab}</div>}
                          </div>
                          <div className="mt-2">
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', colorCategoryStyles[cat].bg, colorCategoryStyles[cat].text)}>{e.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <EmptyState title="Pilih tanggal" description="Klik tanggal pada kalender untuk melihat detail kegiatan." icon={<CalendarRange className="h-8 w-8 text-slate-400" />} />
            )}
          </div>
        </div>
      </div>

      {loading && <p className="mt-4 text-center text-sm text-slate-500">Memuat...</p>}
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import {
  fetchTimelineEvents,
  colorCategoryStyles,
  type TimelineEvent,
  type EventColorCategory,
} from '../../lib/timeline';
import { showToast } from '../../components/Toast';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  CalendarDays,
  MapPin,
  Clock,
  User,
  RotateCcw,
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const JENIS_OPTIONS = ['all', 'Agenda', 'Peminjaman'];
const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected', 'returned', 'completed', 'scheduled', 'borrowed'];

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchTimelineEvents(year, month);
        setEvents(data);
      } catch {
        showToast('Gagal memuat timeline', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month]);

  const organisations = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => { if (e.organisasi) set.add(e.organisasi); });
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchSearch = !search || (e.title ?? '').toLowerCase().includes(search.toLowerCase());
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

  const todayStr = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  const resetFilters = () => {
    setSearch('');
    setJenisFilter('all');
    setStatusFilter('all');
    setOrgFilter('all');
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Timeline Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kalender agenda dan peminjaman</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2">
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
            <option value="all">Semua Organisasi</option>
            {organisations.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={resetFilters} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
            Reset Filter
          </button>
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
                <button onClick={nextMonth} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="pb-2 text-center text-xs font-semibold text-slate-400">
                      {d}
                    </div>
                  ))}
                  {calendarDays.map((dateStr, i) => {
                    if (!dateStr) return <div key={i} className="min-h-[80px]" />;
                    const dayEvents = eventsByDate[dateStr] ?? [];
                    const isToday = dateStr === todayStr();
                    const isSelected = selectedDate === dateStr;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`min-h-[80px] rounded-lg border p-1.5 text-left transition ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30'
                            : isToday
                            ? 'border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={`mb-1 text-xs font-medium ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          {parseInt(dateStr.split('-')[2], 10)}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((e) => {
                            const style = colorCategoryStyles[e.colorCategory];
                            return (
                              <div
                                key={e.id}
                                className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}
                              >
                                {e.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-slate-400">
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
                  {(Object.keys(colorCategoryStyles) as EventColorCategory[]).map((cat) => {
                    const style = colorCategoryStyles[cat];
                    return (
                      <div key={cat} className="flex items-center gap-1.5">
                        <span className={`h-3 w-3 rounded-full ${style.dot}`} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">{style.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right panel - selected date events */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {selectedDate ?? 'Pilih Tanggal'}
            </h2>
          </div>
          {!selectedDate ? (
            <p className="py-8 text-center text-sm text-slate-400">Klik tanggal pada kalender untuk melihat detail</p>
          ) : selectedEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Tidak ada kegiatan pada tanggal ini</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((e) => {
                const style = colorCategoryStyles[e.colorCategory];
                return (
                  <div key={e.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                      <span className={`text-xs font-medium ${style.text}`}>{e.jenis}</span>
                      <span className="ml-auto text-xs text-slate-400">{e.status}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{e.title}</p>
                    <div className="mt-2 space-y-1">
                      {(e.startTime || e.endTime) && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="h-3 w-3" />
                          {e.startTime ?? '-'}{e.endTime ? ` - ${e.endTime}` : ''}
                        </div>
                      )}
                      {e.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3 w-3" />
                          {e.location}
                        </div>
                      )}
                      {e.penanggungJawab && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <User className="h-3 w-3" />
                          {e.penanggungJawab}
                        </div>
                      )}
                      {e.description && (
                        <p className="mt-1 text-xs text-slate-400">{e.description}</p>
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

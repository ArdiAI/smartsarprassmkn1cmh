import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import {
  fetchTimelineEvents,
  colorCategoryStyles,
  type TimelineEvent,
  type EventColorCategory,
} from '../../lib/timeline';
import EmptyState from '../../components/EmptyState';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function TimelineAdminPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTimelineEvents(year, month);
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const organisasiOptions = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.organisasi) set.add(e.organisasi);
    });
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (jenisFilter !== 'all' && e.jenis !== jenisFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (orgFilter !== 'all' && e.organisasi !== orgFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !e.title.toLowerCase().includes(q) &&
          !(e.description ?? '').toLowerCase().includes(q) &&
          !(e.location ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [events, search, jenisFilter, statusFilter, orgFilter]);

  // Build map date -> events
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
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const cells: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      cells.push({ date: dateStr, day: d });
    }
    return cells;
  }, [year, month]);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  function prevMonth() {
    setCursor(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }
  function nextMonth() {
    setCursor(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  function resetFilters() {
    setSearch('');
    setJenisFilter('all');
    setStatusFilter('all');
    setOrgFilter('all');
  }

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Timeline Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kalender kegiatan sekolah: agenda dan peminjaman.
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Cari kegiatan, lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input lg:w-40" value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value)}>
            <option value="all">Semua Jenis</option>
            <option value="Agenda">Agenda</option>
            <option value="Peminjaman">Peminjaman</option>
          </select>
          <select className="input lg:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="scheduled">Terjadwal</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="borrowed">Dipinjam</option>
            <option value="returned">Dikembalikan</option>
          </select>
          <select className="input lg:w-48" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
            <option value="all">Semua Organisasi</option>
            {organisasiOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <button onClick={resetFilters} className="btn-secondary px-3 py-2.5">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Calendar */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              {MONTH_NAMES[month]} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={nextMonth} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="pb-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {d}
                  </div>
                ))}
                {calendarDays.map((cell, idx) => {
                  if (!cell.date) return <div key={idx} className="min-h-[80px] rounded-lg" />;
                  const dayEvents = eventsByDate[cell.date] ?? [];
                  const isToday = cell.date === todayStr;
                  const isSelected = cell.date === selectedDate;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(cell.date)}
                      className={`min-h-[80px] rounded-lg border p-1.5 text-left transition ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/20'
                          : isToday
                            ? 'border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/10'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className={`text-xs font-medium ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {cell.day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((e) => {
                          const style = colorCategoryStyles[e.colorCategory];
                          return (
                            <div
                              key={e.id}
                              className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] ${style.bg} ${style.text}`}
                            >
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                              <span className="truncate">{e.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <p className="px-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            +{dayEvents.length - 3} lainnya
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                {Object.entries(colorCategoryStyles).map(([key, style]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{style.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right panel: selected date events */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">
            {selectedDate ? `Kegiatan ${selectedDate}` : 'Pilih Tanggal'}
          </h2>
          {!selectedDate ? (
            <EmptyState title="Pilih tanggal" description="Klik tanggal pada kalender untuk melihat kegiatan." />
          ) : selectedEvents.length === 0 ? (
            <EmptyState title="Tidak ada kegiatan" description="Tidak ada kegiatan pada tanggal ini." />
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((e) => {
                const style = colorCategoryStyles[e.colorCategory];
                return (
                  <div key={e.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{e.title}</h3>
                        </div>
                        <div className="mt-1.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p className={`inline-block rounded px-1.5 py-0.5 ${style.bg} ${style.text}`}>
                            {e.jenis} • {style.label}
                          </p>
                          {e.startTime && (
                            <p>⏰ {e.startTime}{e.endTime ? ` - ${e.endTime}` : ''}</p>
                          )}
                          {e.location && <p>📍 {e.location}</p>}
                          {e.organisasi && <p>🏢 {e.organisasi}</p>}
                          {e.penanggungJawab && <p>👤 {e.penanggungJawab}</p>}
                          {e.description && <p className="mt-1 text-slate-600 dark:text-slate-300">{e.description}</p>}
                        </div>
                      </div>
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

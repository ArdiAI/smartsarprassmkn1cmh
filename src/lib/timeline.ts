/**
 * Fetch all timeline events (agendas + borrowings) for a given month.
 * Returns events sorted by date+time, each tagged with jenis and a color category.
 */
import { supabase } from './supabase';

export type EventJenis = 'Agenda' | 'Peminjaman';
export type EventColorCategory = 'agenda' | 'approved' | 'pending' | 'rejected' | 'borrowed' | 'returned';

export interface TimelineEvent {
  id: string;
  jenis: EventJenis;
  title: string;
  date: string;        // YYYY-MM-DD
  startTime: string | null;  // HH:mm
  endTime: string | null;     // HH:mm
  location: string | null;
  organisasi: string | null;
  penanggungJawab: string | null;
  status: string | null;
  colorCategory: EventColorCategory;
  description: string | null;
}

export function colorCategoryFor(jenis: EventJenis, status: string | null): EventColorCategory {
  if (jenis === 'Agenda') return 'agenda';
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'completed') return 'approved';
  if (s === 'pending') return 'pending';
  if (s === 'rejected' || s === 'cancelled') return 'rejected';
  if (s === 'returned') return 'returned';
  return 'pending';
}

export const colorCategoryStyles: Record<EventColorCategory, { bg: string; dot: string; text: string; label: string }> = {
  agenda: { bg: 'bg-blue-100 dark:bg-blue-900/30', dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', label: 'Agenda' },
  approved: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', label: 'Disetujui' },
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', label: 'Menunggu' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300', label: 'Ditolak' },
  borrowed: { bg: 'bg-purple-100 dark:bg-purple-900/30', dot: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', label: 'Sedang Dipinjam' },
  returned: { bg: 'bg-slate-100 dark:bg-slate-700/30', dot: 'bg-slate-400', text: 'text-slate-700 dark:text-slate-300', label: 'Dikembalikan' },
};

export async function fetchTimelineEvents(year: number, month: number): Promise<TimelineEvent[]> {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  const [agendasRes, borrowingsRes] = await Promise.all([
    supabase.from('agendas').select('*').gte('event_date', startOfMonth.toISOString().slice(0, 10)).lte('event_date', endOfMonth.toISOString().slice(0, 10)),
    supabase.from('borrowings').select('id, borrower_name, borrower_class, borrow_date, return_date, status, purpose, facility_id, item_type, current_status_label').gte('borrow_date', startOfMonth.toISOString().slice(0, 10)).lte('borrow_date', endOfMonth.toISOString().slice(0, 10)),
  ]);

  const events: TimelineEvent[] = [];

  if (agendasRes.data) {
    for (const a of agendasRes.data as any[]) {
      events.push({
        id: a.id,
        jenis: 'Agenda',
        title: a.title || 'Agenda',
        date: a.event_date,
        startTime: a.start_time ? String(a.start_time).slice(0, 5) : null,
        endTime: a.end_time ? String(a.end_time).slice(0, 5) : null,
        location: a.location || null,
        organisasi: a.organisasi_jurusan || a.penyelenggara || a.organizer || null,
        penanggungJawab: a.penanggung_jawab || null,
        status: a.status || null,
        colorCategory: colorCategoryFor('Agenda', a.status),
        description: a.description || null,
      });
    }
  }

  if (borrowingsRes.data) {
    for (const b of borrowingsRes.data as any[]) {
      const status = b.status || 'pending';
      events.push({
        id: b.id,
        jenis: 'Peminjaman',
        title: b.purpose || 'Peminjaman',
        date: b.borrow_date,
        startTime: b.borrow_date ? null : null,
        endTime: null,
        location: null,
        organisasi: b.borrower_class || null,
        penanggungJawab: b.borrower_name || null,
        status,
        colorCategory: colorCategoryFor('Peminjaman', status),
        description: b.current_status_label || null,
      });
    }
  }

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.startTime && b.startTime) return a.startTime < b.startTime ? -1 : 1;
    return 0;
  });

  return events;
}

export async function fetchTodayCounts(): Promise<{ agendaToday: number; borrowToday: number; weekTotal: number }> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const [aToday, bToday, aWeek, bWeek] = await Promise.all([
    supabase.from('agendas').select('id', { count: 'exact', head: true }).eq('event_date', todayStr),
    supabase.from('borrowings').select('id', { count: 'exact', head: true }).eq('borrow_date', todayStr),
    supabase.from('agendas').select('id', { count: 'exact', head: true }).gte('event_date', weekStart.toISOString().slice(0, 10)).lte('event_date', weekEnd.toISOString().slice(0, 10)),
    supabase.from('borrowings').select('id', { count: 'exact', head: true }).gte('borrow_date', weekStart.toISOString().slice(0, 10)).lte('borrow_date', weekEnd.toISOString().slice(0, 10)),
  ]);

  return {
    agendaToday: aToday.count || 0,
    borrowToday: bToday.count || 0,
    weekTotal: (aWeek.count || 0) + (bWeek.count || 0),
  };
}

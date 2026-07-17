import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { AlertTriangle, Filter, Check, Clock, Wrench, X } from 'lucide-react';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  resolution_notes: string;
  created_at: string;
  reporter_unit: string;
  location: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const SEVERITY_LABELS: Record<string, string> = { minor: 'Ringan', moderate: 'Sedang', severe: 'Berat' };
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};
const STATUS_LABELS: Record<string, string> = { pending: 'Menunggu', in_progress: 'Diproses', resolved: 'Selesai' };
const STATUS_ICONS: Record<string, typeof Clock> = { pending: Clock, in_progress: Wrench, resolved: Check };

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase.from('damage_reports').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    if (data) {
      setReports(data as DamageReport[]);
      const notes: Record<string, string> = {};
      (data as DamageReport[]).forEach(r => { notes[r.id] = r.resolution_notes || ''; });
      setNotesMap(notes);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    const notes = notesMap[id] || '';
    const payload: any = { status, resolution_notes: notes };
    if (status === 'resolved') payload.resolved_at = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('damage_reports').update(payload).eq('id', id);
    if (error) alert(error.message); else fetchData();
    setUpdatingId(null);
  }

  const filtered = reports.filter(r =>
    (!severityFilter || r.severity === severityFilter) &&
    (!statusFilter || r.status === statusFilter)
  );

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-500" /> Laporan Kerusakan
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Kelola dan update status laporan kerusakan</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
            <option value="">Semua Tingkat</option>
            <option value="minor">Ringan</option><option value="moderate">Sedang</option><option value="severe">Berat</option>
          </select>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
          <option value="">Semua Status</option>
          <option value="pending">Menunggu</option><option value="in_progress">Diproses</option><option value="resolved">Selesai</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const StatusIcon = STATUS_ICONS[r.status];
            return (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm text-slate-900 dark:text-white">{r.reporter_name}</span>
                      {r.reporter_unit && <span className="text-xs text-slate-400">{r.reporter_unit}</span>}
                    </div>
                    <p className="text-xs text-slate-400">{fmtDate(r.created_at)}{r.location && ` · ${r.location}`}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', SEVERITY_COLORS[r.severity])}>{SEVERITY_LABELS[r.severity]}</span>
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1', STATUS_COLORS[r.status])}><StatusIcon className="w-3 h-3" /> {STATUS_LABELS[r.status]}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{r.description}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="text" placeholder="Catatan penyelesaian..." value={notesMap[r.id] || ''} onChange={e => setNotesMap({ ...notesMap, [r.id]: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 text-sm text-slate-900 dark:text-white" />
                  <div className="flex gap-1">
                    {r.status !== 'pending' && <button onClick={() => updateStatus(r.id, 'pending')} disabled={updatingId === r.id} className="px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-600 text-xs font-medium hover:bg-amber-200 disabled:opacity-50">Menunggu</button>}
                    {r.status !== 'in_progress' && <button onClick={() => updateStatus(r.id, 'in_progress')} disabled={updatingId === r.id} className="px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 text-xs font-medium hover:bg-blue-200 disabled:opacity-50">Proses</button>}
                    {r.status !== 'resolved' && <button onClick={() => updateStatus(r.id, 'resolved')} disabled={updatingId === r.id} className="px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 text-xs font-medium hover:bg-emerald-200 disabled:opacity-50">Selesai</button>}
                  </div>
                </div>
                {r.resolution_notes && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/40 p-2 rounded-lg">Catatan: {r.resolution_notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

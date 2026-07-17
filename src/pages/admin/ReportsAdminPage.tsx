import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Filter, X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface DamageReport {
  id: string; reporter_name: string; description: string; severity: string;
  status: string; location: string; created_at: string; resolution_notes: string | null;
  inventory?: { name: string } | null;
}
interface EditState { status: string; resolution_notes: string; }

const severityColor: Record<string, string> = {
  minor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const severityLabel: Record<string, string> = { minor: 'Minor', moderate: 'Moderate', severe: 'Berat' };
const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};
const statusLabel: Record<string, string> = { pending: 'Menunggu', in_progress: 'Diproses', resolved: 'Selesai' };

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editing, setEditing] = useState<DamageReport | null>(null);
  const [editForm, setEditForm] = useState<EditState>({ status: '', resolution_notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('damage_reports')
      .select('id, reporter_name, description, severity, status, location, created_at, resolution_notes, inventory(name)')
      .order('created_at', { ascending: false });
    setReports((data as unknown as DamageReport[]) || []);
    setLoading(false);
  }

  function openEdit(r: DamageReport) {
    setEditing(r);
    setEditForm({ status: r.status, resolution_notes: r.resolution_notes || '' });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    await supabase.from('damage_reports').update({
      status: editForm.status,
      resolution_notes: editForm.resolution_notes,
      resolved_at: editForm.status === 'resolved' ? new Date().toISOString().slice(0, 10) : null,
    }).eq('id', editing.id);
    setSaving(false); setEditing(null); fetch();
  }

  const filtered = reports.filter(r =>
    (filterSeverity === 'all' || r.severity === filterSeverity) &&
    (filterStatus === 'all' || r.status === filterStatus)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-slate-600 dark:text-slate-400">Tinjau dan kelola laporan kerusakan</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white appearance-none">
            <option value="all">Semua Severity</option>
            <option value="minor">Minor</option><option value="moderate">Moderate</option><option value="severe">Berat</option>
          </select>
        </div>
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white appearance-none">
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option><option value="in_progress">Diproses</option><option value="resolved">Selesai</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Tidak ada laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">{r.reporter_name || 'Anonim'}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityColor[r.severity] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>{severityLabel[r.severity] || r.severity}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor[r.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>{statusLabel[r.status] || r.status}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{r.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {r.inventory?.name && <span>Item: {r.inventory.name}</span>}
                    {r.location && <span>Lokasi: {r.location}</span>}
                    <span>{new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
                <button onClick={() => openEdit(r)} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 whitespace-nowrap">Update</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Update Laporan</h2>
              <button onClick={() => setEditing(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="pending">Menunggu</option><option value="in_progress">Diproses</option><option value="resolved">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Catatan Resolusi</label>
                <textarea value={editForm.resolution_notes} onChange={e => setEditForm(f => ({ ...f, resolution_notes: e.target.value }))} rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : <><Save className="w-4 h-4" /> Simpan</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

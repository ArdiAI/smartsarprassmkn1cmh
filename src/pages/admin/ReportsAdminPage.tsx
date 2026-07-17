import { useEffect, useState } from 'react';
import {
  FileText, Loader2, AlertCircle, CheckCircle2, Clock, Wrench, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string;
  image_url: string | null;
  severity: 'minor' | 'moderate' | 'severe' | null;
  status: 'pending' | 'in_progress' | 'resolved' | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  location: string | null;
}

const severityConfig: Record<string, { label: string; class: string }> = {
  minor: { label: 'Minor', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  moderate: { label: 'Moderate', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  severe: { label: 'Severe', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const statusConfig: Record<string, { label: string; class: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  in_progress: { label: 'Diproses', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Wrench },
  resolved: { label: 'Selesai', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
};

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data as unknown as DamageReport[]) || []);
    } catch (err) {
      console.error('Fetch reports error:', err);
      showToast('Gagal memuat laporan kerusakan', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(report: DamageReport, newStatus: 'pending' | 'in_progress' | 'resolved') {
    setUpdating(true);
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
      };
      if (newStatus === 'resolved') {
        payload.resolved_at = new Date().toISOString();
        if (resolutionNotes.trim()) {
          payload.resolution_notes = resolutionNotes.trim();
        }
      }

      const { error } = await supabase.from('damage_reports').update(payload).eq('id', report.id);
      if (error) throw error;

      showToast(`Status diperbarui ke "${statusConfig[newStatus].label}"`, 'success');
      setResolutionNotes('');
      setSelectedReport(null);
      await fetchReports();
    } catch (err) {
      console.error('Update status error:', err);
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setUpdating(false);
    }
  }

  const filtered = reports.filter((r) => {
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola laporan kerusakan barang dan fasilitas
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400">Tingkat:</span>
        {['all', 'minor', 'moderate', 'severe'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterSeverity(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filterSeverity === s
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
            )}
          >
            {s === 'all' ? 'Semua' : severityConfig[s].label}
          </button>
        ))}
        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">Status:</span>
        {['all', 'pending', 'in_progress', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filterStatus === s
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
            )}
          >
            {s === 'all' ? 'Semua' : statusConfig[s].label}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada laporan kerusakan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((report) => {
            const sc = statusConfig[report.status ?? 'pending'] ?? statusConfig.pending;
            const sv = severityConfig[report.severity ?? 'minor'] ?? severityConfig.minor;
            const StatusIcon = sc.icon;
            return (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {report.reporter_name ?? 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {report.reporter_unit ?? '-'} • {new Date(report.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', sv.class)}>
                      {sv.label}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1', sc.class)}>
                      <StatusIcon className="w-3 h-3" />
                      {sc.label}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300">{report.description ?? '-'}</p>

                {report.location && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">📍 {report.location}</p>
                )}

                {report.image_url && (
                  <a
                    href={report.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Lihat Foto
                  </a>
                )}

                {(report.reporter_email || report.reporter_phone) && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    {report.reporter_email && <p>✉️ {report.reporter_email}</p>}
                    {report.reporter_phone && <p>📞 {report.reporter_phone}</p>}
                  </div>
                )}

                {report.resolution_notes && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Catatan Penyelesaian:</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{report.resolution_notes}</p>
                  </div>
                )}

                {/* Status update buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {report.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(report, 'in_progress')}
                      disabled={updating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Proses</span>
                    </button>
                  )}
                  {report.status === 'in_progress' && (
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setResolutionNotes(report.resolution_notes ?? '');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Selesaikan</span>
                    </button>
                  )}
                  {report.status === 'resolved' && (
                    <button
                      onClick={() => updateStatus(report, 'in_progress')}
                      disabled={updating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Reopen</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Selesaikan Laporan</h3>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">Pelapor</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedReport.reporter_name ?? '-'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Deskripsi</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedReport.description ?? '-'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">Catatan Penyelesaian</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Jelaskan tindakan perbaikan yang dilakukan..."
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => updateStatus(selectedReport, 'resolved')}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Selesaikan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

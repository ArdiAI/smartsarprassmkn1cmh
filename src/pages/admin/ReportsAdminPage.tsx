import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  AlertTriangle, Loader2, X, MapPin, Clock, CheckCircle, Wrench,
} from 'lucide-react';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string;
  image_url: string | null;
  severity: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  location: string | null;
}

const severityConfig: Record<string, { label: string; color: string }> = {
  minor: { label: 'Ringan', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  moderate: { label: 'Sedang', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  severe: { label: 'Berat', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const statusFlow: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'resolved',
};

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolveModal, setResolveModal] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat laporan kerusakan', 'error');
    } else {
      setReports((data as unknown as DamageReport[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = reports.filter(r => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const advanceStatus = async (report: DamageReport) => {
    const nextStatus = statusFlow[report.status];
    if (!nextStatus) return;
    const { error } = await supabase
      .from('damage_reports')
      .update({
        status: nextStatus,
        resolved_at: nextStatus === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', report.id);
    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast(`Status diperbarui ke ${statusConfig[nextStatus].label}`, 'success');
      fetchReports();
    }
  };

  const openResolve = (report: DamageReport) => {
    setResolveModal(report);
    setResolutionNotes(report.resolution_notes ?? '');
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    setSaving(true);
    const { error } = await supabase
      .from('damage_reports')
      .update({
        status: 'resolved',
        resolution_notes: resolutionNotes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', resolveModal.id);
    if (error) {
      showToast('Gagal menyelesaikan laporan', 'error');
    } else {
      showToast('Laporan berhasil diselesaikan', 'success');
      fetchReports();
      setResolveModal(null);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola laporan kerusakan barang</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Severity</option>
          <option value="minor">Ringan</option>
          <option value="moderate">Sedang</option>
          <option value="severe">Berat</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada laporan kerusakan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(report => {
            const sev = severityConfig[report.severity] ?? severityConfig.minor;
            const st = statusConfig[report.status] ?? statusConfig.pending;
            const canAdvance = report.status !== 'resolved';
            return (
              <div key={report.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', sev.color)}>
                        {sev.label}
                      </span>
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', st.color)}>
                        {st.label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                      {report.reporter_name ?? 'N/A'}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{report.description ?? '-'}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {report.reporter_unit && <span>Unit: {report.reporter_unit}</span>}
                      {report.reporter_email && <span>Email: {report.reporter_email}</span>}
                      {report.reporter_phone && <span>Telp: {report.reporter_phone}</span>}
                      {report.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {report.location}
                        </span>
                      )}
                    </div>
                    {report.resolution_notes && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">Catatan Penyelesaian:</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{report.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                  {report.image_url && (
                    <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-700">
                      <img
                        src={report.image_url}
                        alt="Damage"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
                {canAdvance && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    {report.status === 'pending' && (
                      <button
                        onClick={() => advanceStatus(report)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Wrench className="w-4 h-4" /> Proses Laporan
                      </button>
                    )}
                    <button
                      onClick={() => openResolve(report)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Selesaikan
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Selesaikan Laporan</h3>
              <button onClick={() => setResolveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Pelapor</p>
                <p className="font-medium text-slate-900 dark:text-white">{resolveModal.reporter_name ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Deskripsi Kerusakan</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{resolveModal.description ?? '-'}</p>
              </div>
              <div>
                <label className="label">Catatan Penyelesaian</label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Tindakan yang diambil..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setResolveModal(null)} className="btn-secondary">Batal</button>
                <button
                  onClick={handleResolve}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Selesaikan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

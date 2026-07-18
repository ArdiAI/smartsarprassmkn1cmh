import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  Wrench, Loader2, Search, AlertTriangle, MapPin, User, Mail, Phone, X, Save,
} from 'lucide-react';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string | null;
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
  inventory?: { name: string } | null;
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
  const { hasPermission } = useAuth();
  const canManage = hasPermission('reports', 'manage');

  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [manageId, setManageId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*, inventory(name)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat laporan kerusakan', 'error');
      setLoading(false);
      return;
    }
    setReports((data as unknown as DamageReport[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = reports.filter(r => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.reporter_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openManage = (report: DamageReport) => {
    setManageId(report.id);
    setResolutionNotes(report.resolution_notes ?? '');
  };

  const handleAdvanceStatus = async (report: DamageReport) => {
    const next = statusFlow[report.status];
    if (!next) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status: next,
        resolution_notes: resolutionNotes || null,
      };
      if (next === 'resolved') {
        payload.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('damage_reports').update(payload).eq('id', report.id);
      if (error) throw error;
      showToast(`Status diperbarui ke "${statusConfig[next].label}"`, 'success');
      setManageId(null);
      await fetchReports();
    } catch (e) {
      console.error(e);
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async (report: DamageReport) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('damage_reports')
        .update({ resolution_notes: resolutionNotes || null })
        .eq('id', report.id);
      if (error) throw error;
      showToast('Catatan resolusi disimpan', 'success');
      setManageId(null);
      await fetchReports();
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan catatan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const managingReport = reports.find(r => r.id === manageId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Tindak lanjut laporan kerusakan barang</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pelapor, deskripsi, atau lokasi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="input sm:w-40">
          <option value="all">Semua Tingkat</option>
          <option value="minor">Ringan</option>
          <option value="moderate">Sedang</option>
          <option value="severe">Berat</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input sm:w-40">
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(report => {
            const sev = severityConfig[report.severity] || severityConfig.minor;
            const st = statusConfig[report.status] || statusConfig.pending;
            return (
              <div key={report.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{report.reporter_name}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sev.color)}>{sev.label}</span>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', st.color)}>{st.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{report.description ?? '-'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm text-slate-500 dark:text-slate-400">
                      {report.inventory?.name && (
                        <span className="flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5" /> {report.inventory.name}
                        </span>
                      )}
                      {report.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> {report.location}
                        </span>
                      )}
                      {report.reporter_unit && (
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> {report.reporter_unit}
                        </span>
                      )}
                      {report.reporter_email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> {report.reporter_email}
                        </span>
                      )}
                      {report.reporter_phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> {report.reporter_phone}
                        </span>
                      )}
                    </div>
                    {report.resolution_notes && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-medium">Catatan resolusi: </span>{report.resolution_notes}
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Dilaporkan: {new Date(report.created_at).toLocaleString('id-ID')}
                      {report.resolved_at && ` · Selesai: ${new Date(report.resolved_at).toLocaleString('id-ID')}`}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => openManage(report)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors flex-shrink-0"
                    >
                      <AlertTriangle className="w-4 h-4" /> Kelola
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manage Modal */}
      {managingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Kelola Laporan</h2>
              <button onClick={() => setManageId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', (severityConfig[managingReport.severity] || severityConfig.minor).color)}>
                  {(severityConfig[managingReport.severity] || severityConfig.minor).label}
                </span>
                <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', (statusConfig[managingReport.status] || statusConfig.pending).color)}>
                  Status: {(statusConfig[managingReport.status] || statusConfig.pending).label}
                </span>
              </div>
              <div>
                <label className="label">Catatan Resolusi</label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Tulis catatan tindak lanjut..."
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setManageId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleSaveNotes(managingReport)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-300 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Catatan
                </button>
                {statusFlow[managingReport.status] && (
                  <button
                    onClick={() => handleAdvanceStatus(managingReport)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    Lanjutkan ke "{statusConfig[statusFlow[managingReport.status]].label}"
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

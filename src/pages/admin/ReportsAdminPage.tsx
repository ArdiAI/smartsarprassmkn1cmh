import { useEffect, useState } from 'react';
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  MapPin,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string;
  image_url: string | null;
  severity: string | null;
  status: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  location: string | null;
}

interface DamageReportWithItem extends DamageReport {
  inventory_name: string | null;
}

const severityStyles: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const severityLabel: Record<string, string> = {
  minor: 'Ringan',
  moderate: 'Sedang',
  severe: 'Berat',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Dalam Proses',
  resolved: 'Selesai',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: Wrench,
  resolved: CheckCircle,
};

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReportWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [resolutionModal, setResolutionModal] = useState<DamageReportWithItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Gagal memuat laporan', 'error');
      setLoading(false);
      return;
    }

    const reportData = (data || []) as unknown as DamageReport[];
    const result: DamageReportWithItem[] = [];

    for (const r of reportData) {
      let inventoryName: string | null = null;
      if (r.inventory_id) {
        const { data: inv } = await supabase
          .from('inventory')
          .select('name')
          .eq('id', r.inventory_id)
          .single();
        inventoryName = inv?.name ?? null;
      }
      result.push({ ...r, inventory_name: inventoryName });
    }

    setReports(result);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const updateStatus = async (report: DamageReportWithItem, newStatus: string) => {
    setUpdatingId(report.id);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString().slice(0, 10);
    }

    const { error } = await supabase
      .from('damage_reports')
      .update(updates)
      .eq('id', report.id);

    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast('Status berhasil diperbarui', 'success');
      loadReports();
    }
    setUpdatingId(null);
  };

  const handleResolve = async () => {
    if (!resolutionModal) return;
    setUpdatingId(resolutionModal.id);
    const { error } = await supabase
      .from('damage_reports')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString().slice(0, 10),
        resolution_notes: resolutionNotes || null,
      })
      .eq('id', resolutionModal.id);

    if (error) {
      showToast('Gagal menyelesaikan laporan', 'error');
    } else {
      showToast('Laporan berhasil diselesaikan', 'success');
      setResolutionModal(null);
      setResolutionNotes('');
      loadReports();
    }
    setUpdatingId(null);
  };

  const filtered = reports.filter((r) => {
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola laporan kerusakan barang dan fasilitas
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Tingkat Kerusakan</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua</option>
            <option value="minor">Ringan</option>
            <option value="moderate">Sedang</option>
            <option value="severe">Berat</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua</option>
            <option value="pending">Menunggu</option>
            <option value="in_progress">Dalam Proses</option>
            <option value="resolved">Selesai</option>
          </select>
        </div>
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-400">Tidak ada laporan kerusakan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((report) => {
            const StatusIcon = statusIcons[report.status || 'pending'] || Clock;
            return (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {report.inventory_name || 'Barang tidak dikenal'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(report.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {report.severity && (
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium',
                          severityStyles[report.severity] || severityStyles.minor
                        )}
                      >
                        {severityLabel[report.severity] || report.severity}
                      </span>
                    )}
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1',
                        statusStyles[report.status || 'pending'] || statusStyles.pending
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusLabel[report.status || 'pending'] || report.status}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {report.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> {report.reporter_name}
                    {report.reporter_unit && ` (${report.reporter_unit})`}
                  </div>
                  {report.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {report.location}
                    </div>
                  )}
                  {report.reporter_email && (
                    <div className="flex items-center gap-1.5 truncate">
                      {report.reporter_email}
                    </div>
                  )}
                </div>

                {report.resolution_notes && (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                    <p className="font-medium mb-0.5">Catatan Penyelesaian:</p>
                    {report.resolution_notes}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  {report.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(report, 'in_progress')}
                      disabled={updatingId === report.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      {updatingId === report.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wrench className="w-4 h-4" />
                      )}
                      Proses
                    </button>
                  )}
                  {report.status === 'in_progress' && (
                    <button
                      onClick={() => {
                        setResolutionModal(report);
                        setResolutionNotes(report.resolution_notes || '');
                      }}
                      disabled={updatingId === report.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Selesaikan
                    </button>
                  )}
                  {report.status !== 'resolved' && (
                    <button
                      onClick={() => {
                        setResolutionModal(report);
                        setResolutionNotes(report.resolution_notes || '');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Catatan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution modal */}
      {resolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {resolutionModal.status === 'resolved' ? 'Catatan Penyelesaian' : 'Selesaikan Laporan'}
              </h2>
              <button
                onClick={() => setResolutionModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <FileText className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Barang</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {resolutionModal.inventory_name || 'Tidak dikenal'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Catatan Penyelesaian
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Jelaskan tindakan yang diambil..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setResolutionModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleResolve}
                  disabled={updatingId === resolutionModal.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  {updatingId === resolutionModal.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {resolutionModal.status === 'resolved' ? 'Simpan' : 'Selesaikan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

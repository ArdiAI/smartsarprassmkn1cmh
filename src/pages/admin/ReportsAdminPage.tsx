import { useEffect, useState } from 'react';
import { FileWarning, Filter, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string;
  image_url: string;
  severity: string;
  status: string;
  resolution_notes: string;
  created_at: string;
  resolved_at: string;
  reporter_unit: string;
  reporter_email: string;
  reporter_phone: string;
  location: string;
}

const severityStyles: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const severityLabels: Record<string, string> = {
  minor: 'Ringan',
  moderate: 'Sedang',
  severe: 'Berat',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newStatus, setNewStatus] = useState('pending');

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase.from('damage_reports').select('*').order('created_at', { ascending: false });
    setReports((data as unknown as DamageReport[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = reports.filter((r) => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const openModal = (report: DamageReport) => {
    setActiveReport(report);
    setResolutionNotes(report.resolution_notes ?? '');
    setNewStatus(report.status ?? 'pending');
    setModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!activeReport) return;
    const isResolved = newStatus === 'resolved';
    const { error } = await supabase
      .from('damage_reports')
      .update({
        status: newStatus,
        resolution_notes: resolutionNotes || null,
        resolved_at: isResolved ? new Date().toISOString() : null,
      })
      .eq('id', activeReport.id);
    if (error) {
      showToast('Gagal memperbarui laporan', 'error');
      return;
    }
    showToast('Laporan diperbarui', 'success');
    setModalOpen(false);
    await fetchReports();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Laporan Kerusakan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tinjau dan tangani laporan kerusakan</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" /> Filter:
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="all">Semua Tingkat</option>
          <option value="minor">Ringan</option>
          <option value="moderate">Sedang</option>
          <option value="severe">Berat</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
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
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <FileWarning className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    report.severity === 'severe' ? 'bg-red-50 dark:bg-red-900/20' : report.severity === 'moderate' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'
                  )}>
                    <AlertTriangle className={cn(
                      'w-5 h-5',
                      report.severity === 'severe' ? 'text-red-600 dark:text-red-400' : report.severity === 'moderate' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{report.reporter_name ?? 'N/A'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {report.reporter_unit ?? ''} • {new Date(report.created_at ?? '').toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', severityStyles[report.severity] ?? severityStyles.minor)}>
                    {severityLabels[report.severity] ?? report.severity}
                  </span>
                  <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[report.status] ?? statusStyles.pending)}>
                    {statusLabels[report.status] ?? report.status}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{report.description ?? ''}</p>

              {report.location && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Lokasi: {report.location}</p>
              )}

              {report.resolution_notes && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Catatan Penyelesaian:</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{report.resolution_notes}</p>
                </div>
              )}

              <button
                onClick={() => openModal(report)}
                className="w-full mt-4 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <Clock className="w-4 h-4" /> Tangani Laporan
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tangani Laporan</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <p className="font-medium text-slate-800 dark:text-white">{activeReport.reporter_name ?? 'N/A'}</p>
                <p className="text-xs mt-1">{activeReport.description ?? ''}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="pending">Menunggu</option>
                  <option value="in_progress">Diproses</option>
                  <option value="resolved">Selesai</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Catatan Penyelesaian</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Tulis catatan penyelesaian..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleUpdate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

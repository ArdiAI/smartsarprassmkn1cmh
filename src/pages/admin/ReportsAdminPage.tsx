import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';
import {
  FileWarning,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
} from 'lucide-react';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string | null;
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

interface InventoryName {
  id: string;
  name: string;
}

const severityColors: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const severityLabels: Record<string, string> = {
  minor: 'Ringan',
  moderate: 'Sedang',
  severe: 'Berat',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
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
      showToast('Gagal memuat laporan', 'error');
    } else {
      const reportsData = (data as unknown as DamageReport[]) || [];
      setReports(reportsData);
      // Fetch inventory names
      const invIds = reportsData.map(r => r.inventory_id).filter(Boolean) as string[];
      if (invIds.length > 0) {
        const { data: invData } = await supabase
          .from('inventory')
          .select('id, name')
          .in('id', invIds);
        const map: Record<string, string> = {};
        (invData as unknown as InventoryName[])?.forEach(i => {
          map[i.id] = i.name;
        });
        setInventoryMap(map);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = reports.filter(r => {
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const updateStatus = async (report: DamageReport, newStatus: string) => {
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'resolved') {
        payload.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('damage_reports').update(payload).eq('id', report.id);
      if (error) throw error;
      showToast('Status laporan diperbarui', 'success');
      await fetchReports();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    }
  };

  const openResolve = (report: DamageReport) => {
    setResolveModal(report);
    setResolutionNotes(report.resolution_notes ?? '');
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('damage_reports')
        .update({
          status: 'resolved',
          resolution_notes: resolutionNotes.trim() || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', resolveModal.id);
      if (error) throw error;
      showToast('Laporan diselesaikan', 'success');
      setResolveModal(null);
      await fetchReports();
    } catch {
      showToast('Gagal menyelesaikan laporan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola laporan kerusakan barang</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Keparahan</label>
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Semua</option>
            <option value="pending">Menunggu</option>
            <option value="in_progress">Diproses</option>
            <option value="resolved">Selesai</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center">
          <FileWarning className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      report.severity === 'severe'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : report.severity === 'moderate'
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : 'bg-emerald-100 dark:bg-emerald-900/30'
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        'w-5 h-5',
                        report.severity === 'severe'
                          ? 'text-red-500'
                          : report.severity === 'moderate'
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {report.inventory_id ? (inventoryMap[report.inventory_id] ?? 'Barang') : 'Barang'}
                      </p>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-medium',
                          severityColors[report.severity ?? 'minor']
                        )}
                      >
                        {severityLabels[report.severity ?? 'minor'] ?? report.severity}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-medium',
                          statusColors[report.status ?? 'pending']
                        )}
                      >
                        {statusLabels[report.status ?? 'pending'] ?? report.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{report.description ?? '—'}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                      <span>Pelapor: {report.reporter_name ?? '—'}</span>
                      {report.reporter_unit && <span>• Unit: {report.reporter_unit}</span>}
                      {report.location && <span>• Lokasi: {report.location}</span>}
                      <span>• {new Date(report.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    {report.reporter_email && (
                      <p className="text-xs text-slate-400 mt-1">
                        📧 {report.reporter_email}
                        {report.reporter_phone ? ` • 📞 ${report.reporter_phone}` : ''}
                      </p>
                    )}
                    {report.resolution_notes && (
                      <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-xs text-emerald-700 dark:text-emerald-400">
                        <strong>Catatan penyelesaian:</strong> {report.resolution_notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                {report.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(report, 'in_progress')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Proses
                  </button>
                )}
                {report.status !== 'resolved' && (
                  <button
                    onClick={() => openResolve(report)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Selesaikan
                  </button>
                )}
                {report.status === 'resolved' && report.resolved_at && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Diselesaikan {new Date(report.resolved_at).toLocaleDateString('id-ID')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Selesaikan Laporan</h3>
              <button onClick={() => setResolveModal(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {resolveModal.description ?? '—'}
            </p>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Catatan Penyelesaian</label>
              <textarea
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                rows={4}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Jelaskan tindakan yang diambil..."
              />
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleResolve}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Selesaikan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

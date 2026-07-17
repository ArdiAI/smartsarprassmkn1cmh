import { useEffect, useState, useCallback } from 'react';
import { Loader2, FileWarning, MapPin, User, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface DamageReportRow {
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

interface InventoryRow {
  id: string;
  name: string;
}

const severityColors: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const severityLabels: Record<string, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  severe: 'Severe',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Sedang Diproses',
  resolved: 'Selesai',
};

const nextStatus: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'resolved',
};

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReportRow[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Gagal memuat laporan', 'error');
    } else {
      const rows = (data as unknown as DamageReportRow[]) ?? [];
      setReports(rows);

      const invIds = new Set<string>();
      rows.forEach(r => {
        if (r.inventory_id) invIds.add(r.inventory_id);
      });
      if (invIds.size > 0) {
        const { data: invData } = await supabase
          .from('inventory')
          .select('id, name')
          .in('id', Array.from(invIds));
        const map: Record<string, string> = {};
        ((invData as unknown as InventoryRow[]) ?? []).forEach(i => {
          map[i.id] = i.name;
        });
        setInventoryMap(map);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = reports.filter(r => {
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const handleUpdateStatus = async (report: DamageReportRow, newStatus: string) => {
    setUpdating(report.id);
    const updates: Record<string, unknown> = {
      status: newStatus,
    };

    if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
      if (resolutionText.trim()) {
        updates.resolution_notes = resolutionText.trim();
      }
    }

    const { error } = await supabase.from('damage_reports').update(updates).eq('id', report.id);

    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast(`Status diperbarui ke: ${statusLabels[newStatus] ?? newStatus}`, 'success');
      setDetailId(null);
      setResolutionText('');
      fetchData();
    }
    setUpdating(null);
  };

  const detailReport = detailId ? reports.find(r => r.id === detailId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola laporan kerusakan barang dan fasilitas
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Severity</label>
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Semua</option>
            <option value="minor">Minor</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Semua</option>
            <option value="pending">Menunggu</option>
            <option value="in_progress">Sedang Diproses</option>
            <option value="resolved">Selesai</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
          <FileWarning className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-slate-400 dark:text-slate-500">Tidak ada laporan ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {report.image_url ? (
                    <img
                      src={report.image_url}
                      alt="damage"
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <FileWarning className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-medium',
                          severityColors[report.severity] ?? severityColors.minor
                        )}
                      >
                        {severityLabels[report.severity] ?? report.severity}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-medium',
                          statusColors[report.status] ?? statusColors.pending
                        )}
                      >
                        {statusLabels[report.status] ?? report.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      {report.inventory_id ? (inventoryMap[report.inventory_id] ?? 'Item') : 'Item tidak diketahui'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {report.reporter_name}
                      </span>
                      {report.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {report.location}
                        </span>
                      )}
                      <span>{new Date(report.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDetailId(report.id);
                    setResolutionText(report.resolution_notes ?? '');
                  }}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0"
                >
                  Kelola
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Detail Laporan</h2>
              <button onClick={() => setDetailId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {detailReport.image_url && (
                <img
                  src={detailReport.image_url}
                  alt="damage"
                  className="w-full h-48 rounded-xl object-cover"
                />
              )}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium',
                    severityColors[detailReport.severity] ?? severityColors.minor
                  )}
                >
                  {severityLabels[detailReport.severity] ?? detailReport.severity}
                </span>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium',
                    statusColors[detailReport.status] ?? statusColors.pending
                  )}
                >
                  {statusLabels[detailReport.status] ?? detailReport.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Pelapor</p>
                  <p className="text-slate-700 dark:text-slate-200">{detailReport.reporter_name}</p>
                </div>
                {detailReport.reporter_unit && (
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Unit</p>
                    <p className="text-slate-700 dark:text-slate-200">{detailReport.reporter_unit}</p>
                  </div>
                )}
                {detailReport.reporter_email && (
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Email</p>
                    <p className="text-slate-700 dark:text-slate-200">{detailReport.reporter_email}</p>
                  </div>
                )}
                {detailReport.reporter_phone && (
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Telepon</p>
                    <p className="text-slate-700 dark:text-slate-200">{detailReport.reporter_phone}</p>
                  </div>
                )}
                {detailReport.location && (
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Lokasi</p>
                    <p className="text-slate-700 dark:text-slate-200">{detailReport.location}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Deskripsi</p>
                  <p className="text-slate-700 dark:text-slate-200">{detailReport.description}</p>
                </div>
                {detailReport.resolution_notes && (
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Catatan Resolusi</p>
                    <p className="text-slate-700 dark:text-slate-200">{detailReport.resolution_notes}</p>
                  </div>
                )}
              </div>

              {/* Resolution notes input */}
              {detailReport.status !== 'resolved' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Catatan Resolusi
                  </label>
                  <textarea
                    value={resolutionText}
                    onChange={e => setResolutionText(e.target.value)}
                    rows={3}
                    placeholder="Tambahkan catatan resolusi..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
              )}

              {/* Action buttons */}
              {detailReport.status !== 'resolved' && nextStatus[detailReport.status] && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdateStatus(detailReport, nextStatus[detailReport.status])}
                    disabled={updating === detailReport.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {updating === detailReport.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : nextStatus[detailReport.status] === 'resolved' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : null}
                    {nextStatus[detailReport.status] === 'in_progress' ? 'Proses' : 'Selesaikan'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

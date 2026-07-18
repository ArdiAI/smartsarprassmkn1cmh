import { useEffect, useState } from 'react';
import {
  AlertTriangle, Search, X, Wrench, CheckCircle, Clock, Package, MapPin, Save,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
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
  inventory?: { name: string } | null;
}

const severityConfig: Record<string, { label: string; classes: string }> = {
  minor: { label: 'Minor', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  moderate: { label: 'Moderat', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  severe: { label: 'Berat', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusConfig: Record<string, { label: string; classes: string; icon: typeof Clock }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  in_progress: { label: 'Dalam Proses', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Wrench },
  resolved: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
};

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [manageModal, setManageModal] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newStatus, setNewStatus] = useState('pending');
  const [saving, setSaving] = useState(false);

  const canManage = hasPermission('reports', 'manage');

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('damage_reports')
        .select(`
          id, inventory_id, reporter_name, description, image_url, severity, status,
          resolution_notes, created_at, resolved_at, reporter_unit, reporter_email,
          reporter_phone, location,
          inventory:inventory_id(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports((data as unknown as DamageReport[]) ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Gagal memuat laporan kerusakan', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = reports.filter((r) => {
    const matchSearch =
      r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.location ?? '').toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === 'all' || r.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchSeverity && matchStatus;
  });

  function openManage(report: DamageReport) {
    setManageModal(report);
    setResolutionNotes(report.resolution_notes ?? '');
    setNewStatus(report.status ?? 'pending');
  }

  async function handleSave() {
    if (!manageModal) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
        resolution_notes: resolutionNotes.trim() || null,
      };
      if (newStatus === 'resolved') {
        payload.resolved_at = new Date().toISOString();
      } else {
        payload.resolved_at = null;
      }

      const { error } = await supabase.from('damage_reports').update(payload).eq('id', manageModal.id);
      if (error) throw error;
      showToast('Laporan berhasil diperbarui', 'success');
      setManageModal(null);
      await fetchReports();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Gagal memperbarui laporan', 'error');
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola laporan kerusakan barang</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari laporan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Tingkat</option>
          <option value="minor">Minor</option>
          <option value="moderate">Moderat</option>
          <option value="severe">Berat</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Dalam Proses</option>
          <option value="resolved">Selesai</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Tidak ada laporan kerusakan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const sev = severityConfig[report.severity ?? 'minor'] ?? severityConfig.minor;
            const stat = statusConfig[report.status ?? 'pending'] ?? statusConfig.pending;
            const StatusIcon = stat.icon;
            return (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {report.image_url ? (
                      <img src={report.image_url} alt="damage" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{report.reporter_name}</h3>
                        {report.reporter_unit && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">({report.reporter_unit})</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{report.description}</p>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                        {report.inventory?.name && (
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" /> {report.inventory.name}
                          </span>
                        )}
                        {report.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {report.location}
                          </span>
                        )}
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', sev.classes)}>
                        {sev.label}
                      </span>
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1', stat.classes)}>
                        <StatusIcon className="w-3 h-3" /> {stat.label}
                      </span>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => openManage(report)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5" /> Kelola
                      </button>
                    )}
                  </div>
                </div>

                {report.resolution_notes && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-0.5">Catatan Penyelesaian:</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{report.resolution_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manage Modal */}
      {manageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setManageModal(null)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Kelola Laporan</h2>
              <button onClick={() => setManageModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Report Info */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{manageModal.reporter_name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{manageModal.description}</p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Menunggu</option>
                  <option value="in_progress">Dalam Proses</option>
                  <option value="resolved">Selesai</option>
                </select>
              </div>

              {/* Resolution Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Catatan Penyelesaian</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Tulis catatan penyelesaian..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManageModal(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

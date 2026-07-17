import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, X, Loader2, CheckCircle, Clock, Wrench } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  facility_id: string | null;
  reporter_name: string;
  reporter_email: string;
  description: string;
  severity: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  inventory: { name: string } | null;
  facility: { name: string } | null;
}

const severityBadge = (severity: string) => {
  const map: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[severity] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return map[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const statusOrder = ['pending', 'in_progress', 'resolved'];

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolutionModal, setResolutionModal] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select(`
          id, inventory_id, facility_id, reporter_name, reporter_email, description,
          severity, status, resolution_notes, created_at,
          inventory:inventory_id (name),
          facility:facility_id (name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports((data ?? []) as unknown as DamageReport[]);
    } catch {
      showToast('Gagal memuat laporan', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = reports.filter((r) => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const updateStatus = async (report: DamageReport, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('damage_reports')
        .update({ status: newStatus })
        .eq('id', report.id);
      if (error) throw error;
      showToast('Status laporan diperbarui', 'success');
      await load();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    }
  };

  const openResolution = (report: DamageReport) => {
    setResolutionModal(report);
    setResolutionNotes(report.resolution_notes || '');
  };

  const handleResolve = async () => {
    if (!resolutionModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('damage_reports')
        .update({ status: 'resolved', resolution_notes: resolutionNotes.trim() || null })
        .eq('id', resolutionModal.id);
      if (error) throw error;
      showToast('Laporan diselesaikan', 'success');
      setResolutionModal(null);
      await load();
    } catch {
      showToast('Gagal menyelesaikan laporan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getNextStatus = (current: string): string | null => {
    const idx = statusOrder.indexOf(current);
    if (idx === -1 || idx === statusOrder.length - 1) return null;
    return statusOrder[idx + 1];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola laporan kerusakan fasilitas dan inventaris</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Severity</label>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Semua</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Semua</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const nextStatus = getNextStatus(report.status);
            const itemName = report.inventory?.name || report.facility?.name || 'Unknown';
            return (
              <div key={report.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{itemName}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', severityBadge(report.severity))}>
                        {report.severity}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize flex items-center gap-1', statusBadge(report.status))}>
                        {report.status === 'pending' && <Clock className="w-3 h-3" />}
                        {report.status === 'in_progress' && <Wrench className="w-3 h-3" />}
                        {report.status === 'resolved' && <CheckCircle className="w-3 h-3" />}
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{report.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Oleh: {report.reporter_name}</span>
                      <span>{new Date(report.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    {report.resolution_notes && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Resolution Notes:</p>
                        <p className="text-sm text-emerald-800 dark:text-emerald-300">{report.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {report.status !== 'resolved' && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {nextStatus && (
                      <button
                        onClick={() => updateStatus(report, nextStatus)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Wrench className="w-4 h-4" />
                        Set to {nextStatus.replace('_', ' ')}
                      </button>
                    )}
                    <button
                      onClick={() => openResolution(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution modal */}
      {resolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setResolutionModal(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resolve Laporan</h2>
              <button onClick={() => setResolutionModal(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Laporan: <span className="font-medium text-slate-900 dark:text-white">{resolutionModal.inventory?.name || resolutionModal.facility?.name}</span>
              </p>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Jelaskan tindakan yang diambil..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setResolutionModal(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Batal</button>
              <button onClick={handleResolve} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

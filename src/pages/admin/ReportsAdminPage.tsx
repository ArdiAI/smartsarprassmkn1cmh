import { useEffect, useState } from 'react';
import {
  AlertTriangle, X, Loader2, FileText, CheckCircle, Clock, Wrench, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface DamageReport {
  id: string;
  item_name: string;
  description: string | null;
  severity: string;
  status: string;
  reporter_name: string | null;
  reporter_email: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

const severityBadge = (severity: string) => {
  const map: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return map[severity] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return map[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
};

const statusIcon = (status: string) => {
  switch (status) {
    case 'pending': return Clock;
    case 'in_progress': return Wrench;
    case 'resolved': return CheckCircle;
    default: return AlertCircle;
  }
};

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('id, item_name, description, severity, status, reporter_name, reporter_email, resolution_notes, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data as unknown as DamageReport[]) || []);
    } catch {
      showToast('Gagal memuat laporan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = reports.filter((r) => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const openStatusModal = (report: DamageReport) => {
    setEditing(report);
    setResolutionNotes(report.resolution_notes || '');
    setModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('damage_reports')
        .update({
          status: newStatus,
          resolution_notes: resolutionNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);

      if (error) throw error;
      showToast('Status laporan diperbarui', 'success');
      setModalOpen(false);
      fetchReports();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola laporan kerusakan barang</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="label">Tingkat Keparahan</label>
          <select
            className="input"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">Semua</option>
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
            <option value="critical">Kritis</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((r) => {
            const StatusIcon = statusIcon(r.status);
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{r.item_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(r.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', severityBadge(r.severity))}>
                      {r.severity}
                    </span>
                  </div>
                </div>

                {r.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{r.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {r.reporter_name && <span>👤 {r.reporter_name}</span>}
                  {r.reporter_email && <span>✉️ {r.reporter_email}</span>}
                </div>

                {r.resolution_notes && (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3 mb-3">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Catatan Resolusi</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{r.resolution_notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium', statusBadge(r.status))}>
                    <StatusIcon className="w-3 h-3" />
                    {r.status.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => openStatusModal(r)}
                    className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Update Laporan</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Barang</p>
                <p className="text-slate-900 dark:text-white">{editing.item_name}</p>
              </div>
              <div>
                <label className="label">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'pending', label: 'Pending', icon: Clock },
                    { val: 'in_progress', label: 'In Progress', icon: Wrench },
                    { val: 'resolved', label: 'Resolved', icon: CheckCircle },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.val}
                        onClick={() => handleUpdateStatus(opt.val)}
                        disabled={saving}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm font-medium transition-all disabled:opacity-50',
                          editing.status === opt.val
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="label">Catatan Resolusi</label>
                <textarea
                  className="input min-h-[100px] resize-y"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Tindakan yang diambil..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Tutup</button>
              <button
                onClick={() => handleUpdateStatus(editing.status)}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

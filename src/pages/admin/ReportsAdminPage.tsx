import { useEffect, useState } from 'react';
import { AlertTriangle, X, Wrench, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface InventoryRef {
  id: string;
  name: string;
  code: string;
}

interface DamageReport {
  id: string;
  inventory_id: string;
  reporter_name: string;
  description: string;
  image_url: string;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  resolution_notes: string;
  created_at: string;
  resolved_at: string;
  reporter_unit: string;
  reporter_email: string;
  reporter_phone: string;
  location: string;
  inventory?: InventoryRef;
}

const severityStyles: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const severityLabels: Record<string, string> = {
  minor: 'Minor', moderate: 'Moderate', severe: 'Severe',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: Wrench,
  resolved: CheckCircle,
};

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newStatus, setNewStatus] = useState<'pending' | 'in_progress' | 'resolved'>('pending');
  const [saving, setSaving] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*, inventory(*)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat laporan', 'error');
    } else {
      setReports((data as unknown as DamageReport[]) ?? []);
    }
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

  const openEdit = (r: DamageReport) => {
    setEditing(r);
    setResolutionNotes(r.resolution_notes ?? '');
    setNewStatus(r.status ?? 'pending');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      status: newStatus,
      resolution_notes: resolutionNotes,
    };
    if (newStatus === 'resolved') {
      payload.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase.from('damage_reports').update(payload).eq('id', editing.id);
    if (error) {
      showToast('Gagal mengupdate laporan', 'error');
    } else {
      showToast('Laporan berhasil diupdate', 'success');
      setModalOpen(false);
      fetchReports();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola laporan kerusakan sarana</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Severity</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <AlertTriangle className="w-12 h-12 mb-3" />
          <p className="text-sm">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const StatusIcon = statusIcons[r.status] ?? Clock;
            return (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {r.image_url ? (
                    <img src={r.image_url} alt="damage" className="w-full sm:w-28 h-28 object-cover rounded-xl" />
                  ) : (
                    <div className="w-full sm:w-28 h-28 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', severityStyles[r.severity] ?? severityStyles.minor)}>
                        {severityLabels[r.severity] ?? r.severity}
                      </span>
                      <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', statusStyles[r.status] ?? statusStyles.pending)}>
                        <StatusIcon className="w-3 h-3" /> {statusLabels[r.status] ?? r.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {r.inventory?.name ?? 'Item tidak diketahui'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{r.description ?? ''}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Pelapor: {r.reporter_name ?? '-'}</span>
                      <span>Unit: {r.reporter_unit ?? '-'}</span>
                      <span>Lokasi: {r.location ?? '-'}</span>
                      <span>{new Date(r.created_at ?? '').toLocaleDateString('id-ID')}</span>
                    </div>
                    {r.resolution_notes && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Catatan Resolusi:</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{r.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openEdit(r)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 whitespace-nowrap"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Update Laporan</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'pending' | 'in_progress' | 'resolved')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catatan Resolusi</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Tambahkan catatan resolusi..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

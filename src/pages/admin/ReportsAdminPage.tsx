import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  AlertTriangle, Loader2, X, MapPin, User, Mail, Phone, Clock,
} from 'lucide-react';

interface InventoryRef {
  id: string;
  name: string;
  code: string;
}

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string;
  image_url: string | null;
  severity: 'minor' | 'moderate' | 'severe' | null;
  status: 'pending' | 'in_progress' | 'resolved';
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  location: string | null;
  inventory?: InventoryRef | null;
}

type Severity = 'minor' | 'moderate' | 'severe';
type DamageStatus = 'pending' | 'in_progress' | 'resolved';

const severityConfig: Record<Severity, { label: string; color: string }> = {
  minor: { label: 'Ringan', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  moderate: { label: 'Sedang', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  severe: { label: 'Berat', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusConfig: Record<DamageStatus, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const statusOrder: DamageStatus[] = ['pending', 'in_progress', 'resolved'];

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolveModal, setResolveModal] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*, inventory(id, name, code)')
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
    return true;
  });

  const handleAdvanceStatus = async (report: DamageReport) => {
    const idx = statusOrder.indexOf(report.status);
    if (idx >= statusOrder.length - 1) return;
    const next = statusOrder[idx + 1];
    setUpdatingId(report.id);
    try {
      const update: Record<string, unknown> = { status: next };
      if (next === 'resolved') {
        update.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('damage_reports').update(update).eq('id', report.id);
      if (error) throw error;
      showToast(`Status diperbarui ke "${statusConfig[next].label}"`, 'success');
      await fetchReports();
    } catch (e) {
      console.error(e);
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setUpdatingId(null);
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
    } catch (e) {
      console.error(e);
      showToast('Gagal menyelesaikan laporan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Tinjau dan kelola laporan kerusakan sarana</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="input sm:max-w-xs"
        >
          <option value="all">Semua Tingkat</option>
          <option value="minor">Ringan</option>
          <option value="moderate">Sedang</option>
          <option value="severe">Berat</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input sm:max-w-xs"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada laporan</p>
          <p className="text-sm text-slate-400 mt-1">Belum ada laporan kerusakan yang sesuai filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => {
            const sc = statusConfig[r.status];
            const sev = r.severity ? severityConfig[r.severity] : null;
            const canAdvance = r.status !== 'resolved';
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.inventory?.name ?? 'Item tidak diketahui'}</h3>
                      {r.inventory?.code && (
                        <span className="font-mono text-xs text-slate-400">{r.inventory.code}</span>
                      )}
                      {sev && <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sev.color)}>{sev.label}</span>}
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{r.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" /> {r.reporter_name}
                        {r.reporter_unit && <span className="text-slate-400">· {r.reporter_unit}</span>}
                      </div>
                      {r.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" /> {r.location}
                        </div>
                      )}
                      {r.reporter_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" /> {r.reporter_email}
                        </div>
                      )}
                      {r.reporter_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" /> {r.reporter_phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" /> {new Date(r.created_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                    {r.image_url && (
                      <a href={r.image_url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline mt-2 inline-block">
                        Lihat foto kerusakan
                      </a>
                    )}
                    {r.resolution_notes && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          <span className="font-medium">Catatan penyelesaian:</span> {r.resolution_notes}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {canAdvance && (
                      <>
                        <button
                          onClick={() => handleAdvanceStatus(r)}
                          disabled={updatingId === r.id}
                          className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {updatingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          {r.status === 'pending' ? 'Proses' : 'Selesaikan'}
                        </button>
                        <button
                          onClick={() => openResolve(r)}
                          className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                        >
                          Tandai Selesai
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Selesaikan Laporan</h2>
              <button onClick={() => setResolveModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Item</p>
                <p className="font-medium text-slate-900 dark:text-white">{resolveModal.inventory?.name ?? 'Item tidak diketahui'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Deskripsi Kerusakan</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{resolveModal.description}</p>
              </div>
              <div>
                <label className="label">Catatan Penyelesaian</label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="input"
                  placeholder="Jelaskan tindakan perbaikan yang dilakukan..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setResolveModal(null)} className="btn-secondary">Batal</button>
              <button onClick={handleResolve} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2">
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

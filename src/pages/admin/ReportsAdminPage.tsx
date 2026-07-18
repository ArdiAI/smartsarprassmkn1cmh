import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Loader2,
  AlertTriangle,
  X,
  Save,
  Wrench,
  MapPin,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import EmptyState from '../../components/EmptyState';

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
}

const SEVERITY_STYLES: Record<string, string> = {
  minor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  moderate: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Ringan',
  moderate: 'Sedang',
  severe: 'Berat',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

const STATUS_FLOW: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'resolved',
};

const STATUS_OPTIONS = ['all', 'pending', 'in_progress', 'resolved'];
const SEVERITY_OPTIONS = ['all', 'minor', 'moderate', 'severe'];

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveReport, setResolveReport] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat laporan', 'error');
    } else {
      setReports((data as unknown as DamageReport[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
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
  }, [reports, search, statusFilter, severityFilter]);

  async function advanceStatus(r: DamageReport) {
    const nextStatus = STATUS_FLOW[r.status];
    if (!nextStatus) return;
    setUpdating(r.id);
    const update: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === 'resolved') {
      update.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from('damage_reports').update(update).eq('id', r.id);
    setUpdating(null);
    if (error) {
      showToast('Gagal memperbarui status', 'error');
      return;
    }
    showToast('Status diperbarui', 'success');
    fetchReports();
  }

  function openResolveModal(r: DamageReport) {
    setResolveReport(r);
    setResolutionNotes(r.resolution_notes ?? '');
    setShowResolveModal(true);
  }

  function closeResolveModal() {
    setShowResolveModal(false);
    setResolveReport(null);
    setResolutionNotes('');
  }

  async function handleSaveResolution(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveReport) return;
    setUpdating(resolveReport.id);
    const { error } = await supabase
      .from('damage_reports')
      .update({
        status: 'resolved',
        resolution_notes: resolutionNotes.trim() || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', resolveReport.id);
    setUpdating(null);
    if (error) {
      showToast('Gagal menyimpan resolusi', 'error');
      return;
    }
    showToast('Laporan diselesaikan', 'success');
    closeResolveModal();
    fetchReports();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Laporan Kerusakan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola laporan kerusakan barang dan fasilitas.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Cari pelapor, deskripsi, lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'Semua Status' : STATUS_LABELS[s] ?? s}</option>
          ))}
        </select>
        <select className="input sm:w-44" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'Semua Tingkat' : SEVERITY_LABELS[s] ?? s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8 text-slate-400" />}
          title="Tidak ada laporan"
          description="Belum ada laporan kerusakan yang cocok."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <AlertTriangle className="h-7 w-7 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{r.reporter_name}</h3>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', SEVERITY_STYLES[r.severity] ?? SEVERITY_STYLES.minor)}>
                        {SEVERITY_LABELS[r.severity] ?? r.severity}
                      </span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[r.status] ?? STATUS_STYLES.pending)}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{r.description ?? '—'}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleDateString('id-ID')}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                {r.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {r.location}
                  </div>
                )}
                {r.reporter_unit && (
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" />
                    {r.reporter_unit}
                  </div>
                )}
                {r.reporter_email && <span>{r.reporter_email}</span>}
                {r.reporter_phone && <span>{r.reporter_phone}</span>}
              </div>

              {r.resolution_notes && (
                <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <span className="font-medium">Resolusi: </span>{r.resolution_notes}
                </div>
              )}

              {hasPermission('reports', 'manage') && r.status !== 'resolved' && (
                <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    onClick={() => advanceStatus(r)}
                    disabled={updating === r.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    {updating === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                    {r.status === 'pending' ? 'Proses' : 'Selesaikan'}
                  </button>
                  <button
                    onClick={() => openResolveModal(r)}
                    disabled={updating === r.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Save className="h-4 w-4" />
                    Catat Resolusi
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {showResolveModal && resolveReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Catat Resolusi</h2>
              <button onClick={closeResolveModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Laporan dari <span className="font-semibold">{resolveReport.reporter_name}</span>
            </p>
            <form onSubmit={handleSaveResolution}>
              <label className="label">Catatan Resolusi</label>
              <textarea
                className="input min-h-[120px]"
                placeholder="Jelaskan tindakan yang dilakukan..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={closeResolveModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={updating === resolveReport.id} className="btn-primary">
                  {updating === resolveReport.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan & Selesaikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

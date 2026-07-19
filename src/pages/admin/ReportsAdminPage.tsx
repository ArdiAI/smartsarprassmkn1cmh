import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Loader2,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Save,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import { cn } from '../../utils/cn';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string | null;
  description: string | null;
  image_url: string | null;
  severity: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  location: string | null;
}

const SEVERITY_OPTIONS = ['all', 'minor', 'moderate', 'severe'];
const STATUS_OPTIONS = ['all', 'pending', 'in_progress', 'resolved'];

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
const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  in_progress: Wrench,
  resolved: CheckCircle2,
};

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<DamageReport | null>(null);
  const [notesText, setNotesText] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat laporan', 'error');
      setReports([]);
    } else {
      setReports((data as unknown as DamageReport[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const updateStatus = async (report: DamageReport, newStatus: string) => {
    setUpdating(report.id);
    const payload: Record<string, any> = {
      status: newStatus,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('damage_reports').update(payload).eq('id', report.id);
    setUpdating(null);
    if (error) {
      showToast('Gagal memperbarui status: ' + error.message, 'error');
      return;
    }
    showToast('Status diperbarui menjadi ' + STATUS_LABELS[newStatus], 'success');
    await fetchReports();
  };

  const openNotes = (report: DamageReport) => {
    setNotesModal(report);
    setNotesText(report.resolution_notes ?? '');
  };

  const saveNotes = async () => {
    if (!notesModal) return;
    setUpdating(notesModal.id);
    const { error } = await supabase
      .from('damage_reports')
      .update({ resolution_notes: notesText.trim() || null })
      .eq('id', notesModal.id);
    setUpdating(null);
    if (error) {
      showToast('Gagal menyimpan catatan: ' + error.message, 'error');
      return;
    }
    showToast('Catatan resolusi disimpan', 'success');
    setNotesModal(null);
    await fetchReports();
  };

  const filtered = reports.filter((r) => {
    const matchSearch =
      !search ||
      r.reporter_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    const matchSev = severityFilter === 'all' || r.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchSev && matchStatus;
  });

  const canManage = hasPermission('reports', 'manage');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Laporan Kerusakan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola laporan kerusakan barang dan fasilitas.
        </p>
      </div>

      <div className="card space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari pelapor atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <select className="input" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Semua Tingkat' : SEVERITY_LABELS[s] ?? s}
              </option>
            ))}
          </select>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Semua Status' : STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada laporan" description="Belum ada laporan kerusakan." icon={<AlertTriangle className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const StatusIcon = STATUS_ICONS[r.status] ?? Clock;
            return (
              <div key={r.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {r.reporter_name ?? 'Tanpa nama'}
                      </h3>
                      {r.severity && (
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', SEVERITY_STYLES[r.severity] ?? '')}>
                          {SEVERITY_LABELS[r.severity] ?? r.severity}
                        </span>
                      )}
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[r.status] ?? '')}>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.description ?? '-'}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {r.reporter_unit && <InfoItem icon={User} label="Unit" value={r.reporter_unit} />}
                  {r.reporter_email && <InfoItem icon={Mail} label="Email" value={r.reporter_email} />}
                  {r.reporter_phone && <InfoItem icon={Phone} label="Telepon" value={r.reporter_phone} />}
                  {r.location && <InfoItem icon={MapPin} label="Lokasi" value={r.location} />}
                </div>

                {r.image_url && (
                  <div className="mt-3">
                    <img src={r.image_url} alt="Bukti kerusakan" className="max-h-48 rounded-lg object-cover" />
                  </div>
                )}

                {r.resolution_notes && (
                  <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <span className="font-medium">Catatan Resolusi: </span>{r.resolution_notes}
                  </div>
                )}

                {canManage && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {r.status !== 'in_progress' && (
                      <button
                        onClick={() => updateStatus(r, 'in_progress')}
                        disabled={updating === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {updating === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                        Proses
                      </button>
                    )}
                    {r.status !== 'resolved' && (
                      <button
                        onClick={() => updateStatus(r, 'resolved')}
                        disabled={updating === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        {updating === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Selesai
                      </button>
                    )}
                    {r.status !== 'pending' && (
                      <button
                        onClick={() => updateStatus(r, 'pending')}
                        disabled={updating === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-600 transition hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                      >
                        <Clock className="h-4 w-4" />
                        Kembalikan ke Menunggu
                      </button>
                    )}
                    <button
                      onClick={() => openNotes(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <Save className="h-4 w-4" />
                      Catatan Resolusi
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Notes modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Catatan Resolusi</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Laporan dari: <span className="font-medium text-slate-700 dark:text-slate-200">{notesModal.reporter_name ?? '-'}</span>
            </p>
            <textarea
              className="input min-h-[120px] resize-y"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Tulis catatan resolusi..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setNotesModal(null)} className="btn-secondary">Batal</button>
              <button onClick={saveNotes} className="btn-primary" disabled={updating === notesModal.id}>
                {updating === notesModal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

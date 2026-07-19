import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import {
  AlertTriangle,
  Loader2,
  Search,
  MapPin,
  User,
  Mail,
  Phone,
  Wrench,
  CheckCircle2,
  Clock,
} from 'lucide-react';

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

const SEVERITY_OPTIONS = ['all', 'minor', 'moderate', 'severe'];
const STATUS_OPTIONS = ['all', 'pending', 'in_progress', 'resolved'];

const severityBadge = (s: string) => {
  switch (s) {
    case 'minor':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'moderate':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'severe':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const severityLabel = (s: string) => {
  switch (s) {
    case 'minor': return 'Ringan';
    case 'moderate': return 'Sedang';
    case 'severe': return 'Berat';
    default: return s;
  }
};

const statusBadge = (s: string) => {
  switch (s) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'resolved':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'pending': return 'Menunggu';
    case 'in_progress': return 'Diproses';
    case 'resolved': return 'Selesai';
    default: return s;
  }
};

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<DamageReport | null>(null);
  const [notes, setNotes] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('damage_reports').select('*').order('created_at', { ascending: false });
      if (error) {
        showToast('Gagal memuat laporan', 'error');
        return;
      }
      setReports((data as unknown as DamageReport[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const updateStatus = async (report: DamageReport, newStatus: string) => {
    setUpdatingId(report.id);
    try {
      const payload: any = {
        status: newStatus,
        resolution_notes: report.resolution_notes,
      };
      if (newStatus === 'resolved') {
        payload.resolved_at = new Date().toISOString();
      } else {
        payload.resolved_at = null;
      }
      const { error } = await supabase.from('damage_reports').update(payload).eq('id', report.id);
      if (error) throw error;
      showToast('Status laporan diperbarui', 'success');
      await fetchReports();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const openNotes = (report: DamageReport) => {
    setNotes(report.resolution_notes ?? '');
    setNotesModal(report);
  };

  const saveNotes = async () => {
    if (!notesModal) return;
    setUpdatingId(notesModal.id);
    try {
      const { error } = await supabase
        .from('damage_reports')
        .update({ resolution_notes: notes.trim() || null })
        .eq('id', notesModal.id);
      if (error) throw error;
      showToast('Catatan resolusi disimpan', 'success');
      setNotesModal(null);
      await fetchReports();
    } catch {
      showToast('Gagal menyimpan catatan', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = reports.filter((r) => {
    const matchSearch = !search ||
      (r.reporter_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === 'all' || r.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchSeverity && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Laporan Kerusakan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola laporan kerusakan barang</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari pelapor atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-44" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'Semua Tingkat' : severityLabel(s)}</option>
          ))}
        </select>
        <select className="input sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'Semua Status' : statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada laporan" description="Belum ada laporan kerusakan." icon={<AlertTriangle className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severityBadge(r.severity ?? '')}`}>
                      {severityLabel(r.severity ?? '')}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(r.status ?? '')}`}>
                      {statusLabel(r.status ?? '')}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <User className="h-4 w-4 text-slate-400" />
                    {r.reporter_name ?? 'N/A'}
                    {r.reporter_unit && <span className="text-slate-400">• {r.reporter_unit}</span>}
                  </div>
                  {r.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">{r.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {r.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.location}
                      </div>
                    )}
                    {r.reporter_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {r.reporter_email}
                      </div>
                    )}
                    {r.reporter_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {r.reporter_phone}
                      </div>
                    )}
                  </div>
                  {r.image_url && (
                    <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                      Lihat Foto
                    </a>
                  )}
                  {r.resolution_notes && (
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Catatan Resolusi:</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.resolution_notes}</p>
                    </div>
                  )}
                </div>

                {hasPermission('reports', 'manage') && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {r.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(r, 'in_progress')}
                        disabled={updatingId === r.id}
                        className="btn-secondary"
                      >
                        {updatingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                        Proses
                      </button>
                    )}
                    {r.status === 'in_progress' && (
                      <button
                        onClick={() => updateStatus(r, 'resolved')}
                        disabled={updatingId === r.id}
                        className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                      >
                        {updatingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Selesai
                      </button>
                    )}
                    <button
                      onClick={() => openNotes(r)}
                      className="btn-secondary"
                    >
                      <Clock className="h-4 w-4" />
                      Catatan
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNotesModal(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Catatan Resolusi</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Laporan: {notesModal.reporter_name ?? '-'}</p>
            <textarea
              className="input min-h-[120px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tulis catatan resolusi..."
            />
            <div className="mt-4 flex items-center gap-3">
              <button onClick={saveNotes} className="btn-primary" disabled={updatingId === notesModal.id}>
                {updatingId === notesModal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Simpan
              </button>
              <button onClick={() => setNotesModal(null)} className="btn-secondary">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

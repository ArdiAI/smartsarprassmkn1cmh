import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import {
  FileText, Loader2, Search, AlertTriangle, CheckCircle, Clock, X, MapPin,
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
  inventory?: { name: string } | null;
}

const severityConfig: Record<string, { label: string; color: string }> = {
  minor: { label: 'Ringan', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  moderate: { label: 'Sedang', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  severe: { label: 'Berat', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const statusFlow: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'resolved',
};

const statusLabel: Record<string, string> = {
  pending: 'Proses',
  in_progress: 'Selesai',
};

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<DamageReport | null>(null);
  const [notesText, setNotesText] = useState('');

  const canManage = hasPermission('reports', 'manage');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*, inventory:inventory(name)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat laporan kerusakan', 'error');
    } else {
      setReports((data as unknown as DamageReport[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAdvanceStatus = async (report: DamageReport) => {
    const currentStatus = report.status || 'pending';
    const nextStatus = statusFlow[currentStatus];
    if (!nextStatus) return;
    setActionLoading(report.id);
    const payload: Record<string, string> = { status: nextStatus };
    if (nextStatus === 'resolved') {
      payload.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from('damage_reports').update(payload).eq('id', report.id);
    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast('Status diperbarui', 'success');
      await fetchReports();
    }
    setActionLoading(null);
  };

  const openNotes = (report: DamageReport) => {
    setNotesModal(report);
    setNotesText(report.resolution_notes || '');
  };

  const handleSaveNotes = async () => {
    if (!notesModal) return;
    setActionLoading(notesModal.id);
    const { error } = await supabase
      .from('damage_reports')
      .update({ resolution_notes: notesText || null })
      .eq('id', notesModal.id);
    if (error) {
      showToast('Gagal menyimpan catatan', 'error');
    } else {
      showToast('Catatan disimpan', 'success');
      setNotesModal(null);
      await fetchReports();
    }
    setActionLoading(null);
  };

  const filtered = reports.filter(r => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && (r.status || 'pending') !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.reporter_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.inventory?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Tinjau dan kelola laporan kerusakan barang</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pelapor, deskripsi, atau lokasi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Tingkat</option>
          <option value="minor">Ringan</option>
          <option value="moderate">Sedang</option>
          <option value="severe">Berat</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const sev = severityConfig[r.severity || 'minor'] || severityConfig.minor;
            const st = statusConfig[r.status || 'pending'] || statusConfig.pending;
            const nextStatus = statusFlow[r.status || 'pending'];
            const nextLabel = nextStatus ? statusLabel[r.status || 'pending'] : null;
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.reporter_name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sev.color}`}>{sev.label}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-500 dark:text-slate-400">
                      {r.inventory?.name && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-slate-400" /> {r.inventory.name}
                        </div>
                      )}
                      {r.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" /> {r.location}
                        </div>
                      )}
                      {r.reporter_unit && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" /> {r.reporter_unit}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" /> {new Date(r.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                    {r.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{r.description}</p>
                    )}
                    {r.image_url && (
                      <a href={r.image_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm mt-2 inline-block">
                        Lihat foto kerusakan
                      </a>
                    )}
                    {r.resolution_notes && (
                      <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 p-3 text-sm">
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Catatan Penyelesaian:</p>
                        <p className="text-slate-700 dark:text-slate-200">{r.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-2 flex-shrink-0">
                      {nextStatus && nextLabel && (
                        <button
                          onClick={() => handleAdvanceStatus(r)}
                          disabled={actionLoading === r.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          {nextLabel}
                        </button>
                      )}
                      <button
                        onClick={() => openNotes(r)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        <FileText className="w-4 h-4" /> Catatan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setNotesModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Catatan Penyelesaian</h2>
              <button onClick={() => setNotesModal(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pelapor</p>
                <p className="font-medium text-slate-900 dark:text-white">{notesModal.reporter_name}</p>
              </div>
              <div>
                <label className="label">Catatan Penyelesaian</label>
                <textarea
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  rows={4}
                  className="input"
                  placeholder="Tulis catatan penyelesaian..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setNotesModal(null)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleSaveNotes} disabled={actionLoading === notesModal.id} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                {actionLoading === notesModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

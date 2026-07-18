import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  FileText, Loader2, Search, X, AlertTriangle, MapPin, User, Mail, Phone,
} from 'lucide-react';

interface DamageReport {
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
  inventory?: { name: string } | null;
}

const severityConfig: Record<string, { label: string; color: string }> = {
  minor: { label: 'Minor', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  moderate: { label: 'Sedang', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
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

const statusActionLabel: Record<string, string> = {
  pending: 'Proses',
  in_progress: 'Selesaikan',
};

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('reports', 'manage');

  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*, inventory:inventory_id(name)')
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

  const openResolve = (r: DamageReport) => {
    setActive(r);
    setResolutionNotes(r.resolution_notes ?? '');
    setModalOpen(true);
  };

  const handleAdvanceStatus = async (r: DamageReport) => {
    const next = statusFlow[r.status];
    if (!next) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { status: next };
      if (next === 'resolved') {
        payload.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('damage_reports').update(payload).eq('id', r.id);
      if (error) throw error;
      showToast(`Status diperbarui ke "${statusConfig[next].label}"`, 'success');
      await fetchReports();
    } catch (e: any) {
      showToast(e.message || 'Gagal memperbarui status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResolution = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('damage_reports')
        .update({ resolution_notes: resolutionNotes })
        .eq('id', active.id);
      if (error) throw error;
      showToast('Catatan resolusi disimpan', 'success');
      setModalOpen(false);
      await fetchReports();
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan catatan', 'error');
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
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola laporan kerusakan barang</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
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
          <option value="minor">Minor</option>
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

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => {
            const sev = severityConfig[r.severity] || severityConfig.minor;
            const st = statusConfig[r.status] || statusConfig.pending;
            const canAdvance = canManage && statusFlow[r.status];
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.reporter_name}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sev.color)}>{sev.label}</span>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', st.color)}>{st.label}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(r.created_at).toLocaleString('id-ID')}
                    </p>
                    {r.inventory?.name && (
                      <p className="text-sm text-blue-500 mt-1">Barang: {r.inventory.name}</p>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{r.description}</p>
                  </div>
                  {r.image_url && (
                    <img src={r.image_url} alt="bukti" className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {r.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {r.location}</span>
                  )}
                  {r.reporter_unit && (
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {r.reporter_unit}</span>
                  )}
                  {r.reporter_email && (
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {r.reporter_email}</span>
                  )}
                  {r.reporter_phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {r.reporter_phone}</span>
                  )}
                </div>

                {r.resolution_notes && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-0.5">Catatan Resolusi</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{r.resolution_notes}</p>
                  </div>
                )}

                {canManage && (
                  <div className="flex gap-2 mt-4">
                    {canAdvance && (
                      <button
                        onClick={() => handleAdvanceStatus(r)}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {statusActionLabel[r.status]}
                      </button>
                    )}
                    <button
                      onClick={() => openResolve(r)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4" /> Catatan Resolusi
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">Catatan Resolusi</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Laporan dari:</p>
                <p className="font-medium text-slate-900 dark:text-white">{active.reporter_name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{active.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Catatan Resolusi</label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Tulis catatan resolusi..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveResolution}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

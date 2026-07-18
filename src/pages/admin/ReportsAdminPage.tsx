import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  AlertCircle, Loader2, Search, MapPin, Calendar, X, Save,
} from 'lucide-react';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string;
  image_url: string | null;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  location: string | null;
}

interface Inventory {
  id: string;
  name: string;
  code: string;
}

const severityConfig: Record<string, { label: string; color: string }> = {
  minor: { label: 'Ringan', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
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

const statusNextLabel: Record<string, string> = {
  pending: 'Proses',
  in_progress: 'Selesaikan',
};

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('reports', 'manage');

  const [reports, setReports] = useState<DamageReport[]>([]);
  const [inventory, setInventory] = useState<Record<string, Inventory>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, invRes] = await Promise.all([
        supabase.from('damage_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('inventory').select('id, name, code'),
      ]);
      if (repRes.error) throw repRes.error;
      if (invRes.error) throw invRes.error;
      setReports((repRes.data as unknown as DamageReport[]) || []);
      const invMap: Record<string, Inventory> = {};
      ((invRes.data as unknown as Inventory[]) || []).forEach((i) => {
        invMap[i.id] = i;
      });
      setInventory(invMap);
    } catch {
      showToast('Gagal memuat laporan kerusakan', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.reporter_name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q);
    const matchSev = severityFilter === 'all' || r.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchSev && matchStatus;
  });

  const handleAdvance = async (report: DamageReport) => {
    const next = statusFlow[report.status];
    if (!next) return;
    setActionLoading(report.id);
    try {
      const payload: any = { status: next };
      if (next === 'resolved') {
        payload.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('damage_reports').update(payload).eq('id', report.id);
      if (error) throw error;
      showToast(`Status diperbarui ke "${statusConfig[next].label}"`, 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message ?? 'Gagal memperbarui status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openResolve = (report: DamageReport) => {
    setResolveModal(report);
    setResolutionNotes(report.resolution_notes ?? '');
  };

  const handleSaveResolution = async () => {
    if (!resolveModal) return;
    setActionLoading(resolveModal.id);
    try {
      const { error } = await supabase
        .from('damage_reports')
        .update({
          resolution_notes: resolutionNotes.trim() || null,
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', resolveModal.id);
      if (error) throw error;
      showToast('Laporan diselesaikan', 'success');
      setResolveModal(null);
      await fetchData();
    } catch (err: any) {
      showToast(err.message ?? 'Gagal menyimpan resolusi', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola laporan kerusakan sarana</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pelapor, deskripsi, lokasi..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Tingkat</option>
          <option value="minor">Ringan</option>
          <option value="moderate">Sedang</option>
          <option value="severe">Berat</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada laporan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const sev = severityConfig[r.severity] || severityConfig.minor;
            const st = statusConfig[r.status] || statusConfig.pending;
            const inv = r.inventory_id ? inventory[r.inventory_id] : null;
            return (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.reporter_name}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sev.color)}>{sev.label}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.color)}>{st.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{r.description}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {inv && <span>Item: {inv.name} ({inv.code})</span>}
                      {r.reporter_unit && <span>Unit: {r.reporter_unit}</span>}
                      {r.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location}</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    {r.resolution_notes && (
                      <div className="mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Resolusi: </span>{r.resolution_notes}
                      </div>
                    )}
                  </div>
                  {canManage && r.status !== 'resolved' && (
                    <div className="flex flex-col gap-2 sm:w-32">
                      {statusFlow[r.status] && (
                        <button
                          onClick={() => handleAdvance(r)}
                          disabled={actionLoading === r.id}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 font-medium"
                        >
                          {actionLoading === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          {statusNextLabel[r.status]}
                        </button>
                      )}
                      <button
                        onClick={() => openResolve(r)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                      >
                        <Save className="w-3.5 h-3.5" /> Resolusi
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setResolveModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Catat Resolusi</h2>
              <button onClick={() => setResolveModal(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pelapor</p>
                <p className="font-medium text-slate-900 dark:text-white">{resolveModal.reporter_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Deskripsi Kerusakan</p>
                <p className="text-slate-700 dark:text-slate-300">{resolveModal.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catatan Resolusi</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Tindakan yang dilakukan..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setResolveModal(null)} className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium">
                Batal
              </button>
              <button
                onClick={handleSaveResolution}
                disabled={actionLoading === resolveModal.id}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === resolveModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Selesaikan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

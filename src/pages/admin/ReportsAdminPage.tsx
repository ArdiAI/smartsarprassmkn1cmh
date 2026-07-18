import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import {
  Loader2, Search, FileText, X, AlertTriangle, CheckCircle, Clock, Wrench,
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
}

interface Inventory {
  id: string;
  name: string;
  code: string;
}

const severityConfig: Record<string, { label: string; color: string }> = {
  minor: { label: 'Minor', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  moderate: { label: 'Sedang', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  severe: { label: 'Berat', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Wrench },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
};

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('reports', 'manage');

  const [reports, setReports] = useState<DamageReport[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, Inventory>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const [repRes, invRes] = await Promise.all([
      supabase.from('damage_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('inventory').select('id, name, code'),
    ]);
    if (repRes.error) {
      showToast('Gagal memuat laporan kerusakan', 'error');
    } else {
      setReports((repRes.data as unknown as DamageReport[]) || []);
    }
    if (!invRes.error && invRes.data) {
      const m: Record<string, Inventory> = {};
      (invRes.data as unknown as Inventory[]).forEach((i) => (m[i.id] = i));
      setInventoryMap(m);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = reports.filter((r) => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const invName = r.inventory_id ? (inventoryMap[r.inventory_id]?.name || '') : '';
      return (
        r.reporter_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        invName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const updateStatus = async (report: DamageReport, newStatus: string) => {
    if (!canManage) return;
    setActionLoading(report.id);
    const payload: Record<string, unknown> = {
      status: newStatus,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('damage_reports').update(payload).eq('id', report.id);
    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast('Status diperbarui', 'success');
      fetchReports();
    }
    setActionLoading(null);
  };

  const openResolve = (report: DamageReport) => {
    setEditing(report);
    setResolutionNotes(report.resolution_notes ?? '');
    setModalOpen(true);
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setActionLoading(editing.id);
    const { error } = await supabase
      .from('damage_reports')
      .update({
        status: 'resolved',
        resolution_notes: resolutionNotes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', editing.id);
    if (error) {
      showToast('Gagal menyimpan resolusi', 'error');
    } else {
      showToast('Laporan diselesaikan', 'success');
      setModalOpen(false);
      fetchReports();
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola laporan kerusakan barang</p>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pelapor, deskripsi, barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua Tingkat</option>
            <option value="minor">Minor</option>
            <option value="moderate">Sedang</option>
            <option value="severe">Berat</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="in_progress">Diproses</option>
            <option value="resolved">Selesai</option>
          </select>
        </div>

        <div className="text-sm text-slate-500 dark:text-slate-400">
          Menampilkan {filtered.length} dari {reports.length} laporan
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada laporan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const sevCfg = severityConfig[r.severity] || severityConfig.minor;
              const stCfg = statusConfig[r.status] || statusConfig.pending;
              const StIcon = stCfg.icon;
              const invName = r.inventory_id ? (inventoryMap[r.inventory_id]?.name || '-') : '-';
              return (
                <div key={r.id} className="rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4 bg-white dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{r.reporter_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sevCfg.color}`}>{sevCfg.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${stCfg.color}`}>
                          <StIcon className="w-3 h-3" /> {stCfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{r.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                        <span>Barang: {invName}</span>
                        {r.reporter_unit && <span>Unit: {r.reporter_unit}</span>}
                        {r.location && <span>Lokasi: {r.location}</span>}
                        <span>{new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                      {r.resolution_notes && (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">
                          <strong>Catatan resolusi:</strong> {r.resolution_notes}
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(r, 'in_progress')}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                          >
                            Proses
                          </button>
                        )}
                        {r.status === 'in_progress' && (
                          <button
                            onClick={() => openResolve(r)}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            Selesaikan
                          </button>
                        )}
                        {r.status === 'pending' && (
                          <button
                            onClick={() => openResolve(r)}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            Selesaikan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolution modal */}
      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Selesaikan Laporan
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResolve} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 text-sm">
                <p className="font-medium text-slate-900 dark:text-white">{editing.reporter_name}</p>
                <p className="text-slate-600 dark:text-slate-300">{editing.description}</p>
              </div>
              <div>
                <label className="label">Catatan Resolusi</label>
                <textarea
                  className="input min-h-[100px]"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Jelaskan tindakan yang diambil..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={actionLoading === editing.id} className="btn-primary flex items-center gap-2">
                  {actionLoading === editing.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  Selesaikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

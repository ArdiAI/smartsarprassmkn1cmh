import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  Wrench, Loader2, Search, X, AlertTriangle, MapPin, User, Mail, Phone, Clock,
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

interface InventoryLookup {
  id: string;
  name: string;
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

const statusActionLabel: Record<string, string> = {
  pending: 'Proses',
  in_progress: 'Selesaikan',
};

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('reports', 'manage');

  const [reports, setReports] = useState<DamageReport[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notesModal, setNotesModal] = useState<DamageReport | null>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data as unknown as DamageReport[]) || [];
      setReports(list);

      // Build inventory lookup
      const invIds = [...new Set(list.map(r => r.inventory_id).filter(Boolean) as string[])];
      if (invIds.length > 0) {
        const { data: invData } = await supabase
          .from('inventory')
          .select('id, name')
          .in('id', invIds);
        const inv = (invData as unknown as InventoryLookup[]) || [];
        const map: Record<string, string> = {};
        for (const i of inv) map[i.id] = i.name;
        setInventoryMap(map);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat laporan kerusakan', 'error');
    } finally {
      setLoading(false);
    }
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

  const handleAdvanceStatus = async (report: DamageReport) => {
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengubah status', 'error');
      return;
    }
    const next = statusFlow[report.status];
    if (!next) return;
    setActionLoading(report.id);
    try {
      const payload: Record<string, string | null> = { status: next };
      if (next === 'resolved') payload.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('damage_reports').update(payload).eq('id', report.id);
      if (error) throw error;
      showToast(`Status diperbarui ke "${statusConfig[next].label}"`, 'success');
      await fetchReports();
    } catch (e) {
      console.error(e);
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openNotes = (report: DamageReport) => {
    setNotesModal(report);
    setNotesText(report.resolution_notes ?? '');
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesModal) return;
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengelola laporan', 'error');
      return;
    }
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('damage_reports')
        .update({ resolution_notes: notesText.trim() || null })
        .eq('id', notesModal.id);
      if (error) throw error;
      showToast('Catatan resolusi disimpan', 'success');
      setNotesModal(null);
      await fetchReports();
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan catatan', 'error');
    } finally {
      setSavingNotes(false);
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
        <p className="text-slate-500 dark:text-slate-400 mt-1">Tinjau dan kelola laporan kerusakan barang</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari pelapor, deskripsi, atau lokasi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada laporan</p>
          <p className="text-sm text-slate-400 mt-1">Belum ada laporan kerusakan yang sesuai filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => {
            const sev = severityConfig[r.severity] || severityConfig.minor;
            const sc = statusConfig[r.status] || statusConfig.pending;
            const itemName = r.inventory_id ? (inventoryMap[r.inventory_id] ?? 'Barang tidak ditemukan') : null;
            const nextStatus = statusFlow[r.status];
            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.reporter_name ?? 'Anonim'}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sev.color)}>{sev.label}</span>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                    </div>
                    {itemName && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Barang: {itemName}</p>
                    )}
                    {r.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{r.description}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm text-slate-500 dark:text-slate-400">
                      {r.reporter_unit && (
                        <div className="flex items-center gap-1.5"><User className="w-4 h-4" /> {r.reporter_unit}</div>
                      )}
                      {r.reporter_email && (
                        <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {r.reporter_email}</div>
                      )}
                      {r.reporter_phone && (
                        <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {r.reporter_phone}</div>
                      )}
                      {r.location && (
                        <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {r.location}</div>
                      )}
                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(r.created_at).toLocaleString('id-ID')}</div>
                    </div>
                    {r.image_url && (
                      <a href={r.image_url} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm text-blue-500 hover:underline">
                        Lihat foto kerusakan
                      </a>
                    )}
                    {r.resolution_notes && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-medium">Catatan resolusi:</span> {r.resolution_notes}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {nextStatus && (
                        <button
                          onClick={() => handleAdvanceStatus(r)}
                          disabled={actionLoading === r.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                          {statusActionLabel[r.status]}
                        </button>
                      )}
                      <button
                        onClick={() => openNotes(r)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Wrench className="w-4 h-4" /> Catatan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Catatan Resolusi</h2>
              <button onClick={() => setNotesModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveNotes} className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Catatan</label>
                <textarea
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  rows={4}
                  placeholder="Tulis catatan resolusi untuk laporan ini..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNotesModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

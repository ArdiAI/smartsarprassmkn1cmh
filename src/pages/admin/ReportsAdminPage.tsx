import { useEffect, useState, useCallback } from 'react';
import {
  Search, Loader2, AlertTriangle, MapPin, User, Mail, Phone, Save, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

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
  inventory: { name: string } | null;
}

const SEVERITY_FILTERS = ['all', 'minor', 'moderate', 'severe'];
const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'resolved'];

const severityBadge = (s: string | null) => {
  switch (s) {
    case 'minor': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'moderate': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'severe': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const severityLabel = (s: string | null) => {
  switch (s) {
    case 'minor': return 'Minor';
    case 'moderate': return 'Sedang';
    case 'severe': return 'Berat';
    default: return '-';
  }
};

const statusBadge = (s: string) => {
  switch (s) {
    case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'resolved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
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
  const [managingId, setManagingId] = useState<string | null>(null);
  const [manageForm, setManageForm] = useState<{ status: string; resolution_notes: string }>({ status: '', resolution_notes: '' });
  const canManage = hasPermission('reports', 'manage');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_reports')
      .select('*, inventory!inventory_id(name)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat laporan', 'error');
      setReports([]);
    } else {
      setReports((data ?? []) as unknown as DamageReport[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const openManage = (r: DamageReport) => {
    setManagingId(r.id);
    setManageForm({ status: r.status, resolution_notes: r.resolution_notes ?? '' });
  };

  const handleSave = async (r: DamageReport) => {
    const payload: { status: string; resolution_notes: string | null; resolved_at: string | null } = {
      status: manageForm.status,
      resolution_notes: manageForm.resolution_notes.trim() || null,
      resolved_at: manageForm.status === 'resolved' ? new Date().toISOString() : r.resolved_at,
    };
    const { error } = await supabase.from('damage_reports').update(payload).eq('id', r.id);
    if (error) { showToast('Gagal memperbarui: ' + error.message, 'error'); return; }
    showToast('Laporan diperbarui', 'success');
    setManagingId(null);
    fetchReports();
  };

  const filtered = reports.filter((r) => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(r.reporter_name?.toLowerCase().includes(q) ?? false) && !(r.description?.toLowerCase().includes(q) ?? false) && !(r.inventory?.name?.toLowerCase().includes(q) ?? false)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Laporan Kerusakan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola laporan kerusakan barang sarana.</p>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Cari pelapor, deskripsi, atau barang..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="input w-auto" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              {SEVERITY_FILTERS.map((s) => <option key={s} value={s}>{s === 'all' ? 'Semua Tingkat' : severityLabel(s)}</option>)}
            </select>
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === 'all' ? 'Semua Status' : statusLabel(s)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="Tidak ada laporan" description="Belum ada laporan kerusakan." icon={<AlertTriangle className="h-8 w-8 text-slate-400" />} /></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {r.inventory?.name ?? 'Barang tidak diketahui'}
                    </h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityBadge(r.severity)}`}>
                      {severityLabel(r.severity)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </div>

                  {r.description && <p className="text-sm text-slate-600 dark:text-slate-400">{r.description}</p>}

                  {r.image_url && (
                    <img src={r.image_url} alt="Bukti kerusakan" className="h-40 w-full max-w-xs rounded-xl object-cover" />
                  )}

                  <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
                    {r.reporter_name && <div className="flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" /> {r.reporter_name}</div>}
                    {r.reporter_unit && <div className="text-slate-500">Unit: {r.reporter_unit}</div>}
                    {r.reporter_email && <div className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" /> {r.reporter_email}</div>}
                    {r.reporter_phone && <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" /> {r.reporter_phone}</div>}
                    {r.location && <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {r.location}</div>}
                  </div>

                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Dilaporkan: {new Date(r.created_at).toLocaleString('id-ID')}
                    {r.resolved_at && ` • Selesai: ${new Date(r.resolved_at).toLocaleString('id-ID')}`}
                  </p>

                  {r.resolution_notes && (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Catatan Penyelesaian: </span>
                      <span className="text-slate-600 dark:text-slate-400">{r.resolution_notes}</span>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="lg:w-64">
                    {managingId === r.id ? (
                      <div className="space-y-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                        <div>
                          <label className="label">Status</label>
                          <select className="input" value={manageForm.status} onChange={(e) => setManageForm({ ...manageForm, status: e.target.value })}>
                            <option value="pending">Menunggu</option>
                            <option value="in_progress">Diproses</option>
                            <option value="resolved">Selesai</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Catatan Penyelesaian</label>
                          <textarea className="input min-h-[60px]" value={manageForm.resolution_notes} onChange={(e) => setManageForm({ ...manageForm, resolution_notes: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSave(r)} className="btn-primary flex-1">
                            <Save className="h-4 w-4" /> Simpan
                          </button>
                          <button onClick={() => setManagingId(null)} className="btn-secondary">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => openManage(r)} className="btn-secondary w-full">
                        Kelola Laporan
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

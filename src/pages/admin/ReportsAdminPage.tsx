import { useEffect, useState, useMemo } from 'react';
import {
  Loader2,
  Search,
  AlertTriangle,
  X,
  CheckCircle2,
  Wrench,
  Clock,
  Save,
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

const severityStyles: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const severityLabel: Record<string, string> = {
  minor: 'Minor',
  moderate: 'Sedang',
  severe: 'Berat',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

const statusOrder = ['pending', 'in_progress', 'resolved'];

export default function ReportsAdminPage() {
  const { hasPermission } = useAuth();
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DamageReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newStatus, setNewStatus] = useState('pending');
  const [saving, setSaving] = useState(false);

  const canManage = hasPermission('reports', 'manage');

  async function fetchReports() {
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
  }

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(r.reporter_name ?? '').toLowerCase().includes(q) &&
          !(r.description ?? '').toLowerCase().includes(q) &&
          !(r.location ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [reports, search, severityFilter, statusFilter]);

  function openManage(r: DamageReport) {
    setEditing(r);
    setResolutionNotes(r.resolution_notes ?? '');
    setNewStatus(r.status);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setResolutionNotes('');
    setNewStatus('pending');
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
        resolution_notes: resolutionNotes.trim() || null,
      };
      if (newStatus === 'resolved' && !editing.resolved_at) {
        payload.resolved_at = new Date().toISOString();
      }
      if (newStatus !== 'resolved') {
        payload.resolved_at = null;
      }
      const { error } = await supabase.from('damage_reports').update(payload).eq('id', editing.id);
      if (error) {
        showToast('Gagal memperbarui laporan', 'error');
        return;
      }
      showToast('Laporan diperbarui', 'success');
      closeModal();
      fetchReports();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Laporan Kerusakan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola dan tangani laporan kerusakan barang inventaris.
        </p>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Cari pelapor, deskripsi, lokasi..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input lg:w-40" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="all">Semua Tingkat</option>
            <option value="minor">Minor</option>
            <option value="moderate">Sedang</option>
            <option value="severe">Berat</option>
          </select>
          <select className="input lg:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="in_progress">Diproses</option>
            <option value="resolved">Selesai</option>
          </select>
        </div>
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
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                      {r.reporter_name ?? 'Pelapor tidak diketahui'}
                    </h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityStyles[r.severity] ?? severityStyles.minor}`}>
                      {severityLabel[r.severity] ?? r.severity}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[r.status] ?? statusStyles.pending}`}>
                      {statusLabel[r.status] ?? r.status}
                    </span>
                  </div>

                  {r.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">{r.description}</p>
                  )}

                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                    {r.reporter_unit && <p>Unit: {r.reporter_unit}</p>}
                    {r.reporter_email && <p>Email: {r.reporter_email}</p>}
                    {r.reporter_phone && <p>Telepon: {r.reporter_phone}</p>}
                    {r.location && <p>Lokasi: {r.location}</p>}
                    <p>Dilaporkan: {new Date(r.created_at).toLocaleDateString('id-ID')}</p>
                  </div>

                  {r.resolution_notes && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Catatan Penyelesaian:</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{r.resolution_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {r.image_url && (
                    <a href={r.image_url} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-2 text-xs">
                      Lihat Foto
                    </a>
                  )}
                  {canManage && (
                    <button onClick={() => openManage(r)} className="btn-primary px-3 py-2 text-xs">
                      <Wrench className="h-3.5 w-3.5" />
                      Tangani
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tangani Laporan</h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{editing.reporter_name ?? 'Pelapor'}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{editing.description ?? '-'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <div className="flex flex-wrap gap-2">
                  {statusOrder.map((s) => {
                    const Icon = s === 'pending' ? Clock : s === 'in_progress' ? Wrench : CheckCircle2;
                    return (
                      <button
                        key={s}
                        onClick={() => setNewStatus(s)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          newStatus === s
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/20 dark:text-brand-300'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {statusLabel[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="label">Catatan Penyelesaian</label>
                <textarea
                  rows={4}
                  className="input"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Tindakan yang telah dilakukan..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={closeModal} className="btn-secondary">Batal</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

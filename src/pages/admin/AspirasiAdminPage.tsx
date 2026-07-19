import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import {
  Loader2,
  Search,
  MessageSquare,
  X,
  User,
  Mail,
  Tag,
  Calendar,
  Send,
  CheckCircle2,
} from 'lucide-react';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string | null;
  email: string | null;
  kategori: string | null;
  judul: string;
  isi: string | null;
  status: string;
  tanggapan: string | null;
  created_at: string;
  updated_at: string | null;
}

const STATUS_OPTIONS = ['all', 'pending', 'in_progress', 'resolved'];

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

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [reply, setReply] = useState('');

  const fetchAspirasi = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
      if (error) {
        showToast('Gagal memuat aspirasi', 'error');
        return;
      }
      setAspirasi((data as unknown as Aspirasi[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAspirasi(); }, [fetchAspirasi]);

  const updateStatus = async (item: Aspirasi, newStatus: string) => {
    setUpdatingId(item.id);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      showToast('Status aspirasi diperbarui', 'success');
      await fetchAspirasi();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const openReply = (item: Aspirasi) => {
    setReply(item.tanggapan ?? '');
    setReplyModal(item);
  };

  const submitReply = async () => {
    if (!replyModal) return;
    setUpdatingId(replyModal.id);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          tanggapan: reply.trim() || null,
          status: 'resolved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyModal.id);
      if (error) throw error;
      showToast('Tanggapan dikirim', 'success');
      setReplyModal(null);
      await fetchAspirasi();
    } catch {
      showToast('Gagal mengirim tanggapan', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = aspirasi.filter((a) => {
    const matchSearch = !search ||
      (a.nama ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.judul ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.isi ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Aspirasi</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola aspirasi dan saran dari warga sekolah</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Cari nama, judul, atau isi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
          <EmptyState title="Tidak ada aspirasi" description="Belum ada aspirasi yang masuk." icon={<MessageSquare className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(a.status ?? '')}`}>
                      {statusLabel(a.status ?? '')}
                    </span>
                    {a.kategori && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
                        <Tag className="h-3 w-3" />
                        {a.kategori}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{a.judul ?? '-'}</h3>
                  {a.isi && <p className="text-sm text-slate-600 dark:text-slate-300">{a.isi}</p>}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {a.nama ?? '-'}
                      {a.kelas_unit && <span>• {a.kelas_unit}</span>}
                    </div>
                    {a.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {a.email}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(a.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  {a.tanggapan && (
                    <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Tanggapan:</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{a.tanggapan}</p>
                    </div>
                  )}
                </div>

                {hasPermission('aspirasi', 'update') && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {a.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(a, 'in_progress')}
                        disabled={updatingId === a.id}
                        className="btn-secondary"
                      >
                        {updatingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                        Proses
                      </button>
                    )}
                    <button
                      onClick={() => openReply(a)}
                      className="btn-primary"
                    >
                      <Send className="h-4 w-4" />
                      Tanggapi
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReplyModal(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tanggapi Aspirasi</h2>
              <button onClick={() => setReplyModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{replyModal.judul ?? '-'}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {replyModal.nama ?? '-'} • {replyModal.kelas_unit ?? '-'}
              </p>
              {replyModal.isi && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{replyModal.isi}</p>}
            </div>
            <label className="label">Tanggapan</label>
            <textarea
              className="input min-h-[120px]"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Tulis tanggapan..."
            />
            <div className="mt-4 flex items-center gap-3">
              <button onClick={submitReply} className="btn-primary" disabled={updatingId === replyModal.id}>
                {updatingId === replyModal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Kirim Tanggapan
              </button>
              <button onClick={() => setReplyModal(null)} className="btn-secondary">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

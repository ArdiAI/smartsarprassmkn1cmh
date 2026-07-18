import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Loader2,
  MessageSquare,
  X,
  Send,
  Mail,
  User,
  Tag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import EmptyState from '../../components/EmptyState';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string | null;
  email: string | null;
  kategori: string | null;
  judul: string;
  isi: string;
  status: string;
  tanggapan: string | null;
  created_at: string;
  updated_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  baru: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  diproses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  selesai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const STATUS_OPTIONS = ['all', 'baru', 'diproses', 'selesai'];

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchAspirasi = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('aspirasi')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
    } else {
      setAspirasi((data as unknown as Aspirasi[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAspirasi();
  }, [fetchAspirasi]);

  const filtered = useMemo(() => {
    return aspirasi.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.nama?.toLowerCase().includes(q) ||
          a.judul?.toLowerCase().includes(q) ||
          a.isi?.toLowerCase().includes(q) ||
          a.kategori?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [aspirasi, search, statusFilter]);

  async function handleStatusChange(a: Aspirasi, newStatus: string) {
    setUpdating(a.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', a.id);
    setUpdating(null);
    if (error) {
      showToast('Gagal memperbarui status', 'error');
      return;
    }
    showToast('Status diperbarui', 'success');
    fetchAspirasi();
  }

  function openReplyModal(a: Aspirasi) {
    setReplyTarget(a);
    setReplyText(a.tanggapan ?? '');
    setShowReplyModal(true);
  }

  function closeReplyModal() {
    setShowReplyModal(false);
    setReplyTarget(null);
    setReplyText('');
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyTarget) return;
    setUpdating(replyTarget.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({
        tanggapan: replyText.trim() || null,
        status: replyTarget.status === 'baru' ? 'diproses' : replyTarget.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', replyTarget.id);
    setUpdating(null);
    if (error) {
      showToast('Gagal mengirim tanggapan', 'error');
      return;
    }
    showToast('Tanggapan dikirim', 'success');
    closeReplyModal();
    fetchAspirasi();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Aspirasi</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola aspirasi dan saran dari warga sekolah.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Cari nama, judul, kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'Semua Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8 text-slate-400" />}
          title="Tidak ada aspirasi"
          description="Belum ada aspirasi yang masuk."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{a.judul}</h3>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[a.status] ?? STATUS_STYLES.baru)}>
                      {a.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{a.isi}</p>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {a.nama}
                    </div>
                    {a.kelas_unit && <span>{a.kelas_unit}</span>}
                    {a.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {a.email}
                      </div>
                    )}
                    {a.kategori && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        {a.kategori}
                      </div>
                    )}
                    <span>{new Date(a.created_at).toLocaleDateString('id-ID')}</span>
                  </div>

                  {a.tanggapan && (
                    <div className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                      <span className="font-medium">Tanggapan: </span>{a.tanggapan}
                    </div>
                  )}
                </div>
              </div>

              {hasPermission('aspirasi', 'update') && (
                <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <select
                    value={a.status}
                    onChange={(e) => handleStatusChange(a, e.target.value)}
                    disabled={updating === a.id}
                    className="input w-auto py-1.5 text-sm"
                  >
                    <option value="baru">Baru</option>
                    <option value="diproses">Diproses</option>
                    <option value="selesai">Selesai</option>
                  </select>
                  <button
                    onClick={() => openReplyModal(a)}
                    disabled={updating === a.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    {updating === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    Tanggapi
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tanggapi Aspirasi</h2>
              <button onClick={closeReplyModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{replyTarget.judul}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{replyTarget.isi}</p>
            </div>
            <form onSubmit={handleReply}>
              <label className="label">Tanggapan</label>
              <textarea
                className="input min-h-[120px]"
                placeholder="Tulis tanggapan..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={closeReplyModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={updating === replyTarget.id} className="btn-primary">
                  {updating === replyTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

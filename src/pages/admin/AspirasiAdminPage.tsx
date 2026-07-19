import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Loader2,
  MessageSquare,
  Mail,
  User,
  Send,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import { cn } from '../../utils/cn';

interface Aspirasi {
  id: string;
  nama: string | null;
  kelas_unit: string | null;
  email: string | null;
  kategori: string | null;
  judul: string | null;
  isi: string | null;
  status: string | null;
  tanggapan: string | null;
  created_at: string;
  updated_at: string | null;
}

const STATUS_OPTIONS = ['all', 'pending', 'reviewed', 'responded', 'closed'];
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  responded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  reviewed: 'Ditinjau',
  responded: 'Ditanggapi',
  closed: 'Selesai',
};

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchAspirasi = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('aspirasi')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
      setItems([]);
    } else {
      setItems((data as unknown as Aspirasi[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAspirasi(); }, [fetchAspirasi]);

  const updateStatus = async (item: Aspirasi, newStatus: string) => {
    setUpdating(item.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    setUpdating(null);
    if (error) {
      showToast('Gagal memperbarui status: ' + error.message, 'error');
      return;
    }
    showToast('Status diperbarui', 'success');
    await fetchAspirasi();
  };

  const openReply = (item: Aspirasi) => {
    setReplyModal(item);
    setReplyText(item.tanggapan ?? '');
  };

  const sendReply = async () => {
    if (!replyModal) return;
    if (!replyText.trim()) {
      showToast('Tanggapan tidak boleh kosong', 'error');
      return;
    }
    setUpdating(replyModal.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({
        tanggapan: replyText.trim(),
        status: 'responded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', replyModal.id);
    setUpdating(null);
    if (error) {
      showToast('Gagal mengirim tanggapan: ' + error.message, 'error');
      return;
    }
    showToast('Tanggapan dikirim', 'success');
    setReplyModal(null);
    await fetchAspirasi();
  };

  const filtered = items.filter((a) => {
    const matchSearch =
      !search ||
      a.nama?.toLowerCase().includes(search.toLowerCase()) ||
      a.judul?.toLowerCase().includes(search.toLowerCase()) ||
      a.isi?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const canUpdate = hasPermission('aspirasi', 'update');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Aspirasi</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola aspirasi dan masukan dari warga sekolah.
        </p>
      </div>

      <div className="card space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari nama, judul, atau isi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Semua Status' : STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada aspirasi" description="Belum ada data aspirasi." icon={<MessageSquare className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                      {a.judul ?? 'Tanpa judul'}
                    </h3>
                    {a.kategori && (
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                        {a.kategori}
                      </span>
                    )}
                    {a.status && (
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[a.status] ?? '')}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{a.isi ?? '-'}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                    {a.nama && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {a.nama}
                      </span>
                    )}
                    {a.kelas_unit && <span>{a.kelas_unit}</span>}
                    {a.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {a.email}
                      </span>
                    )}
                    <span>{new Date(a.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {a.tanggapan && (
                <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <span className="font-medium">Tanggapan: </span>{a.tanggapan}
                </div>
              )}

              {canUpdate && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    onClick={() => openReply(a)}
                    disabled={updating === a.id}
                    className="btn-primary"
                  >
                    {updating === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Tanggapi
                  </button>
                  <select
                    value={a.status ?? 'pending'}
                    onChange={(e) => updateStatus(a, e.target.value)}
                    disabled={updating === a.id}
                    className="input max-w-[200px]"
                  >
                    <option value="pending">Menunggu</option>
                    <option value="reviewed">Ditinjau</option>
                    <option value="responded">Ditanggapi</option>
                    <option value="closed">Selesai</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tanggapi Aspirasi</h2>
              <button onClick={() => setReplyModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{replyModal.judul ?? '-'}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{replyModal.isi ?? '-'}</p>
              <p className="mt-2 text-xs text-slate-400">Dari: {replyModal.nama ?? '-'} ({replyModal.kelas_unit ?? '-'})</p>
            </div>
            <label className="label">Tanggapan</label>
            <textarea
              className="input min-h-[120px] resize-y"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Tulis tanggapan..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setReplyModal(null)} className="btn-secondary">Batal</button>
              <button onClick={sendReply} className="btn-primary" disabled={updating === replyModal.id}>
                {updating === replyModal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Kirim Tanggapan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

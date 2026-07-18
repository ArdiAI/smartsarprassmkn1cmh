import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  MessageSquare, Loader2, X, Mail, User, Tag, Calendar, Send,
} from 'lucide-react';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string;
  email: string | null;
  kategori: string | null;
  judul: string;
  isi: string;
  status: string;
  tanggapan: string | null;
  created_at: string;
  updated_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusOptions = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'in_progress', label: 'Diproses' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
];

export default function AspirasiAdminPage() {
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAspirasi = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
      setLoading(false);
      return;
    }
    setAspirasi((data as unknown as Aspirasi[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAspirasi();
  }, [fetchAspirasi]);

  const filtered = aspirasi.filter(a => statusFilter === 'all' || a.status === statusFilter);

  const handleStatusChange = async (a: Aspirasi, newStatus: string) => {
    setUpdatingId(a.id);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', a.id);
      if (error) throw error;
      showToast('Status diperbarui', 'success');
      await fetchAspirasi();
    } catch (e) {
      console.error(e);
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const openReply = (a: Aspirasi) => {
    setReplyModal(a);
    setReplyText(a.tanggapan ?? '');
  };

  const handleReply = async () => {
    if (!replyModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          tanggapan: replyText.trim() || null,
          status: replyModal.status === 'pending' ? 'in_progress' : replyModal.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyModal.id);
      if (error) throw error;
      showToast('Tanggapan dikirim', 'success');
      setReplyModal(null);
      await fetchAspirasi();
    } catch (e) {
      console.error(e);
      showToast('Gagal mengirim tanggapan', 'error');
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Tinjau dan tangapi aspirasi warga sekolah</p>
      </div>

      <select
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
        className="input sm:max-w-xs"
      >
        <option value="all">Semua Status</option>
        <option value="pending">Menunggu</option>
        <option value="in_progress">Diproses</option>
        <option value="resolved">Selesai</option>
        <option value="rejected">Ditolak</option>
      </select>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada aspirasi</p>
          <p className="text-sm text-slate-400 mt-1">Belum ada aspirasi yang sesuai filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(a => {
            const sc = statusConfig[a.status] ?? statusConfig.pending;
            return (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{a.judul}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{a.isi}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" /> {a.nama}
                        {a.kelas_unit && <span className="text-slate-400">· {a.kelas_unit}</span>}
                      </div>
                      {a.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" /> {a.email}
                        </div>
                      )}
                      {a.kategori && (
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-slate-400" /> {a.kategori}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" /> {new Date(a.created_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                    {a.tanggapan && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <span className="font-medium">Tanggapan:</span> {a.tanggapan}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-48">
                    <select
                      value={a.status}
                      onChange={e => handleStatusChange(a, e.target.value)}
                      disabled={updatingId === a.id}
                      className="input text-sm"
                    >
                      {statusOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => openReply(a)}
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Tanggapi
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setReplyModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Dari</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {replyModal.nama} {replyModal.kelas_unit && `· ${replyModal.kelas_unit}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Judul</p>
                <p className="font-medium text-slate-900 dark:text-white">{replyModal.judul}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Isi Aspirasi</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">{replyModal.isi}</p>
              </div>
              <div>
                <label className="label">Tanggapan</label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={4}
                  className="input"
                  placeholder="Tulis tanggapan untuk aspirasi ini..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setReplyModal(null)} className="btn-secondary">Batal</button>
              <button onClick={handleReply} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

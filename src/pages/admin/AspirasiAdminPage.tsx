import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  MessageSquare, Loader2, X, Mail, Clock, Send, Tag,
} from 'lucide-react';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string | null;
  email: string | null;
  kategori: string | null;
  judul: string;
  isi: string;
  status: string | null;
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

export default function AspirasiAdminPage() {
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState('resolved');
  const [saving, setSaving] = useState(false);

  const fetchAspirasi = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('aspirasi')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
    } else {
      setAspirasi((data as unknown as Aspirasi[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAspirasi();
  }, [fetchAspirasi]);

  const filtered = aspirasi.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const updateStatus = async (item: Aspirasi, status: string) => {
    const { error } = await supabase
      .from('aspirasi')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast('Status berhasil diperbarui', 'success');
      fetchAspirasi();
    }
  };

  const openReply = (item: Aspirasi) => {
    setReplyModal(item);
    setReplyText(item.tanggapan ?? '');
    setNewStatus(item.status === 'resolved' ? 'resolved' : 'resolved');
  };

  const handleReply = async () => {
    if (!replyModal) return;
    setSaving(true);
    const { error } = await supabase
      .from('aspirasi')
      .update({
        tanggapan: replyText || null,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', replyModal.id);
    if (error) {
      showToast('Gagal mengirim tanggapan', 'error');
    } else {
      showToast('Tanggapan berhasil dikirim', 'success');
      fetchAspirasi();
      setReplyModal(null);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan masukan dari pengguna</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const st = statusConfig[item.status ?? 'pending'] ?? statusConfig.pending;
            return (
              <div key={item.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', st.color)}>{st.label}</span>
                      {item.kategori && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300">
                          <Tag className="w-3 h-3" /> {item.kategori}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{item.judul ?? '-'}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{item.isi ?? '-'}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium">{item.nama ?? 'N/A'}</span>
                      {item.kelas_unit && <span>• {item.kelas_unit}</span>}
                      {item.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {item.email}
                        </span>
                      )}
                    </div>
                    {item.tanggapan && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Tanggapan:</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">{item.tanggapan}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(item, 'in_progress')}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        Proses
                      </button>
                    )}
                    <button
                      onClick={() => openReply(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" /> Tanggapi
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h3>
              <button onClick={() => setReplyModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Dari</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {replyModal.nama ?? 'N/A'}
                  {replyModal.kelas_unit && ` (${replyModal.kelas_unit})`}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Judul</p>
                <p className="font-medium text-slate-900 dark:text-white">{replyModal.judul ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Isi Aspirasi</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                  {replyModal.isi ?? '-'}
                </p>
              </div>
              <div>
                <label className="label">Tanggapan</label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={4}
                  className="input"
                  placeholder="Tulis tanggapan..."
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="input"
                >
                  <option value="pending">Menunggu</option>
                  <option value="in_progress">Diproses</option>
                  <option value="resolved">Selesai</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setReplyModal(null)} className="btn-secondary">Batal</button>
                <button
                  onClick={handleReply}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

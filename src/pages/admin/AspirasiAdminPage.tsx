import { useEffect, useState, useCallback } from 'react';
import { Loader2, MessageSquare, X, Send, Mail, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface AspirasiRow {
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

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  rejected: 'Ditolak',
};

const statusOptions = ['pending', 'in_progress', 'resolved', 'rejected'];

export default function AspirasiAdminPage() {
  const [aspirasi, setAspirasi] = useState<AspirasiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('resolved');
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('aspirasi')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
    } else {
      setAspirasi((data as unknown as AspirasiRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = aspirasi.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  const handleUpdateStatus = async (item: AspirasiRow, newStatus: string) => {
    setUpdatingStatus(item.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast(`Status diperbarui ke: ${statusLabels[newStatus] ?? newStatus}`, 'success');
      fetchData();
    }
    setUpdatingStatus(null);
  };

  const openReply = (item: AspirasiRow) => {
    setReplyId(item.id);
    setReplyText(item.tanggapan ?? '');
    setReplyStatus(item.status === 'rejected' ? 'rejected' : 'resolved');
  };

  const handleReply = async () => {
    if (!replyId) return;
    if (!replyText.trim()) {
      showToast('Tanggapan tidak boleh kosong', 'warning');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('aspirasi')
      .update({
        tanggapan: replyText.trim(),
        status: replyStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', replyId);

    if (error) {
      showToast('Gagal mengirim tanggapan', 'error');
    } else {
      showToast('Tanggapan terkirim', 'success');
      setReplyId(null);
      setReplyText('');
      fetchData();
    }
    setSaving(false);
  };

  const replyItem = replyId ? aspirasi.find(a => a.id === replyId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Aspirasi</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola aspirasi dan masukan dari warga
        </p>
      </div>

      {/* Filter */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Filter Status</label>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Semua</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-slate-400 dark:text-slate-500">Belum ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-400 flex items-center justify-center text-white flex-shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{item.judul}</h3>
                      {item.kategori && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {item.kategori}
                        </span>
                      )}
                      {item.status && (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-lg text-xs font-medium',
                            statusColors[item.status] ?? statusColors.pending
                          )}
                        >
                          {statusLabels[item.status] ?? item.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{item.isi}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                      <span>{item.nama}</span>
                      {item.kelas_unit && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {item.kelas_unit}
                        </span>
                      )}
                      {item.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {item.email}
                        </span>
                      )}
                      <span>{new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    {item.tanggapan && (
                      <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">Tanggapan:</p>
                        <p className="text-xs text-slate-700 dark:text-slate-200">{item.tanggapan}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openReply(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {item.tanggapan ? 'Edit Tanggapan' : 'Tanggapi'}
                </button>
                <select
                  value={item.status ?? 'pending'}
                  onChange={e => handleUpdateStatus(item, e.target.value)}
                  disabled={updatingStatus === item.id}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{statusLabels[s] ?? s}</option>
                  ))}
                </select>
                {updatingStatus === item.id && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {replyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setReplyId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Aspirasi dari: {replyItem.nama}</p>
                <p className="text-sm font-medium text-slate-800 dark:text-white">{replyItem.judul}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{replyItem.isi}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tanggapan</label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Tulis tanggapan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
                <select
                  value={replyStatus}
                  onChange={e => setReplyStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{statusLabels[s] ?? s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setReplyId(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleReply}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
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

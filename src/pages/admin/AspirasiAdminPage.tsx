import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';
import {
  MessageSquare,
  Loader2,
  X,
  Reply,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string | null;
  email: string | null;
  kategori: string | null;
  judul: string;
  isi: string | null;
  status: string | null;
  tanggapan: string | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  rejected: 'Ditolak',
};

export default function AspirasiAdminPage() {
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('aspirasi')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
    } else {
      setItems((data as unknown as Aspirasi[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = items.filter(a => filterStatus === 'all' || a.status === filterStatus);

  const updateStatus = async (item: Aspirasi, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      showToast('Status diperbarui', 'success');
      await fetchItems();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    }
  };

  const openReply = (item: Aspirasi) => {
    setReplyModal(item);
    setReplyText(item.tanggapan ?? '');
  };

  const handleReply = async () => {
    if (!replyModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          tanggapan: replyText.trim() || null,
          status: 'resolved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyModal.id);
      if (error) throw error;
      showToast('Tanggapan terkirim', 'success');
      setReplyModal(null);
      await fetchItems();
    } catch {
      showToast('Gagal mengirim tanggapan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan saran dari pengguna</p>
      </div>

      {/* Filter */}
      <div>
        <label className="text-xs text-slate-400 block mb-1">Filter Status</label>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Semua</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{item.judul}</h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-medium',
                          statusColors[item.status ?? 'pending']
                        )}
                      >
                        {statusLabels[item.status ?? 'pending'] ?? item.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{item.isi ?? '—'}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                      <span>Dari: {item.nama ?? '—'}</span>
                      {item.kelas_unit && <span>• {item.kelas_unit}</span>}
                      {item.kategori && <span>• Kategori: {item.kategori}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(item.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    {item.email && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {item.email}
                      </p>
                    )}
                    {item.tanggapan && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Tanggapan:</p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">{item.tanggapan}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                {item.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(item, 'in_progress')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Proses
                  </button>
                )}
                <button
                  onClick={() => openReply(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  {item.tanggapan ? 'Edit Tanggapan' : 'Tanggapi'}
                </button>
                {item.status !== 'rejected' && item.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus(item, 'rejected')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Tolak
                  </button>
                )}
                {item.status === 'resolved' && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Selesai
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h3>
              <button onClick={() => setReplyModal(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 mb-4">
              <p className="font-medium text-sm text-slate-900 dark:text-white">{replyModal.judul}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{replyModal.isi ?? '—'}</p>
              <p className="text-xs text-slate-400 mt-2">Dari: {replyModal.nama ?? '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Tanggapan</label>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={4}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Tulis tanggapan..."
              />
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setReplyModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleReply}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

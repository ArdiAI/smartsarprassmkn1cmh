import { useEffect, useState } from 'react';
import {
  MessageSquare, Loader2, X, Send, Mail, Clock, Tag, User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

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

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  in_review: { label: 'Ditinjau', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  responded: { label: 'Direspons', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  closed: { label: 'Selesai', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export default function AspirasiAdminPage() {
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAspirasi();
  }, []);

  async function fetchAspirasi() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aspirasi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAspirasi((data as unknown as Aspirasi[]) || []);
    } catch (err) {
      console.error('Fetch aspirasi error:', err);
      showToast('Gagal memuat aspirasi', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(item: Aspirasi, newStatus: string) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      showToast('Status diperbarui', 'success');
      await fetchAspirasi();
    } catch (err) {
      console.error('Update status error:', err);
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleReply() {
    if (!replyModal) return;
    if (!replyText.trim()) {
      showToast('Tanggapan tidak boleh kosong', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          tanggapan: replyText.trim(),
          status: 'responded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyModal.id);
      if (error) throw error;
      showToast('Tanggapan terkirim', 'success');
      setReplyModal(null);
      setReplyText('');
      await fetchAspirasi();
    } catch (err) {
      console.error('Reply error:', err);
      showToast('Gagal mengirim tanggapan', 'error');
    } finally {
      setSaving(false);
    }
  }

  function openReply(item: Aspirasi) {
    setReplyModal(item);
    setReplyText(item.tanggapan ?? '');
  }

  const filtered = filterStatus === 'all' ? aspirasi : aspirasi.filter((a) => a.status === filterStatus);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola dan tanggapi aspirasi dari warga sekolah
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'pending', 'in_review', 'responded', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filterStatus === s
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
            )}
          >
            {s === 'all' ? 'Semua' : statusConfig[s]?.label ?? s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const sc = statusConfig[item.status ?? 'pending'] ?? statusConfig.pending;
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.judul ?? 'Tanpa Judul'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {new Date(item.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0', sc.class)}>
                    {sc.label}
                  </span>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300">{item.isi ?? '-'}</p>

                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {item.nama ?? '-'}
                  </span>
                  {item.kelas_unit && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      {item.kelas_unit}
                    </span>
                  )}
                  {item.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {item.email}
                    </span>
                  )}
                  {item.kategori && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                      {item.kategori}
                    </span>
                  )}
                </div>

                {item.tanggapan && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Tanggapan:</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{item.tanggapan}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => openReply(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{item.tanggapan ? 'Edit Tanggapan' : 'Tanggapi'}</span>
                  </button>
                  <select
                    value={item.status ?? 'pending'}
                    onChange={(e) => updateStatus(item, e.target.value)}
                    disabled={saving}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Menunggu</option>
                    <option value="in_review">Ditinjau</option>
                    <option value="responded">Direspons</option>
                    <option value="closed">Selesai</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h3>
              <button onClick={() => setReplyModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{replyModal.nama ?? '-'}</p>
                  {replyModal.kelas_unit && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">• {replyModal.kelas_unit}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{replyModal.judul ?? '-'}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{replyModal.isi ?? '-'}</p>
                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Clock className="w-3 h-3" />
                  {new Date(replyModal.created_at).toLocaleString('id-ID')}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">Tanggapan</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Tulis tanggapan untuk aspirasi ini..."
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setReplyModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleReply}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Kirim</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  MessageSquare, Loader2, Mail, User, Tag, X, Send, Clock,
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
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('aspirasi', 'update');

  const [aspirasiList, setAspirasiList] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyId, setReplyId] = useState<string | null>(null);
  const [tanggapan, setTanggapan] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const fetchAspirasi = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('aspirasi')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
      setLoading(false);
      return;
    }
    setAspirasiList((data as unknown as Aspirasi[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAspirasi();
  }, [fetchAspirasi]);

  const filtered = aspirasiList.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const openReply = (item: Aspirasi) => {
    setReplyId(item.id);
    setTanggapan(item.tanggapan ?? '');
  };

  const handleReply = async (item: Aspirasi) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          tanggapan: tanggapan || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (error) throw error;
      showToast('Tanggapan dikirim', 'success');
      setReplyId(null);
      await fetchAspirasi();
    } catch (e) {
      console.error(e);
      showToast('Gagal mengirim tanggapan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (item: Aspirasi, newStatus: string) => {
    setStatusUpdating(item.id);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (error) throw error;
      showToast('Status diperbarui', 'success');
      await fetchAspirasi();
    } catch (e) {
      console.error(e);
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setStatusUpdating(null);
    }
  };

  const replyingItem = aspirasiList.find(a => a.id === replyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan saran dari pengguna</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input sm:w-48">
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const sc = statusConfig[item.status] || statusConfig.pending;
            return (
              <div key={item.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{item.judul}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{item.isi ?? '-'}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-3 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> {item.nama}
                      </span>
                      {item.kelas_unit && (
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" /> {item.kelas_unit}
                        </span>
                      )}
                      {item.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> {item.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {new Date(item.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    {item.tanggapan && (
                      <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          <span className="font-medium text-blue-600 dark:text-blue-400">Tanggapan: </span>{item.tanggapan}
                        </p>
                      </div>
                    )}
                  </div>
                  {canUpdate && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={item.status}
                        onChange={e => handleStatusChange(item, e.target.value)}
                        disabled={statusUpdating === item.id}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                      >
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => openReply(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" /> Tanggapi
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {replyingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setReplyId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                <p className="font-medium text-slate-900 dark:text-white text-sm">{replyingItem.judul}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{replyingItem.isi ?? '-'}</p>
                <p className="text-xs text-slate-400 mt-2">— {replyingItem.nama}</p>
              </div>
              <div>
                <label className="label">Tanggapan</label>
                <textarea
                  value={tanggapan}
                  onChange={e => setTanggapan(e.target.value)}
                  rows={5}
                  placeholder="Tulis tanggapan untuk aspirasi ini..."
                  className="input"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setReplyId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleReply(replyingItem)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Kirim Tanggapan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

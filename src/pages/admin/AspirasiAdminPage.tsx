import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  MessageSquare, Loader2, Search, X, Mail, User, Tag, Clock, Send,
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

  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAspirasi = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aspirasi')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAspirasi((data as unknown as Aspirasi[]) || []);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat aspirasi', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAspirasi();
  }, [fetchAspirasi]);

  const filtered = aspirasi.filter(a => {
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

  const handleStatusChange = async (a: Aspirasi, newStatus: string) => {
    if (!canUpdate) {
      showToast('Anda tidak memiliki izin untuk mengubah status', 'error');
      return;
    }
    if (newStatus === a.status) return;
    setActionLoading(a.id);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', a.id);
      if (error) throw error;
      showToast('Status aspirasi diperbarui', 'success');
      await fetchAspirasi();
    } catch (e) {
      console.error(e);
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openReply = (a: Aspirasi) => {
    setReplyModal(a);
    setReplyText(a.tanggapan ?? '');
  };

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyModal) return;
    if (!canUpdate) {
      showToast('Anda tidak memiliki izin untuk menanggapi aspirasi', 'error');
      return;
    }
    if (!replyText.trim()) {
      showToast('Tanggapan tidak boleh kosong', 'warning');
      return;
    }
    setSavingReply(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          tanggapan: replyText.trim(),
          status: replyModal.status === 'pending' ? 'resolved' : replyModal.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyModal.id);
      if (error) throw error;
      showToast('Tanggapan berhasil dikirim', 'success');
      setReplyModal(null);
      await fetchAspirasi();
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan tanggapan', 'error');
    } finally {
      setSavingReply(false);
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
        <p className="text-slate-500 dark:text-slate-400 mt-1">Tinjau dan tanggapi aspirasi dari pengguna</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, judul, isi, atau kategori..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

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
            const sc = statusConfig[a.status] || statusConfig.pending;
            const isExpanded = expandedId === a.id;
            return (
              <div key={a.id} className="card overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{a.judul ?? ''}</h3>
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{a.isi ?? ''}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {a.nama ?? 'Anonim'}</div>
                        {a.kelas_unit && <span>{a.kelas_unit}</span>}
                        {a.email && (
                          <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {a.email}</div>
                        )}
                        {a.kategori && (
                          <div className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {a.kategori}</div>
                        )}
                        <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(a.created_at).toLocaleDateString('id-ID')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-5 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Isi Aspirasi</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{a.isi ?? ''}</p>
                    </div>

                    {a.tanggapan && (
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Tanggapan</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{a.tanggapan}</p>
                      </div>
                    )}

                    {canUpdate && (
                      <div className="flex items-center gap-3 flex-wrap pt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status:</label>
                          <select
                            value={a.status}
                            onChange={e => handleStatusChange(a, e.target.value)}
                            disabled={actionLoading === a.id}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                          >
                            {statusOptions.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {actionLoading === a.id && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        </div>
                        <button
                          onClick={() => openReply(a)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                          <Send className="w-4 h-4" /> Tanggapi
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setReplyModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveReply} className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{replyModal.judul ?? ''}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-3">{replyModal.isi ?? ''}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">— {replyModal.nama ?? 'Anonim'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Tanggapan</label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={5}
                  placeholder="Tulis tanggapan untuk aspirasi ini..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Status akan otomatis berubah menjadi "Selesai" jika masih "Menunggu".
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingReply}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {savingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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

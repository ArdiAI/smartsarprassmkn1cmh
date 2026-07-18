import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  MessageSquare, Loader2, Search, X, Mail, Calendar, Send, Tag, User,
} from 'lucide-react';

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAspirasi((data as unknown as Aspirasi[]) || []);
    } catch {
      showToast('Gagal memuat aspirasi', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = aspirasi.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.nama?.toLowerCase().includes(q) ||
      a.judul?.toLowerCase().includes(q) ||
      a.isi?.toLowerCase().includes(q) ||
      a.kategori?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = async (a: Aspirasi, newStatus: string) => {
    setActionLoading(a.id);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', a.id);
      if (error) throw error;
      showToast('Status diperbarui', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message ?? 'Gagal memperbarui status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openReply = (a: Aspirasi) => {
    setReplyModal(a);
    setReplyText(a.tanggapan ?? '');
  };

  const handleSendReply = async () => {
    if (!replyModal) return;
    if (!replyText.trim()) {
      showToast('Tanggapan tidak boleh kosong', 'warning');
      return;
    }
    setActionLoading(replyModal.id);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          tanggapan: replyText.trim(),
          status: replyModal.status === 'pending' ? 'in_progress' : replyModal.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyModal.id);
      if (error) throw error;
      showToast('Tanggapan dikirim', 'success');
      setReplyModal(null);
      await fetchData();
    } catch (err: any) {
      showToast(err.message ?? 'Gagal mengirim tanggapan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan keluhan</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, judul, kategori..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Status</option>
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const st = statusConfig[a.status] || statusConfig.pending;
            return (
              <div key={a.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{a.judul}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.color)}>{st.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{a.isi}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {a.nama}</span>
                      {a.kelas_unit && <span>{a.kelas_unit}</span>}
                      {a.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {a.email}</span>}
                      {a.kategori && <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {a.kategori}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(a.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    {a.tanggapan && (
                      <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium text-blue-700 dark:text-blue-400">Tanggapan: </span>{a.tanggapan}
                      </div>
                    )}
                  </div>
                  {canUpdate && (
                    <div className="flex flex-col gap-2 sm:w-36">
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a, e.target.value)}
                        disabled={actionLoading === a.id}
                        className="px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {statusOptions.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => openReply(a)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 font-medium"
                      >
                        <Send className="w-3.5 h-3.5" /> Tanggapi
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
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setReplyModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Tanggapi Aspirasi
              </h2>
              <button onClick={() => setReplyModal(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Dari</p>
                <p className="font-medium text-slate-900 dark:text-white">{replyModal.nama} {replyModal.kelas_unit ? `(${replyModal.kelas_unit})` : ''}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Judul</p>
                <p className="font-medium text-slate-900 dark:text-white">{replyModal.judul}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Isi Aspirasi</p>
                <p className="text-slate-700 dark:text-slate-300">{replyModal.isi}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggapan</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Tulis tanggapan..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setReplyModal(null)} className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium">
                Batal
              </button>
              <button
                onClick={handleSendReply}
                disabled={actionLoading === replyModal.id}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading === replyModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

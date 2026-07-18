import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import {
  MessageSquare, Loader2, Search, X, User, Mail, Clock, MessageCircle,
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
  updated_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  baru: { label: 'Baru', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  diproses: { label: 'Diproses', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  selesai: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const statusOptions = ['baru', 'diproses', 'selesai'];

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');

  const canUpdate = hasPermission('aspirasi', 'update');

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

  const handleStatusChange = async (item: Aspirasi, newStatus: string) => {
    setActionLoading(item.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast('Status diperbarui', 'success');
      await fetchAspirasi();
    }
    setActionLoading(null);
  };

  const openReply = (item: Aspirasi) => {
    setReplyModal(item);
    setReplyText(item.tanggapan || '');
  };

  const handleSaveReply = async () => {
    if (!replyModal) return;
    setActionLoading(replyModal.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({
        tanggapan: replyText || null,
        status: replyModal.status === 'baru' ? 'diproses' : replyModal.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', replyModal.id);
    if (error) {
      showToast('Gagal menyimpan tanggapan', 'error');
    } else {
      showToast('Tanggapan dikirim', 'success');
      setReplyModal(null);
      await fetchAspirasi();
    }
    setActionLoading(null);
  };

  const filtered = aspirasi.filter(a => {
    if (statusFilter !== 'all' && (a.status || 'baru') !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.nama?.toLowerCase().includes(q) ||
        a.judul?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.kategori?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Tinjau dan tanggapi aspirasi dari pengguna</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, judul, atau email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="baru">Baru</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
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
        <div className="space-y-3">
          {filtered.map(a => {
            const st = statusConfig[a.status || 'baru'] || statusConfig.baru;
            return (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{a.judul}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                      {a.kategori && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {a.kategori}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" /> {a.nama}
                      </div>
                      {a.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" /> {a.email}
                        </div>
                      )}
                      {a.kelas_unit && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" /> {a.kelas_unit}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" /> {new Date(a.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                    {a.isi && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{a.isi}</p>
                    )}
                    {a.tanggapan && (
                      <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm">
                        <p className="text-blue-600 dark:text-blue-300 font-medium mb-1 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4" /> Tanggapan:
                        </p>
                        <p className="text-slate-700 dark:text-slate-200">{a.tanggapan}</p>
                      </div>
                    )}
                  </div>
                  {canUpdate && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <select
                        value={a.status || 'baru'}
                        onChange={e => handleStatusChange(a, e.target.value)}
                        disabled={actionLoading === a.id}
                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                      >
                        {statusOptions.map(s => (
                          <option key={s} value={s}>{statusConfig[s].label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => openReply(a)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Tanggapi
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setReplyModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setReplyModal(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Dari</p>
                <p className="font-medium text-slate-900 dark:text-white">{replyModal.nama} · {replyModal.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Judul</p>
                <p className="font-medium text-slate-900 dark:text-white">{replyModal.judul}</p>
              </div>
              {replyModal.isi && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Isi Aspirasi</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 rounded-lg bg-slate-50 dark:bg-slate-700/30 p-3">{replyModal.isi}</p>
                </div>
              )}
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
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setReplyModal(null)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleSaveReply} disabled={actionLoading === replyModal.id} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                {actionLoading === replyModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

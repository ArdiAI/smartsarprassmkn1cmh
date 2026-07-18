import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import {
  Loader2, Search, MessageSquare, X, Mail, User, Send, Clock,
} from 'lucide-react';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string;
  email: string;
  kategori: string;
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
  responded: { label: 'Ditanggapi', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('aspirasi', 'update');

  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Aspirasi | null>(null);
  const [tanggapan, setTanggapan] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
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

  const filtered = items.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.nama?.toLowerCase().includes(q) ||
      a.judul?.toLowerCase().includes(q) ||
      a.kategori?.toLowerCase().includes(q) ||
      a.kelas_unit?.toLowerCase().includes(q)
    );
  });

  const updateStatus = async (a: Aspirasi, newStatus: string) => {
    if (!canUpdate) return;
    setActionLoading(a.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', a.id);
    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast('Status diperbarui', 'success');
      fetchItems();
    }
    setActionLoading(null);
  };

  const openReply = (a: Aspirasi) => {
    setReplyTarget(a);
    setTanggapan(a.tanggapan ?? '');
    setReplyOpen(true);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTarget) return;
    setActionLoading(replyTarget.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({
        tanggapan: tanggapan || null,
        status: 'responded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', replyTarget.id);
    if (error) {
      showToast('Gagal mengirim tanggapan', 'error');
    } else {
      showToast('Tanggapan dikirim', 'success');
      setReplyOpen(false);
      fetchItems();
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan keluhan</p>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, judul, kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="in_progress">Diproses</option>
            <option value="responded">Ditanggapi</option>
            <option value="resolved">Selesai</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>

        <div className="text-sm text-slate-500 dark:text-slate-400">
          Menampilkan {filtered.length} dari {items.length} aspirasi
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada aspirasi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const stCfg = statusConfig[a.status] || statusConfig.pending;
              return (
                <div key={a.id} className="rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4 bg-white dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{a.judul}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stCfg.color}`}>{stCfg.label}</span>
                        {a.kategori && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                            {a.kategori}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{a.isi}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {a.nama}</span>
                        {a.kelas_unit && <span>{a.kelas_unit}</span>}
                        {a.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {a.email}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(a.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                      {a.tanggapan && (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">
                          <strong>Tanggapan:</strong> {a.tanggapan}
                        </div>
                      )}
                    </div>
                    {canUpdate && (
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {a.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(a, 'in_progress')}
                            disabled={actionLoading === a.id}
                            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                          >
                            Proses
                          </button>
                        )}
                        <button
                          onClick={() => openReply(a)}
                          disabled={actionLoading === a.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-1"
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
      </div>

      {/* Reply modal */}
      {replyOpen && replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setReplyOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" /> Tanggapi Aspirasi
              </h2>
              <button onClick={() => setReplyOpen(false)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReply} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 text-sm">
                <p className="font-medium text-slate-900 dark:text-white">{replyTarget.judul}</p>
                <p className="text-slate-600 dark:text-slate-300 mt-1">{replyTarget.isi}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">— {replyTarget.nama} ({replyTarget.kelas_unit || '-'})</p>
              </div>
              <div>
                <label className="label">Tanggapan</label>
                <textarea
                  className="input min-h-[120px]"
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                  placeholder="Tulis tanggapan..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setReplyOpen(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={actionLoading === replyTarget.id} className="btn-primary flex items-center gap-2">
                  {actionLoading === replyTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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

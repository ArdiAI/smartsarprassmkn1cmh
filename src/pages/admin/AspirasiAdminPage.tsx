import { useEffect, useState } from 'react';
import {
  MessageSquare, Search, X, Mail, Save, Inbox, CheckCircle, Clock, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';

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

const statusConfig: Record<string, { label: string; classes: string; icon: typeof Clock }> = {
  baru: { label: 'Baru', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Inbox },
  diproses: { label: 'Diproses', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Clock },
  selesai: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
};

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [tanggapan, setTanggapan] = useState('');
  const [newStatus, setNewStatus] = useState('baru');
  const [saving, setSaving] = useState(false);

  const canUpdate = hasPermission('aspirasi', 'update');

  useEffect(() => {
    fetchAspirasi();
  }, []);

  async function fetchAspirasi() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('aspirasi')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAspirasi((data as unknown as Aspirasi[]) ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Gagal memuat aspirasi', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = aspirasi.filter((a) => {
    const matchSearch =
      a.nama.toLowerCase().includes(search.toLowerCase()) ||
      a.judul.toLowerCase().includes(search.toLowerCase()) ||
      (a.kategori ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function openReply(a: Aspirasi) {
    setReplyModal(a);
    setTanggapan(a.tanggapan ?? '');
    setNewStatus(a.status ?? 'baru');
  }

  async function handleSave() {
    if (!replyModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          tanggapan: tanggapan.trim() || null,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyModal.id);
      if (error) throw error;
      showToast('Tanggapan berhasil disimpan', 'success');
      setReplyModal(null);
      await fetchAspirasi();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Gagal menyimpan tanggapan', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(a: Aspirasi, status: string) {
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', a.id);
      if (error) throw error;
      showToast('Status berhasil diperbarui', 'success');
      await fetchAspirasi();
    } catch (err) {
      console.error('Status error:', err);
      showToast('Gagal memperbarui status', 'error');
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan masukan dari pengguna</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari aspirasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="baru">Baru</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const stat = statusConfig[a.status ?? 'baru'] ?? statusConfig.baru;
            const StatusIcon = stat.icon;
            return (
              <div
                key={a.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{a.judul}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-md text-xs font-medium flex items-center gap-1', stat.classes)}>
                        <StatusIcon className="w-3 h-3" /> {stat.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{a.nama}</span>
                      {a.kelas_unit && <span>({a.kelas_unit})</span>}
                      {a.kategori && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {a.kategori}
                        </span>
                      )}
                      {a.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {a.email}
                        </span>
                      )}
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{a.isi}</p>

                    {a.tanggapan && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-0.5">Tanggapan:</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{a.tanggapan}</p>
                      </div>
                    )}
                  </div>

                  {canUpdate && (
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <button
                        onClick={() => openReply(a)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Tanggapi
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => quickStatus(a, 'diproses')}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                            a.status === 'diproses'
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                          )}
                        >
                          Proses
                        </button>
                        <button
                          onClick={() => quickStatus(a, 'selesai')}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                            a.status === 'selesai'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                          )}
                        >
                          Selesai
                        </button>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setReplyModal(null)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setReplyModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Aspirasi Info */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{replyModal.judul}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {replyModal.nama}
                  {replyModal.kelas_unit ? ` (${replyModal.kelas_unit})` : ''}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{replyModal.isi}</p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="baru">Baru</option>
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>

              {/* Tanggapan */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tanggapan</label>
                <textarea
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Tulis tanggapan untuk aspirasi ini..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyModal(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

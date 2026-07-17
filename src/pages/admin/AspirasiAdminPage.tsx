import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Loader2,
  Mail,
  User,
  Tag,
  Send,
  X,
  Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string;
  email: string | null;
  kategori: string;
  judul: string;
  isi: string;
  status: string;
  tanggapan: string | null;
  created_at: string;
  updated_at: string | null;
}

const statusStyles: Record<string, string> = {
  baru: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  dibaca: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  diproses: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  selesai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const statusLabel: Record<string, string> = {
  baru: 'Baru',
  dibaca: 'Dibaca',
  diproses: 'Diproses',
  selesai: 'Selesai',
};

const statusOptions = ['baru', 'dibaca', 'diproses', 'selesai'];

export default function AspirasiAdminPage() {
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('aspirasi')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
    } else {
      setAspirasi((data || []) as unknown as Aspirasi[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateStatus = async (item: Aspirasi, newStatus: string) => {
    setUpdatingId(item.id);
    const { error } = await supabase
      .from('aspirasi')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      showToast('Gagal memperbarui status', 'error');
    } else {
      showToast('Status berhasil diperbarui', 'success');
      loadData();
    }
    setUpdatingId(null);
  };

  const openReply = (item: Aspirasi) => {
    setReplyModal(item);
    setReplyText(item.tanggapan || '');
  };

  const handleReply = async () => {
    if (!replyModal) return;
    setUpdatingId(replyModal.id);
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
      showToast('Tanggapan berhasil disimpan', 'success');
      setReplyModal(null);
      setReplyText('');
      loadData();
    }
    setUpdatingId(null);
  };

  const filtered = aspirasi.filter(
    (a) => filterStatus === 'all' || a.status === filterStatus
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola aspirasi dan saran dari pengguna
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Semua</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Aspirasi list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-400">Belum ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {item.judul}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {item.nama}
                      </span>
                      <span>{item.kelas_unit}</span>
                      {item.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" /> {item.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {item.kategori}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0',
                    statusStyles[item.status] || statusStyles.baru
                  )}
                >
                  {statusLabel[item.status] || item.status}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3">
                {item.isi}
              </p>

              {item.tanggapan && (
                <div className="mt-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Tanggapan:
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">{item.tanggapan}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <select
                  value={item.status}
                  onChange={(e) => updateStatus(item, e.target.value)}
                  disabled={updatingId === item.id}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel[s]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => openReply(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {item.tanggapan ? 'Edit Tanggapan' : 'Tanggapi'}
                </button>
                {updatingId === item.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Tanggapi Aspirasi
              </h2>
              <button
                onClick={() => setReplyModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/30 p-3">
                <p className="font-medium text-slate-900 dark:text-white text-sm">
                  {replyModal.judul}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {replyModal.isi}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Dari: {replyModal.nama} ({replyModal.kelas_unit})
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Tanggapan
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Tulis tanggapan..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setReplyModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleReply}
                  disabled={updatingId === replyModal.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {updatingId === replyModal.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
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

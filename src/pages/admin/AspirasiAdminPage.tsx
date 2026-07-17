import { useEffect, useState } from 'react';
import { MessageSquare, X, Mail, Send, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string;
  email: string;
  kategori: string;
  judul: string;
  isi: string;
  status: string;
  tanggapan: string;
  created_at: string;
  updated_at: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

export default function AspirasiAdminPage() {
  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAspirasi, setActiveAspirasi] = useState<Aspirasi | null>(null);
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState('pending');

  const fetchAspirasi = async () => {
    setLoading(true);
    const { data } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
    setAspirasi((data as unknown as Aspirasi[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAspirasi();
  }, []);

  const openModal = (item: Aspirasi) => {
    setActiveAspirasi(item);
    setReply(item.tanggapan ?? '');
    setNewStatus(item.status ?? 'pending');
    setModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!activeAspirasi) return;
    const { error } = await supabase
      .from('aspirasi')
      .update({
        status: newStatus,
        tanggapan: reply || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeAspirasi.id);
    if (error) {
      showToast('Gagal memperbarui aspirasi', 'error');
      return;
    }
    showToast('Aspirasi diperbarui', 'success');
    setModalOpen(false);
    await fetchAspirasi();
  };

  const quickStatusUpdate = async (item: Aspirasi, status: string) => {
    const { error } = await supabase
      .from('aspirasi')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) {
      showToast('Gagal mengubah status', 'error');
      return;
    }
    showToast('Status diperbarui', 'success');
    await fetchAspirasi();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Aspirasi</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tinjau dan tanggapi aspirasi dari warga sekolah</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : aspirasi.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada aspirasi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {aspirasi.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.nama ?? 'N/A'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.kelas_unit ?? ''}</p>
                  </div>
                </div>
                <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[item.status] ?? statusStyles.pending)}>
                  {statusLabels[item.status] ?? item.status}
                </span>
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{item.judul ?? ''}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">{item.isi ?? ''}</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 mb-3">
                {item.kategori && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700">{item.kategori}</span>
                )}
                {item.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {item.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {new Date(item.created_at ?? '').toLocaleDateString('id-ID')}
                </span>
              </div>

              {item.tanggapan && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-3">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Tanggapan:</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.tanggapan}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openModal(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Tanggapi
                </button>
                {item.status === 'pending' && (
                  <button
                    onClick={() => quickStatusUpdate(item, 'in_progress')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    Proses
                  </button>
                )}
                {item.status !== 'resolved' && (
                  <button
                    onClick={() => quickStatusUpdate(item, 'resolved')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && activeAspirasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tanggapi Aspirasi</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm">
                <p className="font-semibold text-slate-800 dark:text-white">{activeAspirasi.judul ?? ''}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {activeAspirasi.nama ?? ''} • {activeAspirasi.kelas_unit ?? ''}
                </p>
                <p className="text-slate-600 dark:text-slate-300 mt-3">{activeAspirasi.isi ?? ''}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="pending">Menunggu</option>
                  <option value="in_progress">Diproses</option>
                  <option value="resolved">Selesai</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Tanggapan</label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder="Tulis tanggapan..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleUpdate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4" /> Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { MessageSquare, X, Send, Mail, Building2 } from 'lucide-react';
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
  in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  responded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  responded: 'Responded',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export default function AspirasiAdminPage() {
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aspirasi | null>(null);
  const [tanggapan, setTanggapan] = useState('');
  const [newStatus, setNewStatus] = useState<string>('pending');
  const [saving, setSaving] = useState(false);

  const fetchAspirasi = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
    } else {
      setItems((data as unknown as Aspirasi[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAspirasi();
  }, []);

  const filtered = items.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const openReply = (a: Aspirasi) => {
    setEditing(a);
    setTanggapan(a.tanggapan ?? '');
    setNewStatus(a.status ?? 'pending');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('aspirasi')
      .update({
        tanggapan: tanggapan,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editing.id);
    if (error) {
      showToast('Gagal mengupdate aspirasi', 'error');
    } else {
      showToast('Tanggapan berhasil dikirim', 'success');
      setModalOpen(false);
      fetchAspirasi();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan masukan</p>
      </div>

      {/* Filter */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Filter Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua</option>
          <option value="pending">Pending</option>
          <option value="in_review">In Review</option>
          <option value="responded">Responded</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <MessageSquare className="w-12 h-12 mb-3" />
          <p className="text-sm">Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusStyles[a.status] ?? statusStyles.pending)}>
                      {statusLabels[a.status] ?? a.status ?? 'pending'}
                    </span>
                    {a.kategori && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {a.kategori}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{a.judul ?? ''}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{a.isi ?? ''}</p>
                </div>
                <button
                  onClick={() => openReply(a)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 whitespace-nowrap"
                >
                  <Send className="w-4 h-4" /> Tanggapi
                </button>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {a.nama ?? '-'}</span>
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {a.kelas_unit ?? '-'}</span>
                {a.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {a.email}</span>}
                <span>{new Date(a.created_at ?? '').toLocaleDateString('id-ID')}</span>
              </div>
              {a.tanggapan && (
                <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Tanggapan:</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{a.tanggapan}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-400">Dari</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{editing.nama ?? '-'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{editing.judul ?? ''}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{editing.isi ?? ''}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_review">In Review</option>
                  <option value="responded">Responded</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggapan</label>
                <textarea
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                  rows={4}
                  placeholder="Tulis tanggapan..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Mengirim...' : 'Kirim Tanggapan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

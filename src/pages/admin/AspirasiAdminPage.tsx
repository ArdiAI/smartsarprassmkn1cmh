import { useEffect, useState } from 'react';
import {
  MessageSquare, X, Loader2, AlertCircle, Mail, User, Calendar, Send,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface Aspirasi {
  id: string;
  title: string;
  description: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  status: string;
  reply: string | null;
  created_at: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    replied: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    closed: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  };
  return map[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
};

export default function AspirasiAdminPage() {
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('aspirasi')
        .select('id, title, description, reporter_name, reporter_email, status, reply, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as unknown as Aspirasi[]) || []);
    } catch {
      showToast('Gagal memuat aspirasi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter((a) => statusFilter === 'all' || a.status === statusFilter);

  const openReplyModal = (a: Aspirasi) => {
    setEditing(a);
    setReplyText(a.reply || '');
    setModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status: newStatus })
        .eq('id', editing.id);

      if (error) throw error;
      showToast('Status diperbarui', 'success');
      setModalOpen(false);
      fetchItems();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendReply = async () => {
    if (!editing) return;
    if (!replyText.trim()) {
      showToast('Balasan tidak boleh kosong', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ reply: replyText, status: 'replied' })
        .eq('id', editing.id);

      if (error) throw error;
      showToast('Balasan terkirim', 'success');
      setModalOpen(false);
      fetchItems();
    } catch {
      showToast('Gagal mengirim balasan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan masukan</p>
      </div>

      <div>
        <label className="label">Filter Status</label>
        <select className="input max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Semua</option>
          <option value="new">Baru</option>
          <option value="in_review">Sedang Ditinjau</option>
          <option value="replied">Dibalas</option>
          <option value="closed">Ditutup</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{a.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(a.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', statusBadge(a.status))}>
                  {a.status.replace('_', ' ')}
                </span>
              </div>

              {a.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-3">{a.description}</p>
              )}

              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                {a.reporter_name && (
                  <p className="flex items-center gap-1.5"><User className="w-3 h-3" /> {a.reporter_name}</p>
                )}
                {a.reporter_email && (
                  <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {a.reporter_email}</p>
                )}
              </div>

              {a.reply && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 mb-3">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Balasan</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{a.reply}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openReplyModal(a)}
                  className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium"
                >
                  <Send className="w-4 h-4" /> Balas / Update
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Kelola Aspirasi</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Judul</p>
                <p className="text-slate-900 dark:text-white">{editing.title}</p>
              </div>
              {editing.description && (
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{editing.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {editing.reporter_name && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Pelapor</p>
                    <p className="text-slate-900 dark:text-white">{editing.reporter_name}</p>
                  </div>
                )}
                {editing.reporter_email && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-slate-900 dark:text-white">{editing.reporter_email}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 'new', label: 'Baru' },
                    { val: 'in_review', label: 'Ditinjau' },
                    { val: 'replied', label: 'Dibalas' },
                    { val: 'closed', label: 'Ditutup' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => handleUpdateStatus(opt.val)}
                      disabled={saving}
                      className={cn(
                        'px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all disabled:opacity-50',
                        editing.status === opt.val
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Balasan</label>
                <textarea
                  className="input min-h-[120px] resize-y"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Tulis balasan untuk pelapor..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Tutup</button>
              <button onClick={handleSendReply} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Kirim Balasan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

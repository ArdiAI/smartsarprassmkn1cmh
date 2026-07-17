import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, X, Loader2, Mail, Clock, Reply, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface Aspirasi {
  id: string;
  title: string;
  description: string;
  reporter_name: string;
  reporter_email: string;
  status: string;
  created_at: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    responded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    closed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return map[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export default function AspirasiAdminPage() {
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aspirasi')
        .select('id, title, description, reporter_name, reporter_email, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data ?? []) as unknown as Aspirasi[]);
    } catch {
      showToast('Gagal memuat aspirasi', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === 'all' ? items : items.filter((a) => a.status === filter);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      showToast('Status aspirasi diperbarui', 'success');
      await load();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const openReply = (aspirasi: Aspirasi) => {
    setReplyModal(aspirasi);
    setReplyText('');
  };

  const handleReply = async () => {
    if (!replyModal) return;
    if (!replyText.trim()) {
      showToast('Isi balasan terlebih dahulu', 'warning');
      return;
    }
    setSaving(true);
    try {
      // Store reply in a replies table if it exists, otherwise store as a status update
      // We update the aspirasi status to 'responded' and store the reply
      const { error: updateError } = await supabase
        .from('aspirasi')
        .update({ status: 'responded' })
        .eq('id', replyModal.id);
      if (updateError) throw updateError;

      // Try to insert into aspirasi_replies (best-effort)
      try {
        await supabase.from('aspirasi_replies').insert({
          aspirasi_id: replyModal.id,
          reply_text: replyText.trim(),
          replier_name: 'Admin',
        });
      } catch {
        // Table might not exist; the status update is the primary action
        console.warn('aspirasi_replies table not available');
      }

      showToast('Balasan terkirim', 'success');
      setReplyModal(null);
      await load();
    } catch {
      showToast('Gagal mengirim balasan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filters = ['all', 'pending', 'in_review', 'responded', 'closed'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan masukan dari pengguna</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              {f === 'all' ? 'Semua' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((aspirasi) => (
            <div key={aspirasi.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{aspirasi.title}</h3>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', statusBadge(aspirasi.status))}>
                      {aspirasi.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{aspirasi.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {aspirasi.reporter_name}</span>
                    {aspirasi.reporter_email && (
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {aspirasi.reporter_email}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(aspirasi.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {aspirasi.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(aspirasi.id, 'in_review')}
                    disabled={updatingId === aspirasi.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {updatingId === aspirasi.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                    Mulai Review
                  </button>
                )}
                {aspirasi.status !== 'responded' && aspirasi.status !== 'closed' && (
                  <button
                    onClick={() => openReply(aspirasi)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    Balas
                  </button>
                )}
                {aspirasi.status === 'responded' && (
                  <button
                    onClick={() => updateStatus(aspirasi.id, 'closed')}
                    disabled={updatingId === aspirasi.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    {updatingId === aspirasi.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Tutup
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setReplyModal(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Balas Aspirasi</h2>
              <button onClick={() => setReplyModal(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{replyModal.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{replyModal.description}</p>
                <p className="text-xs text-slate-400 mt-2">Dari: {replyModal.reporter_name} · {replyModal.reporter_email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Balasan</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Tulis balasan untuk aspirasi ini..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setReplyModal(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Batal</button>
              <button onClick={handleReply} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Reply className="w-4 h-4" />}
                Kirim Balasan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

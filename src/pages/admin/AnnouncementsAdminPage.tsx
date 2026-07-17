import { useEffect, useState } from 'react';
import {
  Megaphone, Plus, Pencil, Trash2, X, Loader2, AlertCircle, Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  author: string | null;
}

interface FormData {
  id?: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  author: string;
}

const emptyForm: FormData = {
  title: '',
  description: '',
  priority: 'normal',
  status: 'draft',
  author: '',
};

const priorityConfig: Record<string, { label: string; class: string }> = {
  high: { label: 'Tinggi', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  normal: { label: 'Normal', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  low: { label: 'Rendah', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

const statusConfig: Record<string, { label: string; class: string }> = {
  published: { label: 'Dipublikasi', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  draft: { label: 'Draft', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  archived: { label: 'Arsip', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

export default function AnnouncementsAdminPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements((data as unknown as Announcement[]) || []);
    } catch (err) {
      console.error('Fetch announcements error:', err);
      showToast('Gagal memuat pengumuman', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(a: Announcement) {
    setForm({
      id: a.id,
      title: a.title ?? '',
      description: a.description ?? '',
      priority: a.priority ?? 'normal',
      status: a.status ?? 'draft',
      author: a.author ?? '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      showToast('Judul wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const isPublishing = form.status === 'published' && !form.id;
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        author: form.author.trim() || null,
        published_at: isPublishing ? new Date().toISOString() : null,
      };

      if (form.id) {
        // For existing, only set published_at if transitioning to published
        const existing = announcements.find((a) => a.id === form.id);
        const nowPublishing = form.status === 'published' && existing?.status !== 'published';
        const updatePayload = {
          ...payload,
          published_at: nowPublishing ? new Date().toISOString() : existing?.published_at ?? null,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('announcements').update(updatePayload).eq('id', form.id);
        if (error) throw error;
        showToast('Pengumuman diperbarui', 'success');
      } else {
        const { error } = await supabase.from('announcements').insert(payload);
        if (error) throw error;
        showToast('Pengumuman ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchAnnouncements();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Gagal menyimpan pengumuman', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('Pengumuman dihapus', 'success');
      setDeleteId(null);
      await fetchAnnouncements();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Gagal menghapus pengumuman', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola pengumuman sistem</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengumuman</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const pc = priorityConfig[a.priority ?? 'normal'] ?? priorityConfig.normal;
            const sc = statusConfig[a.status ?? 'draft'] ?? statusConfig.draft;
            return (
              <div
                key={a.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.title}</p>
                      {a.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{a.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', pc.class)}>{pc.label}</span>
                        <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', sc.class)}>{sc.label}</span>
                        {a.author && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">oleh {a.author}</span>
                        )}
                        {a.published_at && (
                          <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(a.published_at).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(a.id)}
                      className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {form.id ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">Judul *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-300">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Prioritas</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="high">Tinggi</option>
                    <option value="normal">Normal</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Dipublikasi</option>
                    <option value="archived">Arsip</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-300">Penulis</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Hapus Pengumuman?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

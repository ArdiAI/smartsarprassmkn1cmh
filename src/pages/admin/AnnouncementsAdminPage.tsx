import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone, X, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  author: string;
  published_at: string;
  created_at: string;
  updated_at: string;
}

const priorityStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const priorityLabels: Record<string, string> = {
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
};

const statusStyles: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const statusLabels: Record<string, string> = {
  published: 'Dipublikasi',
  draft: 'Draft',
};

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'draft',
  author: '',
};

export default function AnnouncementsAdminPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements((data as unknown as Announcement[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openAdd = () => {
    setForm({ ...emptyForm, author: user?.email ?? '' });
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (ann: Announcement) => {
    setForm({
      title: ann.title ?? '',
      description: ann.description ?? '',
      priority: ann.priority ?? 'medium',
      status: ann.status ?? 'draft',
      author: ann.author ?? '',
    });
    setEditingId(ann.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Judul wajib diisi', 'warning');
      return;
    }
    const isPublishing = form.status === 'published';
    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      author: form.author || user?.email || null,
      published_at: isPublishing ? new Date().toISOString() : null,
    };
    if (editingId) {
      const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui pengumuman', 'error');
        return;
      }
      showToast('Pengumuman diperbarui', 'success');
    } else {
      const { error } = await supabase.from('announcements').insert(payload);
      if (error) {
        showToast('Gagal menambah pengumuman', 'error');
        return;
      }
      showToast('Pengumuman ditambahkan', 'success');
    }
    setModalOpen(false);
    await fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus pengumuman', 'error');
      return;
    }
    showToast('Pengumuman dihapus', 'success');
    await fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Pengumuman</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola pengumuman sistem</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Pengumuman
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">{ann.title ?? ''}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{ann.description ?? ''}</p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', priorityStyles[ann.priority] ?? priorityStyles.medium)}>
                        Prioritas: {priorityLabels[ann.priority] ?? ann.priority}
                      </span>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[ann.status] ?? statusStyles.draft)}>
                        {statusLabels[ann.status] ?? ann.status}
                      </span>
                      {ann.author && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">oleh {ann.author}</span>
                      )}
                      {ann.published_at && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5" /> {new Date(ann.published_at).toLocaleDateString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(ann)}
                    className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editingId ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Judul *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Prioritas</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  >
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Dipublikasi</option>
                  </select>
                </div>
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
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

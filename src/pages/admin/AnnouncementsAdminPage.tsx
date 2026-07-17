import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Megaphone, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';

interface AnnouncementRow {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  author: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface FormData {
  title: string;
  description: string;
  priority: string;
  status: string;
}

const emptyForm: FormData = {
  title: '',
  description: '',
  priority: 'normal',
  status: 'draft',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

const statusColors: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function AnnouncementsAdminPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('Gagal memuat pengumuman', 'error');
    } else {
      setAnnouncements((data as unknown as AnnouncementRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (announcement: AnnouncementRow) => {
    setForm({
      title: announcement.title ?? '',
      description: announcement.description ?? '',
      priority: announcement.priority ?? 'normal',
      status: announcement.status ?? 'draft',
    });
    setEditingId(announcement.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Judul wajib diisi', 'warning');
      return;
    }

    setSaving(true);
    const isPublishing = form.status === 'published' && editingId;
    const wasPublished = editingId ? announcements.find(a => a.id === editingId)?.status === 'published' : false;

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    // Set author on create
    if (!editingId) {
      payload.author = user?.email ?? 'Admin';
    }

    // Set published_at when transitioning to published
    if (form.status === 'published' && !wasPublished) {
      payload.published_at = new Date().toISOString();
    }

    if (editingId) {
      const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui pengumuman', 'error');
      } else {
        showToast('Pengumuman diperbarui', 'success');
        setModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('announcements').insert(payload);
      if (error) {
        showToast('Gagal menambahkan pengumuman', 'error');
      } else {
        showToast('Pengumuman ditambahkan', 'success');
        setModalOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus pengumuman', 'error');
    } else {
      showToast('Pengumuman dihapus', 'success');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pengumuman</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengumuman dan informasi
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengumuman
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
          <Megaphone className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-slate-400 dark:text-slate-500">Belum ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(announcement => (
            <div
              key={announcement.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white flex-shrink-0">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{announcement.title}</h3>
                      {announcement.priority && (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-lg text-xs font-medium capitalize',
                            priorityColors[announcement.priority] ?? priorityColors.normal
                          )}
                        >
                          {announcement.priority}
                        </span>
                      )}
                      {announcement.status && (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-lg text-xs font-medium capitalize',
                            statusColors[announcement.status] ?? statusColors.draft
                          )}
                        >
                          {announcement.status}
                        </span>
                      )}
                    </div>
                    {announcement.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                        {announcement.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                      {announcement.author && <span>Oleh: {announcement.author}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(announcement.created_at).toLocaleDateString('id-ID')}
                      </span>
                      {announcement.published_at && (
                        <span>Terbit: {new Date(announcement.published_at).toLocaleDateString('id-ID')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(announcement)}
                    className="p-2 rounded-lg text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editingId ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Judul *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Prioritas</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="high">Tinggi</option>
                    <option value="normal">Normal</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Terbit</option>
                    <option value="archived">Arsip</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

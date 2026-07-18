import { useEffect, useState } from 'react';
import {
  Megaphone, Plus, Pencil, Trash2, X, AlertCircle, Calendar, User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';

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
  status: 'active',
  author: '',
};

const priorityConfig: Record<string, { label: string; classes: string }> = {
  high: { label: 'Tinggi', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  normal: { label: 'Normal', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  low: { label: 'Rendah', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
};

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: 'Aktif', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  inactive: { label: 'Nonaktif', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  draft: { label: 'Draft', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

export default function AnnouncementsAdminPage() {
  const { hasPermission } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canCreate = hasPermission('announcements', 'create');
  const canUpdate = hasPermission('announcements', 'update');
  const canDelete = hasPermission('announcements', 'delete');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncements((data as unknown as Announcement[]) ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Gagal memuat pengumuman', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(ann: Announcement) {
    setEditingId(ann.id);
    setForm({
      title: ann.title ?? '',
      description: ann.description ?? '',
      priority: ann.priority ?? 'normal',
      status: ann.status ?? 'active',
      author: ann.author ?? '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Judul wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const isActive = form.status === 'active';
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        author: form.author.trim() || null,
        published_at: isActive ? new Date().toISOString() : null,
      };

      if (editingId) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Pengumuman berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('announcements').insert(payload);
        if (error) throw error;
        showToast('Pengumuman berhasil ditambahkan', 'success');
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
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('Pengumuman berhasil dihapus', 'success');
      setDeleteId(null);
      await fetchAnnouncements();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Gagal menghapus pengumuman', 'error');
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola pengumuman sistem</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="w-4 h-4" /> Tambah Pengumuman
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Tidak ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => {
            const prio = priorityConfig[ann.priority ?? 'normal'] ?? priorityConfig.normal;
            const stat = statusConfig[ann.status ?? 'active'] ?? statusConfig.active;
            return (
              <div
                key={ann.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{ann.title}</h3>
                      <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', prio.classes)}>
                        {prio.label}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', stat.classes)}>
                        {stat.label}
                      </span>
                    </div>
                    {ann.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-2">{ann.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                      {ann.author && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> {ann.author}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(ann.created_at)}
                      </span>
                    </div>
                  </div>

                  {(canUpdate || canDelete) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canUpdate && (
                        <button
                          onClick={() => openEdit(ann)}
                          className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteId(ann.id)}
                          className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Judul *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Judul pengumuman"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Isi pengumuman"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Prioritas</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="high">Tinggi</option>
                    <option value="normal">Normal</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Penulis</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nama penulis"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hapus Pengumuman?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

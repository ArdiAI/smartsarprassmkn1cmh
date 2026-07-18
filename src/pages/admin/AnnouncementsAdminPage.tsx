import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  Megaphone, Plus, Pencil, Trash2, Loader2, X,
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  author: string | null;
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: 'Tinggi', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  medium: { label: 'Sedang', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  low: { label: 'Rendah', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  published: { label: 'Dipublikasi', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  draft: { label: 'Draf', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  archived: { label: 'Arsip', color: 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400' },
};

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'draft',
  author: '',
};

export default function AnnouncementsAdminPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('announcements', 'create');
  const canUpdate = hasPermission('announcements', 'update');
  const canDelete = hasPermission('announcements', 'delete');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat pengumuman', 'error');
      setLoading(false);
      return;
    }
    setAnnouncements((data as unknown as Announcement[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title ?? '',
      description: a.description ?? '',
      priority: a.priority ?? 'medium',
      status: a.status ?? 'draft',
      author: a.author ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) {
      showToast('Judul wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const isPublishing = form.status === 'published' && (!editing || editing.status !== 'published');
    const payload = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      status: form.status,
      author: form.author || null,
      published_at: isPublishing ? new Date().toISOString() : (editing?.published_at ?? null),
    };
    try {
      if (editing) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Pengumuman diperbarui', 'success');
      } else {
        const { error } = await supabase.from('announcements').insert(payload);
        if (error) throw error;
        showToast('Pengumuman ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchAnnouncements();
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan pengumuman', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`Hapus "${a.title}"?`)) return;
    const { error } = await supabase.from('announcements').delete().eq('id', a.id);
    if (error) {
      showToast('Gagal menghapus pengumuman', 'error');
      return;
    }
    showToast('Pengumuman dihapus', 'success');
    await fetchAnnouncements();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola pengumuman SMART SARPRAS</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const pc = priorityConfig[a.priority] || priorityConfig.medium;
            const sc = statusConfig[a.status] || statusConfig.draft;
            return (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', pc.color)}>{pc.label}</span>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {a.author ?? 'Anonim'} · {new Date(a.created_at).toLocaleDateString('id-ID')}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{a.description}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {canUpdate && (
                      <button
                        onClick={() => openEdit(a)}
                        className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Judul *</label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Prioritas</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="high">Tinggi</option>
                    <option value="medium">Sedang</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="draft">Draf</option>
                    <option value="published">Dipublikasi</option>
                    <option value="archived">Arsip</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Penulis</label>
                <input
                  value={form.author}
                  onChange={e => setForm({ ...form, author: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

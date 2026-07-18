import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  Megaphone, Plus, Pencil, Trash2, X, Loader2, Calendar, User,
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
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

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: 'Tinggi', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  low: { label: 'Rendah', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300' },
  archived: { label: 'Arsip', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
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
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
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

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    setForm({
      title: announcement.title ?? '',
      description: announcement.description ?? '',
      priority: announcement.priority ?? 'normal',
      status: announcement.status ?? 'active',
      author: announcement.author ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      showToast('Judul wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      status: form.status,
      author: form.author || null,
      published_at: form.status === 'active' ? new Date().toISOString() : null,
    };

    try {
      if (editing) {
        const { error } = await supabase.from('announcements').update({
          ...payload,
          updated_at: new Date().toISOString(),
        }).eq('id', editing.id);
        if (error) throw error;
        showToast('Pengumuman diperbarui', 'success');
      } else {
        const { error } = await supabase.from('announcements').insert(payload);
        if (error) throw error;
        showToast('Pengumuman ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchAnnouncements();
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan pengumuman', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      showToast('Pengumuman dihapus', 'success');
      setDeleteId(null);
      await fetchAnnouncements();
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus pengumuman', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola pengumuman sistem</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(announcement => {
            const pc = priorityConfig[announcement.priority] || priorityConfig.normal;
            const sc = statusConfig[announcement.status] || statusConfig.active;
            return (
              <div key={announcement.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{announcement.title}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', pc.color)}>{pc.label}</span>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                    </div>
                    {announcement.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{announcement.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
                      {announcement.author && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> {announcement.author}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(announcement.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canUpdate && (
                      <button
                        onClick={() => openEdit(announcement)}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteId(announcement.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Hapus"
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

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="label">Judul</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Prioritas</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="input"
                  >
                    <option value="high">Tinggi</option>
                    <option value="normal">Normal</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="input"
                  >
                    <option value="active">Aktif</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Arsip</option>
                  </select>
                </div>
                <div>
                  <label className="label">Penulis</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hapus Pengumuman?</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Tindakan ini tidak dapat dibatalkan. Yakin ingin menghapus pengumuman ini?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
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

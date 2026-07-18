import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import {
  Megaphone, Plus, Pencil, Trash2, X, Loader2, Search, Calendar, User,
} from 'lucide-react';

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

const emptyForm = {
  title: '',
  description: '',
  priority: 'normal',
  status: 'draft',
  author: '',
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Rendah', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  high: { label: 'Tinggi', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  urgent: { label: 'Darurat', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  published: { label: 'Dipublikasi', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  archived: { label: 'Diarsipkan', color: 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400' },
};

const priorityOptions = ['low', 'normal', 'high', 'urgent'];
const statusOptions = ['draft', 'published', 'archived'];

export default function AnnouncementsAdminPage() {
  const { hasPermission } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canCreate = hasPermission('announcements', 'create');
  const canUpdate = hasPermission('announcements', 'update');
  const canDelete = hasPermission('announcements', 'delete');

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat pengumuman', 'error');
    } else {
      setAnnouncements((data as unknown as Announcement[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setForm({
      title: a.title || '',
      description: a.description || '',
      priority: a.priority || 'normal',
      status: a.status || 'draft',
      author: a.author || '',
    });
    setEditingId(a.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) {
      showToast('Judul pengumuman wajib diisi', 'error');
      return;
    }
    setSaving(true);
    const isPublishing = form.status === 'published';
    const payload = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      status: form.status,
      author: form.author || null,
      published_at: isPublishing ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui pengumuman', 'error');
      } else {
        showToast('Pengumuman diperbarui', 'success');
        setModalOpen(false);
        await fetchAnnouncements();
      }
    } else {
      const { error } = await supabase.from('announcements').insert(payload);
      if (error) {
        showToast('Gagal menambah pengumuman', 'error');
      } else {
        showToast('Pengumuman ditambahkan', 'success');
        setModalOpen(false);
        await fetchAnnouncements();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('announcements').delete().eq('id', deleteId);
    if (error) {
      showToast('Gagal menghapus pengumuman', 'error');
    } else {
      showToast('Pengumuman dihapus', 'success');
      setDeleteId(null);
      await fetchAnnouncements();
    }
  };

  const filtered = announcements.filter(a => {
    if (statusFilter !== 'all' && (a.status || 'draft') !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.author?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola pengumuman untuk pengguna</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Pengumuman
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul atau penulis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="published">Dipublikasi</option>
          <option value="archived">Diarsipkan</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const pr = priorityConfig[a.priority || 'normal'] || priorityConfig.normal;
            const st = statusConfig[a.status || 'draft'] || statusConfig.draft;
            return (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${pr.color}`}>{pr.label}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    {a.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{a.description}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-500 dark:text-slate-400 mt-2">
                      {a.author && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" /> {a.author}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {a.published_at ? new Date(a.published_at).toLocaleDateString('id-ID') : new Date(a.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {canUpdate && (
                      <button
                        onClick={() => openEdit(a)}
                        className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteId(a.id)}
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Judul</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="Judul pengumuman" />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className="input" placeholder="Isi pengumuman..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Prioritas</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input">
                    {priorityOptions.map(p => (
                      <option key={p} value={p}>{priorityConfig[p].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                    {statusOptions.map(s => (
                      <option key={s} value={s}>{statusConfig[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Penulis</label>
                <input type="text" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="input" placeholder="Nama penulis" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Pengumuman?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Pengumuman yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Megaphone,
  X,
  Calendar,
  User,
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
  status: 'draft',
  author: '',
};

const priorityBadge = (p: string) => {
  switch (p) {
    case 'urgent':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'normal':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'low':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const priorityLabel = (p: string) => {
  switch (p) {
    case 'urgent': return 'Mendesak';
    case 'high': return 'Tinggi';
    case 'normal': return 'Normal';
    case 'low': return 'Rendah';
    default: return p;
  }
};

const statusBadge = (s: string) => {
  switch (s) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'draft':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    case 'archived':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case 'published': return 'Dipublikasi';
    case 'draft': return 'Draf';
    case 'archived': return 'Diarsip';
    default: return s;
  }
};

export default function AnnouncementsAdminPage() {
  const { hasPermission } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) {
        showToast('Gagal memuat pengumuman', 'error');
        return;
      }
      setAnnouncements((data as unknown as Announcement[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setForm({
      title: a.title ?? '',
      description: a.description ?? '',
      priority: a.priority ?? 'normal',
      status: a.status ?? 'draft',
      author: a.author ?? '',
    });
    setEditingId(a.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Judul wajib diisi', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        author: form.author.trim() || null,
        published_at: form.status === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Pengumuman diperbarui', 'success');
      } else {
        const { error } = await supabase.from('announcements').insert(payload);
        if (error) throw error;
        showToast('Pengumuman ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchAnnouncements();
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + (err?.message ?? 'error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      showToast('Pengumuman dihapus', 'success');
      await fetchAnnouncements();
    } catch {
      showToast('Gagal menghapus pengumuman', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Pengumuman</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola pengumuman sekolah</p>
        </div>
        {hasPermission('announcements', 'create') && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada pengumuman" description="Belum ada pengumuman." icon={<Megaphone className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityBadge(a.priority ?? '')}`}>
                      {priorityLabel(a.priority ?? '')}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(a.status ?? '')}`}>
                      {statusLabel(a.status ?? '')}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{a.title ?? '-'}</h3>
                  {a.description && <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{a.description}</p>}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    {a.author && (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {a.author}
                      </div>
                    )}
                    {a.published_at && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(a.published_at).toLocaleDateString('id-ID')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasPermission('announcements', 'update') && (
                    <button onClick={() => openEdit(a)} className="btn-secondary">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                  {hasPermission('announcements', 'delete') && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="btn-danger"
                    >
                      {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Judul <span className="text-red-500">*</span></label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul pengumuman" />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Isi pengumuman" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prioritas</label>
                  <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="urgent">Mendesak</option>
                    <option value="high">Tinggi</option>
                    <option value="normal">Normal</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draf</option>
                    <option value="published">Dipublikasi</option>
                    <option value="archived">Diarsip</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Penulis</label>
                <input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Nama penulis" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingId ? 'Simpan' : 'Tambah'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

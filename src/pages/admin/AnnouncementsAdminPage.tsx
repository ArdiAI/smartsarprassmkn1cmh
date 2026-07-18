import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Megaphone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import EmptyState from '../../components/EmptyState';

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

interface FormState {
  title: string;
  description: string;
  priority: string;
  status: string;
  author: string;
}

const emptyForm: FormState = {
  title: '',
  description: '',
  priority: 'normal',
  status: 'draft',
  author: '',
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
};

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  archived: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
};

export default function AnnouncementsAdminPage() {
  const { hasPermission } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat pengumuman', 'error');
    } else {
      setAnnouncements((data as unknown as Announcement[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({
      title: a.title ?? '',
      description: a.description ?? '',
      priority: a.priority ?? 'normal',
      status: a.status ?? 'draft',
      author: a.author ?? '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Judul wajib diisi', 'error');
      return;
    }
    setSubmitting(true);
    const isPublishing = form.status === 'published';
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: form.status,
      author: form.author.trim() || null,
      published_at: isPublishing ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (editing) {
      // Don't override published_at if already set
      const updatePayload = { ...payload };
      if (editing.published_at) {
        updatePayload.published_at = editing.published_at;
      }
      const { error } = await supabase.from('announcements').update(updatePayload).eq('id', editing.id);
      if (error) {
        showToast('Gagal memperbarui: ' + error.message, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Pengumuman diperbarui', 'success');
    } else {
      const { error } = await supabase.from('announcements').insert(payload);
      if (error) {
        showToast('Gagal menambah: ' + error.message, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Pengumuman ditambahkan', 'success');
    }
    setSubmitting(false);
    closeModal();
    fetchAnnouncements();
  }

  async function handleDelete(a: Announcement) {
    if (!confirm(`Hapus pengumuman "${a.title}"?`)) return;
    setDeleting(a.id);
    const { error } = await supabase.from('announcements').delete().eq('id', a.id);
    setDeleting(null);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Pengumuman dihapus', 'success');
    fetchAnnouncements();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Pengumuman</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola pengumuman sekolah.
          </p>
        </div>
        {hasPermission('announcements', 'create') && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Pengumuman
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-8 w-8 text-slate-400" />}
          title="Tidak ada pengumuman"
          description="Belum ada pengumuman yang dibuat."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{a.title}</h3>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.normal)}>
                      {a.priority}
                    </span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[a.status] ?? STATUS_STYLES.draft)}>
                      {a.status}
                    </span>
                  </div>
                  {a.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{a.description}</p>
                  )}
                  <div className="mt-2 text-xs text-slate-400">
                    {a.author && <span>Oleh: {a.author} • </span>}
                    {a.published_at
                      ? `Dipublikasi ${new Date(a.published_at).toLocaleDateString('id-ID')}`
                      : `Dibuat ${new Date(a.created_at).toLocaleDateString('id-ID')}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  {hasPermission('announcements', 'update') && (
                    <button
                      onClick={() => openEdit(a)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {hasPermission('announcements', 'delete') && (
                    <button
                      onClick={() => handleDelete(a)}
                      disabled={deleting === a.id}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    >
                      {deleting === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Judul <span className="text-red-500">*</span></label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[120px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prioritas</label>
                  <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="high">Tinggi</option>
                    <option value="normal">Normal</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="published">Dipublikasi</option>
                    <option value="archived">Diarsipkan</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Penulis</label>
                <input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

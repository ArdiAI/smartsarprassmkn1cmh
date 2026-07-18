import { useEffect, useState, useMemo, type FormEvent } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Megaphone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

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

interface AnnouncementForm {
  title: string;
  description: string;
  priority: string;
  status: string;
  author: string;
}

const emptyForm: AnnouncementForm = {
  title: '',
  description: '',
  priority: 'normal',
  status: 'draft',
  author: '',
};

const priorityStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
};

const statusStyles: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export default function AnnouncementsAdminPage() {
  const { hasPermission, adminProfile } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canCreate = hasPermission('announcements', 'create');
  const canUpdate = hasPermission('announcements', 'update');
  const canDelete = hasPermission('announcements', 'delete');

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) {
        showToast('Gagal memuat pengumuman', 'error');
        return;
      }
      setItems((data as unknown as Announcement[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, author: adminProfile?.name ?? '' });
    setModalOpen(true);
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
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return showToast('Judul wajib diisi', 'warning');
    setSaving(true);
    try {
      const isPublish = form.status === 'published' && (!editing || editing.status !== 'published');
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        author: form.author.trim() || null,
        published_at: isPublish ? new Date().toISOString() : (editing?.published_at ?? null),
        updated_at: new Date().toISOString(),
      };
      if (editing) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editing.id);
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
      closeModal();
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Announcement) {
    if (!confirm(`Hapus "${a.title}"?`)) return;
    setDeleting(a.id);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', a.id);
      if (error) {
        showToast('Gagal menghapus pengumuman', 'error');
        return;
      }
      showToast('Pengumuman dihapus', 'success');
      fetchData();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Pengumuman</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola pengumuman sekolah.</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Pengumuman
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada pengumuman" description="Belum ada data pengumuman." icon={<Megaphone className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{a.title}</h3>
                    {a.priority && (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityStyles[a.priority] ?? priorityStyles.normal}`}>
                        {a.priority}
                      </span>
                    )}
                    {a.status && (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[a.status] ?? statusStyles.draft}`}>
                        {a.status}
                      </span>
                    )}
                  </div>
                  {a.description && <p className="text-sm text-slate-600 dark:text-slate-400">{a.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {a.author && <span>Oleh: {a.author}</span>}
                    {a.published_at && <span>Diterbitkan: {new Date(a.published_at).toLocaleDateString('id-ID')}</span>}
                    <span>Dibuat: {new Date(a.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <button onClick={() => openEdit(a)} className="btn-secondary px-3 py-2 text-xs">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(a)} disabled={deleting === a.id} className="btn-danger px-3 py-2 text-xs">
                      {deleting === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
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
                <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                    <option value="published">Terbit</option>
                    <option value="archived">Arsip</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Penulis</label>
                <input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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

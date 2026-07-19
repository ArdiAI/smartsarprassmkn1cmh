import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  Megaphone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
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

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];
const STATUS_OPTIONS = ['draft', 'published', 'archived'];

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Rendah',
  normal: 'Normal',
  high: 'Tinggi',
  urgent: 'Mendesak',
};
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const emptyForm = {
  title: '',
  description: '',
  priority: 'normal',
  status: 'draft',
  author: '',
};

export default function AnnouncementsAdminPage() {
  const { hasPermission, adminProfile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat pengumuman', 'error');
      setAnnouncements([]);
    } else {
      setAnnouncements((data as unknown as Announcement[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, author: adminProfile?.name ?? '' });
    setModalOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title ?? '',
      description: a.description ?? '',
      priority: a.priority ?? 'normal',
      status: a.status ?? 'draft',
      author: a.author ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Judul wajib diisi', 'error');
      return;
    }
    setSaving(true);
    const isPublishing = form.status === 'published' && editing?.status !== 'published';
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: form.status,
      author: form.author.trim() || adminProfile?.name || null,
      published_at: isPublishing ? new Date().toISOString() : (editing?.published_at ?? null),
      updated_at: new Date().toISOString(),
    };
    const { error } = editing
      ? await supabase.from('announcements').update(payload).eq('id', editing.id)
      : await supabase.from('announcements').insert({
          ...payload,
          published_at: form.status === 'published' ? new Date().toISOString() : null,
        });
    setSaving(false);
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
      return;
    }
    showToast(editing ? 'Pengumuman diperbarui' : 'Pengumuman ditambahkan', 'success');
    setModalOpen(false);
    await fetchAnnouncements();
  };

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`Hapus "${a.title}"?`)) return;
    const { error } = await supabase.from('announcements').delete().eq('id', a.id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Pengumuman dihapus', 'info');
    await fetchAnnouncements();
  };

  const filtered = announcements.filter(
    (a) => !search || a.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Pengumuman</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola pengumuman sekolah.
          </p>
        </div>
        {hasPermission('announcements', 'create') && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Pengumuman
          </button>
        )}
      </div>

      <div className="card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Cari pengumuman..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada pengumuman" description="Belum ada data pengumuman." icon={<Megaphone className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{a.title}</h3>
                    {a.priority && (
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', PRIORITY_STYLES[a.priority] ?? '')}>
                        {PRIORITY_LABELS[a.priority] ?? a.priority}
                      </span>
                    )}
                    {a.status && (
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[a.status] ?? '')}>
                        {a.status}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{a.description}</p>
                  )}
                  <div className="mt-2 text-xs text-slate-400">
                    {a.author && <span>Oleh: {a.author}</span>}
                    {a.published_at && (
                      <span className="ml-3">Dipublikasi: {new Date(a.published_at).toLocaleDateString('id-ID')}</span>
                    )}
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
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Judul <span className="text-red-500">*</span></label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[100px] resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Prioritas</label>
                  <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{PRIORITY_LABELS[p] ?? p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Penulis</label>
                <input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Nama penulis" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? 'Simpan Perubahan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

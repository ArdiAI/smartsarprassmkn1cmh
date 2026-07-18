import { useEffect, useState, useCallback, type FormEvent } from 'react';
import {
  Plus, Search, Pencil, Trash2, Loader2, X, Megaphone, Calendar,
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

const priorityBadge = (p: string | null) => {
  switch (p) {
    case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'urgent': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'normal': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'low': return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const priorityLabel = (p: string | null) => {
  switch (p) {
    case 'high': return 'Tinggi';
    case 'urgent': return 'Urgent';
    case 'normal': return 'Normal';
    case 'low': return 'Rendah';
    default: return '-';
  }
};

const statusBadge = (s: string | null) => {
  switch (s) {
    case 'published': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'draft': return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    case 'archived': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const statusLabel = (s: string | null) => {
  switch (s) {
    case 'published': return 'Dipublikasi';
    case 'draft': return 'Draft';
    case 'archived': return 'Arsip';
    default: return s ?? '-';
  }
};

export default function AnnouncementsAdminPage() {
  const { hasPermission, adminProfile } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat pengumuman', 'error');
      setItems([]);
    } else {
      setItems((data ?? []) as unknown as Announcement[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
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

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`Hapus pengumuman "${a.title}"?`)) return;
    const { error } = await supabase.from('announcements').delete().eq('id', a.id);
    if (error) { showToast('Gagal menghapus: ' + error.message, 'error'); return; }
    showToast('Pengumuman dihapus', 'success');
    fetchItems();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast('Judul wajib diisi', 'error');

    const isPublishing = form.status === 'published' && (!editing || editing.status !== 'published');
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: form.status,
      author: form.author.trim() || null,
      published_at: isPublishing ? new Date().toISOString() : (editing?.published_at ?? null),
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('announcements').update(payload).eq('id', editing.id);
      if (error) { showToast('Gagal update: ' + error.message, 'error'); setSaving(false); return; }
      showToast('Pengumuman diperbarui', 'success');
    } else {
      const { error } = await supabase.from('announcements').insert(payload);
      if (error) { showToast('Gagal menambah: ' + error.message, 'error'); setSaving(false); return; }
      showToast('Pengumuman ditambahkan', 'success');
    }
    setSaving(false);
    setModalOpen(false);
    fetchItems();
  };

  const filtered = items.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return a.title.toLowerCase().includes(q) || (a.description?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kelola Pengumuman</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Buat dan kelola pengumuman sekolah.</p>
        </div>
        {hasPermission('announcements', 'create') && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" /> Tambah Pengumuman
          </button>
        )}
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Cari judul atau isi..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="Tidak ada pengumuman" description="Belum ada pengumuman yang dibuat." icon={<Megaphone className="h-8 w-8 text-slate-400" />} /></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{a.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadge(a.priority)}`}>
                      {priorityLabel(a.priority)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(a.status)}`}>
                      {statusLabel(a.status)}
                    </span>
                  </div>
                  {a.description && <p className="text-sm text-slate-600 dark:text-slate-400">{a.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                    {a.author && <span>Oleh: {a.author}</span>}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(a.created_at).toLocaleDateString('id-ID')}</span>
                    {a.published_at && <span>Dipublikasi: {new Date(a.published_at).toLocaleDateString('id-ID')}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasPermission('announcements', 'update') && (
                    <button onClick={() => openEdit(a)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {hasPermission('announcements', 'delete') && (
                    <button onClick={() => handleDelete(a)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                      <Trash2 className="h-4 w-4" />
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
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
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
                <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Prioritas</label>
                  <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Rendah</option>
                    <option value="normal">Normal</option>
                    <option value="high">Tinggi</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="published">Dipublikasi</option>
                    <option value="archived">Arsip</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Penulis</label>
                  <input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

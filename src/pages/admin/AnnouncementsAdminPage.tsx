import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Megaphone, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface Announcement {
  id: string; title: string; description: string; status: string; priority: string; created_at: string;
}
interface FormState { title: string; content: string; is_active: boolean; }
const emptyForm: FormState = { title: '', content: '', is_active: true };
const priorityColor: Record<string, string> = {
  tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  sedang: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  rendah: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setItems((data as Announcement[]) || []);
    setLoading(false);
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({ title: a.title, content: a.description, is_active: a.status === 'aktif' });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.content,
      status: form.is_active ? 'aktif' : 'nonaktif',
      published_at: new Date().toISOString(),
    };
    if (editing) {
      await supabase.from('announcements').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('announcements').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetch();
  }

  async function remove(id: string) {
    if (!confirm('Hapus pengumuman ini?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    fetch();
  }

  async function toggleStatus(a: Announcement) {
    await supabase.from('announcements').update({ status: a.status === 'aktif' ? 'nonaktif' : 'aktif' }).eq('id', a.id);
    fetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengumuman</h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola pengumuman sistem</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{a.title}</h3>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', priorityColor[a.priority] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>{a.priority || 'sedang'}</span>
                    <button onClick={() => toggleStatus(a)} className={cn('px-2 py-0.5 rounded-full text-xs font-medium', a.status === 'aktif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400')}>
                      {a.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{a.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleDateString('id-ID')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(a)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(a.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Judul</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Konten</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white resize-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                Aktif (tampilkan publik)
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={save} disabled={saving || !form.title} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { Plus, Pencil, Trash2, Megaphone, X, AlertTriangle } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  author: string;
  created_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  tinggi: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  rendah: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};
const PRIORITY_LABELS: Record<string, string> = { tinggi: 'Tinggi', sedang: 'Sedang', rendah: 'Rendah' };
const STATUS_COLORS: Record<string, string> = {
  aktif: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  nonaktif: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};
const STATUS_LABELS: Record<string, string> = { aktif: 'Aktif', nonaktif: 'Nonaktif' };

const EMPTY = { title: '', description: '', priority: 'sedang', status: 'aktif', author: 'Admin' };

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    if (data) setItems(data as Announcement[]);
    setLoading(false);
  }

  function openAdd() { setEditId(null); setForm(EMPTY); setError(''); setModalOpen(true); }
  function openEdit(a: Announcement) { setEditId(a.id); setForm({ title: a.title, description: a.description, priority: a.priority, status: a.status, author: a.author || 'Admin' }); setError(''); setModalOpen(true); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      if (!form.title.trim()) throw new Error('Judul wajib diisi');
      if (editId) {
        const { error: e } = await supabase.from('announcements').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId);
        if (e) throw new Error(e.message);
      } else {
        const { error: e } = await supabase.from('announcements').insert(form);
        if (e) throw new Error(e.message);
      }
      setModalOpen(false); fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus pengumuman ini?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) alert(error.message); else fetchData();
  }

  async function toggleStatus(a: Announcement) {
    const newStatus = a.status === 'aktif' ? 'nonaktif' : 'aktif';
    const { error } = await supabase.from('announcements').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', a.id);
    if (error) alert(error.message); else fetchData();
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Megaphone className="w-6 h-6 text-pink-500" /> Kelola Pengumuman</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Tambah, ubah, dan hapus pengumuman</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah Pengumuman
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[a.priority])}>{PRIORITY_LABELS[a.priority] || a.priority}</span>
                    <button onClick={() => toggleStatus(a)} className={cn('px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer', STATUS_COLORS[a.status])}>{STATUS_LABELS[a.status] || a.status}</button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{a.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{a.author} · {fmtDate(a.created_at)}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-200"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editId ? 'Edit Pengumuman' : 'Tambah Pengumuman'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Judul</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Konten</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Prioritas</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                    <option value="tinggi">Tinggi</option><option value="sedang">Sedang</option><option value="rendah">Rendah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                    <option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"><AlertTriangle className="w-4 h-4 text-red-500" /><p className="text-sm text-red-700 dark:text-red-400">{error}</p></div>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

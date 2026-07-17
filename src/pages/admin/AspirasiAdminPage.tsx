import { useState, useEffect } from 'react';
import { MessageSquare, Loader2, X, Save, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface Aspirasi {
  id: string; nama: string; kelas_unit: string; kategori: string; judul: string;
  isi: string; status: string; tanggapan: string | null; created_at: string;
}
interface EditState { status: string; tanggapan: string; }
const statusColor: Record<string, string> = {
  baru: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  diproses: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  selesai: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};
const statusLabel: Record<string, string> = { baru: 'Baru', diproses: 'Diproses', selesai: 'Selesai' };

export default function AspirasiAdminPage() {
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [editing, setEditing] = useState<Aspirasi | null>(null);
  const [editForm, setEditForm] = useState<EditState>({ status: '', tanggapan: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
    setItems((data as Aspirasi[]) || []);
    setLoading(false);
  }

  function openEdit(a: Aspirasi) {
    setEditing(a);
    setEditForm({ status: a.status || 'baru', tanggapan: a.tanggapan || '' });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    await supabase.from('aspirasi').update({
      status: editForm.status,
      tanggapan: editForm.tanggapan,
      updated_at: new Date().toISOString(),
    }).eq('id', editing.id);
    setSaving(false); setEditing(null); fetch();
  }

  const filtered = items.filter(a => filterStatus === 'all' || a.status === filterStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-slate-600 dark:text-slate-400">Tinjau dan tanggapi aspirasi pengguna</p>
      </div>

      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="w-full sm:w-64 pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white appearance-none">
          <option value="all">Semua Status</option>
          <option value="baru">Baru</option><option value="diproses">Diproses</option><option value="selesai">Selesai</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">{a.judul || a.nama || 'Anonim'}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor[a.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>{statusLabel[a.status] || a.status || 'baru'}</span>
                  </div>
                  {a.nama && <p className="text-xs text-slate-400 mb-1">Dari: {a.nama}{a.kelas_unit ? ` (${a.kelas_unit})` : ''}</p>}
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{a.isi}</p>
                  {a.tanggapan && (
                    <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-400">
                      <p className="text-xs text-blue-700 dark:text-blue-400"><strong>Tanggapan:</strong> {a.tanggapan}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleDateString('id-ID')}</p>
                </div>
                <button onClick={() => openEdit(a)} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 whitespace-nowrap">Tanggapi</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setEditing(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{editing.judul || editing.nama}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{editing.isi}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="baru">Baru</option><option value="diproses">Diproses</option><option value="selesai">Selesai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tanggapan</label>
                <textarea value={editForm.tanggapan} onChange={e => setEditForm(f => ({ ...f, tanggapan: e.target.value }))} rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : <><Save className="w-4 h-4" /> Simpan</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

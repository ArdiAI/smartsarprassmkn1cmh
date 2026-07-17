import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Pencil, Trash2, Settings, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

const GROUPS = ['general', 'borrowing', 'notifications', 'system', 'inventory', 'announcements'];
const GL: Record<string, string> = { general: 'Umum', borrowing: 'Peminjaman', notifications: 'Notifikasi', system: 'Sistem', inventory: 'Inventaris', announcements: 'Pengumuman' };

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [active, setActive] = useState('general');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ c: any | null; open: boolean }>({ c: null, open: false });
  const [form, setForm] = useState({ key: '', value: '', label: '', config_group: 'general', description: '' });

  useEffect(() => { fetch(); }, []);
  async function fetch() { setLoading(true); const { data } = await supabase.from('system_config').select('*').order('config_group').order('key'); setConfigs(data || []); setLoading(false); }
  async function save() {
    const val = typeof form.value === 'string' && (form.value.startsWith('{') || form.value.startsWith('[')) ? JSON.parse(form.value) : form.value;
    const data = { ...form, value: val };
    if (modal.c) { await supabase.from('system_config').update(data).eq('id', modal.c.id); } else { await supabase.from('system_config').insert(data); }
    setModal({ c: null, open: false }); setForm({ key: '', value: '', label: '', config_group: active, description: '' }); fetch();
  }
  async function del(id: string) { if (!confirm('Hapus?')) return; await supabase.from('system_config').delete().eq('id', id); fetch(); }
  const filtered = configs.filter(c => c.config_group === active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1><p className="text-slate-600 dark:text-slate-400">Kelola pengaturan</p></div><button onClick={() => { setForm({ key: '', value: '', label: '', config_group: active, description: '' }); setModal({ c: null, open: true }); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Tambah</button></div>
      <div className="flex gap-2 flex-wrap">{GROUPS.map(g => <button key={g} onClick={() => setActive(g)} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', active === g ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700')}><Settings className="w-3.5 h-3.5 inline mr-1" />{GL[g]}</button>)}</div>
      {loading ? <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : filtered.length === 0 ? <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center"><Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">Belum ada config</p></div> : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"><div className="divide-y divide-slate-100 dark:divide-slate-700">{filtered.map(c => (<div key={c.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30"><div className="flex-1 min-w-0"><p className="text-sm font-mono font-medium text-slate-900 dark:text-white">{c.key}</p><p className="text-xs text-slate-400 truncate">{c.description || c.label || '-'}</p></div><div className="flex-1 min-w-0"><p className="text-sm text-slate-700 dark:text-slate-300 truncate">{typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value)}</p></div><button onClick={() => { setForm({ key: c.key, value: typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value), label: c.label || '', config_group: c.config_group, description: c.description || '' }); setModal({ c, open: true }); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-500" /></button><button onClick={() => del(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4 text-red-500" /></button></div>))}</div></div>
      )}
      {modal.open && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal({ c: null, open: false })}><div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900 dark:text-white">{modal.c ? 'Edit' : 'Tambah'} Config</h2><button onClick={() => setModal({ c: null, open: false })}><X className="w-5 h-5 text-slate-400" /></button></div><div className="space-y-3"><input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="Key" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" /><input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Label" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /><input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="Value" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /><select value={form.config_group} onChange={e => setForm({ ...form, config_group: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">{GROUPS.map(g => <option key={g} value={g}>{GL[g]}</option>)}</select><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none" /><button onClick={save} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Simpan</button></div></div></div>)}
    </div>
  );
}

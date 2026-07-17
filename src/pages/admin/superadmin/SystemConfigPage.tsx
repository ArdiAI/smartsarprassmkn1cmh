import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Pencil, Trash2, Settings, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

const GROUPS = ['general', 'borrowing', 'notifications', 'system', 'inventory', 'announcements'];
const GROUP_LABELS: Record<string, string> = {
  general: 'Umum', borrowing: 'Peminjaman', notifications: 'Notifikasi', system: 'Sistem', inventory: 'Inventaris', announcements: 'Pengumuman',
};

interface Config { id: string; key: string; value: string; config_group: string; description: string; }

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [activeGroup, setActiveGroup] = useState('general');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ config: Config | null; open: boolean }>({ config: null, open: false });
  const [form, setForm] = useState({ key: '', value: '', config_group: 'general', description: '' });

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('system_config').select('*').order('config_group').order('key');
    setConfigs(data || []);
    setLoading(false);
  }

  async function save() {
    if (modal.config) {
      await supabase.from('system_config').update(form).eq('id', modal.config.id);
    } else {
      await supabase.from('system_config').insert(form);
    }
    setModal({ config: null, open: false });
    setForm({ key: '', value: '', config_group: activeGroup, description: '' });
    fetch();
  }

  async function del(id: string) {
    if (!confirm('Hapus config ini?')) return;
    await supabase.from('system_config').delete().eq('id', id);
    fetch();
  }

  const filtered = configs.filter(c => c.config_group === activeGroup);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola pengaturan sistem</p>
        </div>
        <button onClick={() => { setForm({ key: '', value: '', config_group: activeGroup, description: '' }); setModal({ config: null, open: true }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah Config
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {GROUPS.map(g => (
          <button key={g} onClick={() => setActiveGroup(g)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeGroup === g ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            )}>
            <Settings className="w-3.5 h-3.5" /> {GROUP_LABELS[g]}
          </button>
        ))}
      </div>

      {loading ? <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
          <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Belum ada konfigurasi di grup ini</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">{c.key}</p>
                  <p className="text-xs text-slate-400 truncate">{c.description || '-'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{c.value}</p>
                </div>
                <button onClick={() => { setForm({ key: c.key, value: c.value, config_group: c.config_group, description: c.description }); setModal({ config: c, open: true }); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-500" /></button>
                <button onClick={() => del(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal({ config: null, open: false })}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{modal.config ? 'Edit Config' : 'Tambah Config'}</h2>
              <button onClick={() => setModal({ config: null, open: false })}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="Key (contoh: email_enabled)" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono" />
              <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="Value" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
              <select value={form.config_group} onChange={e => setForm({ ...form, config_group: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
                {GROUPS.map(g => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
              </select>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none" />
              <button onClick={save} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

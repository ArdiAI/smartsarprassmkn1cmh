import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Settings, Save, Check } from 'lucide-react';

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => { fetch(); }, []);
  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('system_config').select('*').order('key', { ascending: true });
    if (data) { setConfigs(data); const v: Record<string, any> = {}; data.forEach(c => { try { v[c.key] = typeof c.value === 'string' ? JSON.parse(c.value) : c.value; } catch { v[c.key] = c.value; } }); setValues(v); }
    setLoading(false);
  }
  async function save() {
    setSaving(true);
    for (const c of configs) { await supabase.from('system_config').update({ value: JSON.stringify(values[c.key]) }).eq('id', c.id); }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  function renderInput(c: any) {
    const v = values[c.key];
    if (typeof v === 'boolean') return <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={v} onChange={e => setValues({ ...values, [c.key]: e.target.checked })} className="w-4 h-4 rounded" /> <span className="text-sm text-slate-600 dark:text-slate-400">{v ? 'Aktif' : 'Nonaktif'}</span></label>;
    if (typeof v === 'number') return <input type="number" value={v} onChange={e => setValues({ ...values, [c.key]: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" />;
    return <input value={v || ''} onChange={e => setValues({ ...values, [c.key]: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1><p className="text-slate-600 dark:text-slate-400">Pengaturan umum aplikasi</p></div><button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50">{saving ? 'Menyimpan...' : saved ? <><Check className="w-4 h-4" /> Tersimpan</> : <><Save className="w-4 h-4" /> Simpan</>}</button></div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}</div> : (
        <div className="grid gap-3 sm:grid-cols-2">{configs.map(c => <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50"><div className="flex items-center gap-2"><Settings className="w-4 h-4 text-blue-500" /><div><p className="text-sm font-medium text-slate-900 dark:text-white">{c.label || c.key}</p><p className="text-xs text-slate-400">{c.description || c.key}</p></div></div>{renderInput(c)}</div>)}</div>
      )}
    </div>
  );
}

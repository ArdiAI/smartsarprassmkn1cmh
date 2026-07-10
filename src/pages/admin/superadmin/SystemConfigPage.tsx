import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { Settings, Save, RotateCcw, Check, AlertCircle, ChevronDown, Plus, Trash2, X, Info } from 'lucide-react';

interface SystemConfig {
  id: string;
  key: string;
  value: any;
  label: string;
  description: string;
  config_group: string;
  updated_at: string;
  updated_by: string | null;
}

const GROUP_LABELS: Record<string, string> = {
  general: 'Umum',
  borrowing: 'Peminjaman',
  announcements: 'Pengumuman',
  system: 'Sistem',
  notifications: 'Notifikasi',
  inventory: 'Inventaris',
};

const GROUP_ICONS: Record<string, string> = {
  general: '🏫', borrowing: '📋', announcements: '📢', system: '⚙️', notifications: '🔔', inventory: '📦',
};

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['general', 'borrowing', 'system']));
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ key: '', value: '', label: '', description: '', config_group: 'general' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('system_config').select('*').order('config_group').order('key');
    setConfigs(data || []);
    setLoading(false);
  }

  function getDisplayValue(config: SystemConfig): string {
    if (config.key in edits) return edits[config.key];
    const v = config.value;
    if (typeof v === 'string') return v;
    if (typeof v === 'boolean') return v.toString();
    if (typeof v === 'number') return v.toString();
    return JSON.stringify(v);
  }

  function inferType(config: SystemConfig): 'boolean' | 'number' | 'text' {
    const v = config.value;
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'number') return 'number';
    return 'text';
  }

  function handleEdit(key: string, value: string) {
    setEdits(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave(config: SystemConfig) {
    setSaving(config.key);
    setError(null);
    try {
      const rawValue = edits[config.key] ?? getDisplayValue(config);
      let parsedValue: any = rawValue;
      const type = inferType(config);
      if (type === 'boolean') parsedValue = rawValue === 'true';
      else if (type === 'number') {
        parsedValue = parseFloat(rawValue);
        if (isNaN(parsedValue)) throw new Error('Nilai harus berupa angka');
      }

      const { error: err } = await supabase.from('system_config')
        .update({ value: parsedValue, updated_at: new Date().toISOString() })
        .eq('key', config.key);
      if (err) throw new Error(err.message);

      setEdits(prev => { const n = { ...prev }; delete n[config.key]; return n; });
      setSaved(config.key);
      setTimeout(() => setSaved(null), 2000);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  function handleReset(config: SystemConfig) {
    setEdits(prev => { const n = { ...prev }; delete n[config.key]; return n; });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    setAddError('');
    try {
      let parsedValue: any = addForm.value;
      if (addForm.value === 'true') parsedValue = true;
      else if (addForm.value === 'false') parsedValue = false;
      else if (!isNaN(Number(addForm.value)) && addForm.value !== '') parsedValue = Number(addForm.value);

      const { error: err } = await supabase.from('system_config').insert({
        key: addForm.key, value: parsedValue,
        label: addForm.label, description: addForm.description,
        config_group: addForm.config_group,
      });
      if (err) throw new Error(err.message);
      setShowAddModal(false);
      setAddForm({ key: '', value: '', label: '', description: '', config_group: 'general' });
      fetchData();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('system_config').delete().eq('id', id);
    fetchData();
  }

  function toggleGroup(group: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  const groups = [...new Set(configs.map(c => c.config_group))];
  const isDirty = (key: string) => key in edits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ubah pengaturan sistem secara langsung tanpa deploy ulang</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium shadow-lg hover:shadow-blue-500/30 transition-all">
          <Plus className="w-4 h-4" /> Tambah Config
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const groupConfigs = configs.filter(c => c.config_group === group);
            const isOpen = openGroups.has(group);
            const dirtyCount = groupConfigs.filter(c => isDirty(c.key)).length;
            return (
              <div key={group} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button onClick={() => toggleGroup(group)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                  <span className="text-xl">{GROUP_ICONS[group] || '⚙️'}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-900 dark:text-white">{GROUP_LABELS[group] || group}</span>
                    <span className="ml-2 text-xs text-slate-400">{groupConfigs.length} item</span>
                    {dirtyCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs rounded-full">{dirtyCount} perubahan</span>
                    )}
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {groupConfigs.map(config => {
                          const type = inferType(config);
                          const currentValue = getDisplayValue(config);
                          const dirty = isDirty(config.key);
                          const isSaving = saving === config.key;
                          const isSaved = saved === config.key;
                          return (
                            <div key={config.id} className={cn('flex items-start gap-4 p-4 transition-colors', dirty && 'bg-amber-50 dark:bg-amber-900/10')}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{config.label}</span>
                                  <code className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">{config.key}</code>
                                </div>
                                {config.description && (
                                  <p className="text-xs text-slate-500 mb-3">{config.description}</p>
                                )}
                                {type === 'boolean' ? (
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => handleEdit(config.key, currentValue === 'true' ? 'false' : 'true')}
                                      className={cn('w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                                        currentValue === 'true' ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600')}>
                                      <div className={cn('absolute w-4 h-4 bg-white rounded-full top-1 transition-all shadow-sm',
                                        currentValue === 'true' ? 'left-6' : 'left-1')} />
                                    </button>
                                    <span className={cn('text-sm font-medium', currentValue === 'true' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500')}>
                                      {currentValue === 'true' ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                  </div>
                                ) : (
                                  <input
                                    type={type === 'number' ? 'number' : 'text'}
                                    value={currentValue}
                                    onChange={e => handleEdit(config.key, e.target.value)}
                                    className={cn(
                                      'w-full max-w-md px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                                      'bg-white dark:bg-slate-700 text-slate-900 dark:text-white',
                                      dirty ? 'border-amber-400 dark:border-amber-500' : 'border-slate-200 dark:border-slate-600'
                                    )}
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0 mt-6">
                                {dirty && (
                                  <button onClick={() => handleReset(config)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                                    title="Reset">
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => handleSave(config)} disabled={isSaving || (!dirty && !isSaved)}
                                  className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                    isSaved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                      : dirty ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                  )}>
                                  {isSaved ? <><Check className="w-3.5 h-3.5" /> Tersimpan</> : isSaving ? 'Menyimpan...' : <><Save className="w-3.5 h-3.5" /> Simpan</>}
                                </button>
                                <button onClick={() => handleDelete(config.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Config Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Konfigurasi</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAdd} className="p-6 space-y-4">
                {addError && <p className="text-sm text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">{addError}</p>}
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 text-xs">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Nilai <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">true/false</code> = boolean, angka = number, teks = string.
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Key (unik)</label>
                  <input value={addForm.key} onChange={e => setAddForm(p => ({ ...p, key: e.target.value.replace(/\s/g, '_').toLowerCase() }))}
                    placeholder="contoh: max_borrow_days" required
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Label</label>
                  <input value={addForm.label} onChange={e => setAddForm(p => ({ ...p, label: e.target.value }))}
                    placeholder="Nama ramah pengguna" required
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nilai</label>
                  <input value={addForm.value} onChange={e => setAddForm(p => ({ ...p, value: e.target.value }))}
                    placeholder="true / false / 7 / teks..." required
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                  <textarea value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                    rows={2} placeholder="Penjelasan singkat tentang konfigurasi ini..."
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Grup</label>
                  <select value={addForm.config_group} onChange={e => setAddForm(p => ({ ...p, config_group: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    <option value="custom">Kustom</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm">Batal</button>
                  <button type="submit" disabled={addSaving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">
                    {addSaving ? 'Menyimpan...' : 'Tambah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

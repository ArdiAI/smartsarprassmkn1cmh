import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Settings, Loader2, RefreshCw, Save, Search,
} from 'lucide-react';

interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string';

function detectType(value: unknown): ValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [editValues, setEditValues] = useState<Record<string, string | boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .order('config_group', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi sistem', 'error');
    } else {
      const list = (data as unknown as SystemConfig[]) || [];
      setConfigs(list);
      const initialEdits: Record<string, string | boolean> = {};
      list.forEach(c => {
        const t = detectType(c.value);
        if (t === 'boolean') {
          initialEdits[c.id] = Boolean(c.value);
        } else if (t === 'number') {
          initialEdits[c.id] = c.value !== null && c.value !== undefined ? String(c.value) : '';
        } else {
          initialEdits[c.id] = c.value !== null && c.value !== undefined ? String(c.value) : '';
        }
      });
      setEditValues(initialEdits);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const groups = ['all', ...Array.from(new Set(configs.map(c => c.config_group ?? 'lainnya')))];

  const filtered = configs.filter(c => {
    if (groupFilter !== 'all' && (c.config_group ?? 'lainnya') !== groupFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.key ?? '').toLowerCase().includes(q) ||
      (c.label ?? '').toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q)
    );
  });

  const handleSave = async (config: SystemConfig) => {
    const newVal = editValues[config.id];
    if (newVal === undefined) return;
    setSavingId(config.id);
    try {
      const type = detectType(config.value);
      let castValue: unknown = newVal;
      if (type === 'number') {
        castValue = typeof newVal === 'string' ? Number(newVal) : newVal;
      }
      const { error } = await supabase
        .from('system_config')
        .update({
          value: castValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);
      if (error) throw error;
      setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, value: castValue } : c));
      showToast(`Konfigurasi "${config.label ?? config.key}" disimpan`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan konfigurasi';
      showToast(msg, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const renderEditor = (config: SystemConfig) => {
    const type = detectType(config.value);
    const val = editValues[config.id];

    if (type === 'boolean') {
      return (
        <button
          onClick={() => setEditValues(prev => ({ ...prev, [config.id]: !prev[config.id] }))}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition',
            val ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition',
              val ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      );
    }

    if (type === 'number') {
      return (
        <input
          type="number"
          value={typeof val === 'string' ? val : String(val ?? '')}
          onChange={e => setEditValues(prev => ({ ...prev, [config.id]: e.target.value }))}
          className="w-full sm:w-40 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      );
    }

    return (
      <input
        type="text"
        value={typeof val === 'string' ? val : String(val ?? '')}
        onChange={e => setEditValues(prev => ({ ...prev, [config.id]: e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-500" />
            Konfigurasi Sistem
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengaturan sistem SMART SARPRAS
          </p>
        </div>
        <button
          onClick={fetchConfigs}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition self-start"
          title="Muat ulang"
        >
          <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari konfigurasi..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {groups.map(g => (
            <option key={g} value={g}>{g === 'all' ? 'Semua Grup' : g}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Tidak ada konfigurasi ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(config => {
            const type = detectType(config.value);
            const isDirty = String(editValues[config.id] ?? '') !== String(config.value ?? '');
            return (
              <div
                key={config.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {config.label ?? config.key}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono">
                        {config.key}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        {type}
                      </span>
                    </div>
                    {config.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {config.description}
                      </p>
                    )}
                    {config.config_group && (
                      <p className="text-xs text-slate-400 mt-1">Grup: {config.config_group}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {renderEditor(config)}
                    <button
                      onClick={() => handleSave(config)}
                      disabled={!isDirty || savingId === config.id}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed',
                        isDirty
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                      )}
                    >
                      {savingId === config.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Settings, Save, Loader2, RefreshCw, Hash, Type, ToggleRight,
  AlertCircle,
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

type ConfigValue = boolean | number | string;

function detectType(value: unknown): 'boolean' | 'number' | 'string' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

function toString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingValues, setEditingValues] = useState<Record<string, ConfigValue>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .order('config_group', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi', 'error');
    } else {
      const list = (data as unknown as SystemConfig[]) || [];
      setConfigs(list);
      const initialValues: Record<string, ConfigValue> = {};
      list.forEach(c => {
        const t = detectType(c.value);
        if (t === 'boolean') {
          initialValues[c.id] = Boolean(c.value);
        } else if (t === 'number') {
          initialValues[c.id] = Number(c.value) || 0;
        } else {
          initialValues[c.id] = toString(c.value);
        }
      });
      setEditingValues(initialValues);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async (config: SystemConfig) => {
    setSavingId(config.id);
    try {
      const newValue = editingValues[config.id];
      const { error } = await supabase
        .from('system_config')
        .update({
          value: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);
      if (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
      } else {
        showToast(`Konfigurasi "${config.label ?? config.key}" disimpan`, 'success');
        fetchConfigs();
      }
    } finally {
      setSavingId(null);
    }
  };

  const groupedConfigs = configs.reduce<Record<string, SystemConfig[]>>((acc, c) => {
    const group = c.config_group ?? 'Umum';
    if (!acc[group]) acc[group] = [];
    acc[group].push(c);
    return acc;
  }, {});

  const groupNames = Object.keys(groupedConfigs).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-blue-500" />
            System Config
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengaturan sistem
          </p>
        </div>
        <button
          onClick={fetchConfigs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada konfigurasi</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupNames.map(group => (
            <div key={group}>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                {group}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {groupedConfigs[group].map(config => {
                  const type = detectType(config.value);
                  const currentValue = editingValues[config.id];
                  return (
                    <div
                      key={config.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {config.label ?? config.key}
                          </h3>
                          {config.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {config.description}
                            </p>
                          )}
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                            type === 'boolean'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : type === 'number'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          )}
                        >
                          {type === 'boolean' ? (
                            <ToggleRight className="w-3.5 h-3.5" />
                          ) : type === 'number' ? (
                            <Hash className="w-3.5 h-3.5" />
                          ) : (
                            <Type className="w-3.5 h-3.5" />
                          )}
                          {type}
                        </div>
                      </div>

                      <div className="mt-3">
                        {type === 'boolean' ? (
                          <button
                            onClick={() =>
                              setEditingValues(prev => ({
                                ...prev,
                                [config.id]: !prev[config.id],
                              }))
                            }
                            className={cn(
                              'flex items-center gap-3 w-full p-2 rounded-xl transition-colors',
                              currentValue
                                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                : 'bg-slate-50 dark:bg-slate-700/30'
                            )}
                          >
                            <div
                              className={cn(
                                'relative w-11 h-6 rounded-full transition-colors',
                                currentValue ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                              )}
                            >
                              <div
                                className={cn(
                                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                                  currentValue ? 'translate-x-5' : 'translate-x-0.5'
                                )}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              {currentValue ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </button>
                        ) : type === 'number' ? (
                          <input
                            type="number"
                            value={currentValue as number}
                            onChange={e =>
                              setEditingValues(prev => ({
                                ...prev,
                                [config.id]: Number(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                          />
                        ) : (
                          <textarea
                            value={currentValue as string}
                            onChange={e =>
                              setEditingValues(prev => ({
                                ...prev,
                                [config.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white resize-none"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-xs text-slate-400 font-mono">{config.key}</span>
                        <button
                          onClick={() => handleSave(config)}
                          disabled={savingId === config.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {savingId === config.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Simpan
                        </button>
                      </div>

                      {config.updated_at && (
                        <p className="text-xs text-slate-400 mt-2">
                          Diperbarui: {new Date(config.updated_at).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">Tips</p>
          <p className="mt-1">
            Perubahan konfigurasi langsung berlaku. Tipe nilai terdeteksi otomatis:
            boolean (toggle), number (input angka), atau string (teks).
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Loader2, Settings, Save, Tag,
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
  const { hasPermission } = useAuth();
  const canManage = hasPermission('system_config', 'manage');

  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingValues, setEditingValues] = useState<Record<string, string | boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

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
      const init: Record<string, string | boolean> = {};
      list.forEach(c => {
        const t = detectType(c.value);
        init[c.key] = t === 'boolean' ? Boolean(c.value) : String(c.value ?? '');
      });
      setEditingValues(init);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const grouped = configs.reduce<Record<string, SystemConfig[]>>((acc, c) => {
    const group = c.config_group ?? 'Lainnya';
    if (!acc[group]) acc[group] = [];
    acc[group].push(c);
    return acc;
  }, {});

  const handleSave = async (config: SystemConfig) => {
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengubah konfigurasi', 'error');
      return;
    }
    setSavingKey(config.key);
    try {
      const rawValue = editingValues[config.key];
      const type = detectType(config.value);
      let parsedValue: unknown;
      if (type === 'boolean') {
        parsedValue = Boolean(rawValue);
      } else if (type === 'number') {
        const n = Number(rawValue);
        parsedValue = Number.isNaN(n) ? 0 : n;
      } else {
        parsedValue = String(rawValue ?? '');
      }

      const { error } = await supabase
        .from('system_config')
        .update({
          value: parsedValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) {
        showToast(`Gagal menyimpan: ${error.message}`, 'error');
      } else {
        showToast(`Konfigurasi "${config.label ?? config.key}" disimpan`, 'success');
        await fetchConfigs();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" /> Konfigurasi Sistem
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola pengaturan aplikasi SMART SARPRAS
        </p>
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada konfigurasi</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  {group}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(config => {
                  const type = detectType(config.value);
                  const val = editingValues[config.key];
                  return (
                    <div key={config.id} className="card p-5 rounded-2xl">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {config.label ?? config.key}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{config.key}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 whitespace-nowrap">
                          {type}
                        </span>
                      </div>

                      {config.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                          {config.description}
                        </p>
                      )}

                      <div className="mt-4">
                        {type === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(val)}
                              onChange={e =>
                                setEditingValues(prev => ({ ...prev, [config.key]: e.target.checked }))
                              }
                              disabled={!canManage}
                              className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {Boolean(val) ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </label>
                        ) : (
                          <input
                            type={type === 'number' ? 'number' : 'text'}
                            value={typeof val === 'string' ? val : ''}
                            onChange={e =>
                              setEditingValues(prev => ({ ...prev, [config.key]: e.target.value }))
                            }
                            disabled={!canManage}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60"
                          />
                        )}
                      </div>

                      {config.updated_at && (
                        <p className="text-xs text-slate-400 mt-3">
                          Diperbarui: {new Date(config.updated_at).toLocaleString('id-ID')}
                        </p>
                      )}

                      {canManage && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                          <button
                            onClick={() => handleSave(config)}
                            disabled={savingKey === config.key}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                          >
                            {savingKey === config.key ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            Simpan
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

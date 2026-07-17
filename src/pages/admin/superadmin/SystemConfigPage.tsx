import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Settings,
  Save,
  Loader2,
  CheckCircle,
  Type,
  Hash,
  ToggleLeft,
  FolderClosed,
  Database,
} from 'lucide-react';

// ---- Types ----

interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  label: string;
  description: string;
  config_group: string;
  updated_at: string;
}

type ConfigValue = string | number | boolean;

// ---- Helpers ----

function detectType(value: unknown): 'boolean' | 'number' | 'string' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

function getGroupIcon(group: string) {
  switch (group) {
    case 'general':
      return Settings;
    case 'borrowing':
      return Database;
    case 'notifications':
      return CheckCircle;
    case 'inventory':
      return Hash;
    case 'storage':
      return FolderClosed;
    case 'system':
      return ToggleLeft;
    case 'announcements':
      return Type;
    default:
      return Settings;
  }
}

function getGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    general: 'Umum',
    borrowing: 'Peminjaman',
    notifications: 'Notifikasi',
    inventory: 'Inventaris',
    storage: 'Penyimpanan',
    system: 'Sistem',
    announcements: 'Pengumuman',
  };
  return labels[group] || group;
}

// ---- Component ----

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, ConfigValue>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('config_group', { ascending: true })
        .order('key', { ascending: true });

      if (error) throw error;
      setConfigs((data || []) as unknown as SystemConfig[]);
    } catch (err) {
      console.error('Error fetching system config:', err);
      showToast('Gagal memuat konfigurasi sistem', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleEdit = (key: string, value: ConfigValue) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
    setSavedKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleSave = async (config: SystemConfig) => {
    const editedValue = editedValues[config.key];
    if (editedValue === undefined) return;

    setSavingKey(config.key);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ value: editedValue })
        .eq('id', config.id);

      if (error) throw error;

      // Update local state
      setConfigs(prev =>
        prev.map(c => (c.id === config.id ? { ...c, value: editedValue } : c))
      );

      // Clear edited value and mark as saved
      setEditedValues(prev => {
        const next = { ...prev };
        delete next[config.key];
        return next;
      });
      setSavedKeys(prev => new Set(prev).add(config.key));

      showToast(`Konfigurasi "${config.label}" berhasil disimpan`, 'success');

      // Clear saved indicator after 3 seconds
      setTimeout(() => {
        setSavedKeys(prev => {
          const next = new Set(prev);
          next.delete(config.key);
          return next;
        });
      }, 3000);
    } catch (err) {
      console.error('Error saving config:', err);
      showToast('Gagal menyimpan konfigurasi', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveAll = async () => {
    const keys = Object.keys(editedValues);
    if (keys.length === 0) {
      showToast('Tidak ada perubahan untuk disimpan', 'info');
      return;
    }

    setSavingKey('__all__');
    let successCount = 0;
    let failCount = 0;

    for (const key of keys) {
      const config = configs.find(c => c.key === key);
      if (!config) continue;
      try {
        const { error } = await supabase
          .from('system_config')
          .update({ value: editedValues[key] })
          .eq('id', config.id);
        if (error) throw error;
        successCount++;
      } catch {
        failCount++;
      }
    }

    setSavingKey(null);

    if (successCount > 0) {
      showToast(`${successCount} konfigurasi berhasil disimpan${failCount > 0 ? `, ${failCount} gagal` : ''}`, failCount > 0 ? 'warning' : 'success');
      setEditedValues({});
      fetchConfigs();
    } else {
      showToast('Gagal menyimpan semua konfigurasi', 'error');
    }
  };

  const renderInput = (config: SystemConfig) => {
    const type = detectType(config.value);
    const editedValue = editedValues[config.key];
    const currentValue = editedValue !== undefined ? editedValue : (config.value as ConfigValue);
    const isEdited = editedValue !== undefined;
    const isSaved = savedKeys.has(config.key);
    const isSaving = savingKey === config.key;

    return (
      <div key={config.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {/* Label & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white">{config.label}</label>
            <code className="text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{config.key}</code>
            {isEdited && (
              <span className="text-xs text-amber-500 font-medium">• Edited</span>
            )}
            {isSaved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                <CheckCircle className="w-3 h-3" />
                Tersimpan
              </span>
            )}
          </div>
          {config.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{config.description}</p>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {type === 'boolean' ? (
            <button
              type="button"
              onClick={() => handleEdit(config.key, !currentValue)}
              className={cn(
                'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
                currentValue ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
              )}
            >
              <span className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
                currentValue ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          ) : type === 'number' ? (
            <input
              type="number"
              value={currentValue as number}
              onChange={e => handleEdit(config.key, Number(e.target.value))}
              className="w-28 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-right"
            />
          ) : (
            <input
              type="text"
              value={currentValue as string}
              onChange={e => handleEdit(config.key, e.target.value)}
              className="w-48 sm:w-64 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          )}

          {/* Save button */}
          <button
            onClick={() => handleSave(config)}
            disabled={!isEdited || isSaving}
            className={cn(
              'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              isEdited && !isSaving
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            )}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  };

  // Group configs
  const groupedConfigs = configs.reduce<Record<string, SystemConfig[]>>((acc, config) => {
    const group = config.config_group || 'general';
    if (!acc[group]) acc[group] = [];
    acc[group].push(config);
    return acc;
  }, {});

  const groupOrder = ['general', 'system', 'borrowing', 'inventory', 'announcements', 'notifications', 'storage'];
  const sortedGroups = Object.keys(groupedConfigs).sort((a, b) => {
    const ia = groupOrder.indexOf(a);
    const ib = groupOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const hasEdits = Object.keys(editedValues).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-500" />
            Konfigurasi Sistem
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengaturan dan konfigurasi sistem
          </p>
        </div>
        {hasEdits && (
          <button
            onClick={handleSaveAll}
            disabled={savingKey !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
          >
            {savingKey === '__all__' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Semua ({Object.keys(editedValues).length})
          </button>
        )}
      </div>

      {/* Config Groups */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : sortedGroups.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada konfigurasi</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(group => {
            const GroupIcon = getGroupIcon(group);
            const groupConfigs = groupedConfigs[group];
            return (
              <div key={group} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Group Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <GroupIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-white">{getGroupLabel(group)}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{groupConfigs.length} pengaturan</p>
                  </div>
                </div>
                {/* Group Items */}
                <div className="p-5 space-y-3">
                  {groupConfigs.map(config => renderInput(config))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

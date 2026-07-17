import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Settings,
  Save,
  Loader2,
  RefreshCw,
  Search,
  Type,
  Hash,
  ToggleLeft,
  Info,
  CheckCircle2,
} from 'lucide-react';

// ---- Types matching DB schema ----
interface SystemConfig {
  id: string;
  key: string;
  value: unknown; // jsonb - can be boolean, number, or string
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string';

type EditState = Record<string, string | boolean>;

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editState, setEditState] = useState<EditState>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('config_group', { ascending: true, nullsFirst: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as SystemConfig[];
      setConfigs(rows);
      // Initialize edit state — cast jsonb unknown to string|boolean based on runtime type
      const initial: EditState = {};
      for (const c of rows) {
        if (typeof c.value === 'boolean') {
          initial[c.key] = c.value;
        } else {
          initial[c.key] = c.value == null ? '' : String(c.value);
        }
      }
      setEditState(initial);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load config';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const detectType = (value: unknown): ValueType => {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
  };

  const filtered = configs.filter(c => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.key.toLowerCase().includes(q) ||
      (c.label ?? '').toLowerCase().includes(q) ||
      (c.config_group ?? '').toLowerCase().includes(q)
    );
  });

  // Group by config_group
  const groups = filtered.reduce<Record<string, SystemConfig[]>>((acc, c) => {
    const g = c.config_group ?? 'General';
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});

  const handleSave = async (config: SystemConfig) => {
    const rawValue = editState[config.key];
    setSavingKey(config.key);
    try {
      // Cast the value based on detected type
      const detected = detectType(config.value);
      let castValue: unknown = rawValue;
      if (detected === 'number') {
        castValue = rawValue === '' || rawValue === null ? null : Number(rawValue);
        if (castValue !== null && Number.isNaN(castValue)) {
          showToast('Please enter a valid number', 'warning');
          setSavingKey(null);
          return;
        }
      } else if (detected === 'boolean') {
        castValue = Boolean(rawValue);
      } else {
        castValue = String(rawValue ?? '');
      }

      const { error } = await supabase
        .from('system_config')
        .update({
          value: castValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;

      // Update local state
      setConfigs(prev =>
        prev.map(c => (c.id === config.id ? { ...c, value: castValue } : c))
      );
      showToast(`"${config.label ?? config.key}" saved`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save config';
      showToast(msg, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const isDirty = (config: SystemConfig): boolean => {
    const current = editState[config.key];
    const original = config.value;
    const detected = detectType(original);
    if (detected === 'boolean') return Boolean(current) !== Boolean(original);
    if (detected === 'number') {
      const cur = current === '' || current === null ? '' : String(current);
      return cur !== String(original ?? '');
    }
    return String(current ?? '') !== String(original ?? '');
  };

  const typeIcon = (type: ValueType) => {
    if (type === 'boolean') return <ToggleLeft className="w-3.5 h-3.5" />;
    if (type === 'number') return <Hash className="w-3.5 h-3.5" />;
    return <Type className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-500" />
            System Configuration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Edit system-wide settings and parameters
          </p>
        </div>
        <button
          onClick={loadConfigs}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start"
          title="Refresh"
        >
          <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by key, label, or group..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Settings className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No configuration entries found</p>
          <p className="text-sm text-slate-400 mt-1">
            {search ? 'Try a different search term' : 'Config entries will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                {group}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map(config => {
                  const type = detectType(config.value);
                  const dirty = isDirty(config);
                  const saving = savingKey === config.key;
                  return (
                    <div
                      key={config.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                              {config.label ?? config.key}
                            </h3>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-700/50">
                              {typeIcon(type)}
                              {type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono">{config.key}</p>
                        </div>
                      </div>

                      {config.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 flex items-start gap-1.5">
                          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
                          {config.description}
                        </p>
                      )}

                      {/* Value editor based on type */}
                      <div className="mt-2">
                        {type === 'boolean' ? (
                          <label className="flex items-center gap-3 cursor-pointer">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(editState[config.key])}
                              onClick={() =>
                                setEditState(s => ({
                                  ...s,
                                  [config.key]: !Boolean(s[config.key]),
                                }))
                              }
                              className={cn(
                                'relative w-12 h-7 rounded-full transition-colors',
                                Boolean(editState[config.key])
                                  ? 'bg-blue-500'
                                  : 'bg-slate-300 dark:bg-slate-600'
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform',
                                  Boolean(editState[config.key]) && 'translate-x-5'
                                )}
                              />
                            </button>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {Boolean(editState[config.key]) ? 'Enabled' : 'Disabled'}
                            </span>
                          </label>
                        ) : (
                          <input
                            type={type === 'number' ? 'number' : 'text'}
                            value={String(editState[config.key] ?? '')}
                            onChange={e =>
                              setEditState(s => ({
                                ...s,
                                [config.key]:
                                  type === 'number'
                                    ? e.target.value
                                    : e.target.value,
                              }))
                            }
                            placeholder={type === 'number' ? 'Enter a number' : 'Enter value'}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        )}
                      </div>

                      {/* Save button */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs text-slate-400">
                          {config.updated_at
                            ? `Updated ${new Date(config.updated_at).toLocaleDateString()}`
                            : 'Never updated'}
                        </span>
                        <button
                          onClick={() => handleSave(config)}
                          disabled={!dirty || saving}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            dirty && !saving
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 cursor-not-allowed'
                          )}
                        >
                          {saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : dirty ? (
                            <Save className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}
                        </button>
                      </div>
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

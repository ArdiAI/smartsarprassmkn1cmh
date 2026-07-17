import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Settings, Save, Loader2, RefreshCw, Search,
  ToggleLeft, Hash, Type, AlertCircle,
} from 'lucide-react';

/* ----------------------------- Types ----------------------------- */
interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  label: string | null;
  description: string | null;
  config_group: string | null;
}

type ValueType = 'boolean' | 'number' | 'string';

const detectType = (v: unknown): ValueType => {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  return 'string';
};

/* --------------------------- Component ---------------------------- */
export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('config_group', { ascending: true });
      if (error) throw error;
      const list = (data as unknown as SystemConfig[]) || [];
      setConfigs(list);
      // Reset drafts to current values
      const init: Record<string, unknown> = {};
      list.forEach((c) => { init[c.id] = c.value; });
      setDrafts(init);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load config';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const groups = Array.from(new Set(configs.map((c) => c.config_group).filter(Boolean))) as string[];

  const filtered = configs.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.key.toLowerCase().includes(q) ||
      (c.label?.toLowerCase().includes(q) ?? false) ||
      (c.description?.toLowerCase().includes(q) ?? false);
    const matchesGroup = !groupFilter || c.config_group === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const isDirty = (c: SystemConfig) => {
    const draft = drafts[c.id];
    return draft !== undefined && JSON.stringify(draft) !== JSON.stringify(c.value);
  };

  const handleSave = async (c: SystemConfig) => {
    const draft = drafts[c.id];
    if (draft === undefined) return;
    setSavingId(c.id);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ value: draft })
        .eq('id', c.id);
      if (error) throw error;
      setConfigs((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, value: draft } : x))
      );
      showToast(`Saved “${c.label || c.key}”`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save config';
      showToast(msg, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const typeIcon = (t: ValueType) => {
    if (t === 'boolean') return ToggleLeft;
    if (t === 'number') return Hash;
    return Type;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Configuration</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Edit application settings
              </p>
            </div>
          </div>
          <button
            onClick={() => void loadData()}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start"
            title="Refresh"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by key, label, or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400">
            <Settings className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No configuration entries found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const type = detectType(c.value);
              const draft = drafts[c.id];
              const Icon = typeIcon(type);
              const dirty = isDirty(c);
              return (
                <div
                  key={c.id}
                  className={cn(
                    'p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all',
                    dirty
                      ? 'border-blue-300 dark:border-blue-700 ring-1 ring-blue-200 dark:ring-blue-800'
                      : 'border-slate-200 dark:border-slate-700'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {c.label || c.key}
                        </h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {c.key}
                        </span>
                        {c.config_group && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            {c.config_group}
                          </span>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                          {c.description}
                        </p>
                      )}

                      {/* Value editor */}
                      <div className="mt-2">
                        {type === 'boolean' && (
                          <label className="flex items-center gap-3 cursor-pointer">
                            <button
                              type="button"
                              onClick={() => setDrafts((d) => ({ ...d, [c.id]: !d }))}
                              className={cn(
                                'relative w-11 h-6 rounded-full transition-colors',
                                draft ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                                  draft ? 'translate-x-5' : ''
                                )}
                              />
                            </button>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {draft ? 'Enabled' : 'Disabled'}
                            </span>
                          </label>
                        )}

                        {type === 'number' && (
                          <input
                            type="number"
                            value={typeof draft === 'number' ? draft : Number(draft) || 0}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [c.id]: Number(e.target.value) }))
                            }
                            className="w-full sm:w-48 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}

                        {type === 'string' && (
                          <input
                            type="text"
                            value={typeof draft === 'string' ? draft : String(draft ?? '')}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [c.id]: e.target.value }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => void handleSave(c)}
                      disabled={!dirty || savingId === c.id}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0',
                        dirty
                          ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      )}
                    >
                      {savingId === c.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Save</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info banner */}
        {!loading && configs.length > 0 && (
          <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Changes are saved per-config. Values are stored as JSONB — boolean toggles,
              number inputs, and text fields are auto-detected from the current value type.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

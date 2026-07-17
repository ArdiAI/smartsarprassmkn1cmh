import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Settings,
  Loader2,
  Save,
  CheckCircle2,
  Hash,
  Type,
  ToggleLeft,
  Search,
} from 'lucide-react';

// ---- Types ----
interface SystemConfig {
  id: string;
  key: string;
  value: unknown; // jsonb
  label: string;
  description: string | null;
  config_group: string;
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string' | 'unknown';

// Local working copy with stringified editable values
interface ConfigDraft {
  id: string;
  key: string;
  label: string;
  description: string | null;
  config_group: string;
  type: ValueType;
  // editable representation
  boolValue: boolean;
  numValue: string;
  strValue: string;
  dirty: boolean;
}

// ---- Helpers ----
function detectType(v: unknown): ValueType {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'string') return 'string';
  return 'unknown';
}

function buildDraft(c: SystemConfig): ConfigDraft {
  const type = detectType(c.value);
  return {
    id: c.id,
    key: c.key,
    label: c.label,
    description: c.description,
    config_group: c.config_group,
    type,
    boolValue: type === 'boolean' ? (c.value as boolean) : false,
    numValue: type === 'number' ? String(c.value as number) : '',
    strValue: type === 'string' ? (c.value as string) : '',
    dirty: false,
  };
}

function draftToJsonValue(d: ConfigDraft): unknown {
  if (d.type === 'boolean') return d.boolValue;
  if (d.type === 'number') {
    const n = Number(d.numValue);
    return Number.isNaN(n) ? 0 : n;
  }
  if (d.type === 'string') return d.strValue;
  return null;
}

// ---- Component ----
export default function SystemConfigPage() {
  const [drafts, setDrafts] = useState<ConfigDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('id, key, value, label, description, config_group, updated_at')
        .order('config_group', { ascending: true })
        .order('key', { ascending: true });
      if (error) throw error;
      setDrafts((data ?? []).map(buildDraft));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat konfigurasi';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const groups = Array.from(new Set(drafts.map(d => d.config_group))).sort();

  const filteredDrafts = (group: string) =>
    drafts.filter(d => {
      if (d.config_group !== group) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        d.key.toLowerCase().includes(q) ||
        d.label.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q)
      );
    });

  const updateDraft = (id: string, patch: Partial<ConfigDraft>) => {
    setDrafts(prev =>
      prev.map(d => (d.id === id ? { ...d, ...patch, dirty: true } : d))
    );
  };

  const handleSave = async (d: ConfigDraft) => {
    setSavingId(d.id);
    try {
      const jsonValue = draftToJsonValue(d);
      const { error } = await supabase
        .from('system_config')
        .update({ value: jsonValue })
        .eq('id', d.id);
      if (error) throw error;
      showToast(`Konfigurasi "${d.label}" disimpan`, 'success');
      setDrafts(prev =>
        prev.map(x => (x.id === d.id ? { ...x, dirty: false } : x))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan';
      showToast(msg, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const typeIcon = (type: ValueType) => {
    switch (type) {
      case 'boolean':
        return <ToggleLeft className="w-4 h-4 text-blue-500" />;
      case 'number':
        return <Hash className="w-4 h-4 text-cyan-500" />;
      case 'string':
        return <Type className="w-4 h-4 text-slate-400" />;
      default:
        return <Settings className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" />
          Konfigurasi Sistem
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola pengaturan sistem (otomatis deteksi tipe nilai)
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari konfigurasi..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400">
          Belum ada konfigurasi
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => {
            const items = filteredDrafts(group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                  {group}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map(d => (
                    <div
                      key={d.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {typeIcon(d.type)}
                            <h3 className="font-medium text-slate-900 dark:text-white">
                              {d.label}
                            </h3>
                          </div>
                          <code className="text-xs text-slate-400 font-mono">
                            {d.key}
                          </code>
                        </div>
                        {d.dirty && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Belum disimpan
                          </span>
                        )}
                      </div>

                      {d.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                          {d.description}
                        </p>
                      )}

                      {/* Value editor by type */}
                      {d.type === 'boolean' && (
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft(d.id, { boolValue: !d.boolValue })
                            }
                            className={cn(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                              d.boolValue
                                ? 'bg-blue-500'
                                : 'bg-slate-300 dark:bg-slate-600'
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                                d.boolValue ? 'translate-x-6' : 'translate-x-1'
                              )}
                            />
                          </button>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {d.boolValue ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </label>
                      )}

                      {d.type === 'number' && (
                        <input
                          type="number"
                          value={d.numValue}
                          onChange={e =>
                            updateDraft(d.id, { numValue: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      )}

                      {d.type === 'string' && (
                        <input
                          type="text"
                          value={d.strValue}
                          onChange={e =>
                            updateDraft(d.id, { strValue: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      )}

                      {d.type === 'unknown' && (
                        <p className="text-sm text-slate-400 italic">
                          Tipe nilai tidak didukung untuk edit langsung
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-xs text-slate-400">
                          Tipe: <span className="font-mono">{d.type}</span>
                        </span>
                        <button
                          onClick={() => handleSave(d)}
                          disabled={!d.dirty || savingId === d.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {savingId === d.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : d.dirty ? (
                            <Save className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Simpan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

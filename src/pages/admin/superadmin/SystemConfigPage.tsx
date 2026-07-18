import { useEffect, useState, useCallback } from 'react';
import { Save, Settings } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string';

function detectType(v: unknown): ValueType {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  return 'string';
}

function valueToString(v: unknown, type: ValueType): string {
  if (v === null || v === undefined) return '';
  if (type === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function parseValue(raw: string, type: ValueType): unknown {
  if (type === 'boolean') return raw === 'true' || raw === '1';
  if (type === 'number') {
    const n = Number(raw);
    return Number.isNaN(n) ? 0 : n;
  }
  return raw;
}

export default function SystemConfigPage() {
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const canManage = hasPermission('system_config', 'manage');

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('id, key, value, label, description, config_group, updated_at')
        .order('config_group', { ascending: true })
        .order('key', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as SystemConfig[];
      setConfigs(rows);
      const draftMap: Record<string, string> = {};
      rows.forEach((r) => {
        draftMap[r.key] = valueToString(r.value, detectType(r.value));
      });
      setDrafts(draftMap);
    } catch (err) {
      showToast('Gagal memuat konfigurasi: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleSave = async (c: SystemConfig) => {
    const type = detectType(c.value);
    const rawDraft = drafts[c.key] ?? '';
    const newValue = parseValue(rawDraft, type);

    // No change?
    if (valueToString(c.value, type) === valueToString(newValue, type)) {
      showToast('Tidak ada perubahan', 'info');
      return;
    }

    setSavingKey(c.key);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ value: newValue, updated_at: new Date().toISOString() })
        .eq('id', c.id);
      if (error) throw error;
      showToast(`Konfigurasi "${c.label ?? c.key}" disimpan`, 'success');
      await loadConfigs();
    } catch (err) {
      showToast('Gagal menyimpan: ' + (err as Error).message, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  // Group configs by config_group
  const groups: Record<string, SystemConfig[]> = {};
  configs.forEach((c) => {
    const g = c.config_group ?? 'Umum';
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  });
  const groupKeys = Object.keys(groups).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Kelola pengaturan dan parameter sistem</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Memuat...
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Belum ada konfigurasi.
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((g) => (
            <div key={g} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <Settings className="h-4 w-4" />
                  {g}
                </h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {groups[g].map((c) => {
                  const type = detectType(c.value);
                  const draft = drafts[c.key] ?? '';
                  const isDirty = valueToString(c.value, type) !== draft;
                  return (
                    <div key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">{c.label ?? c.key}</p>
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {c.key}
                          </code>
                        </div>
                        {c.description && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{c.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Value editor */}
                        {type === 'boolean' ? (
                          <button
                            onClick={() => canManage && setDrafts((d) => ({ ...d, [c.key]: draft === 'true' ? 'false' : 'true' }))}
                            disabled={!canManage}
                            className={cn(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition',
                              draft === 'true' ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700',
                              !canManage && 'cursor-not-allowed opacity-60',
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-4 w-4 transform rounded-full bg-white transition',
                                draft === 'true' ? 'translate-x-6' : 'translate-x-1',
                              )}
                            />
                          </button>
                        ) : type === 'number' ? (
                          <input
                            type="number"
                            value={draft}
                            onChange={(e) => setDrafts((d) => ({ ...d, [c.key]: e.target.value }))}
                            disabled={!canManage}
                            className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        ) : (
                          <input
                            type="text"
                            value={draft}
                            onChange={(e) => setDrafts((d) => ({ ...d, [c.key]: e.target.value }))}
                            disabled={!canManage}
                            className="w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        )}

                        {canManage && (
                          <button
                            onClick={() => handleSave(c)}
                            disabled={!isDirty || savingKey === c.key}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition',
                              isDirty && savingKey !== c.key
                                ? 'bg-brand-600 text-white hover:bg-brand-700'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                            )}
                          >
                            <Save className="h-3.5 w-3.5" />
                            {savingKey === c.key ? '...' : 'Simpan'}
                          </button>
                        )}
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

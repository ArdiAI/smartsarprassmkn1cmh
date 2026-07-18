import { useEffect, useState, useCallback } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../utils/cn';

interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_at: string;
}

type ValueKind = 'boolean' | 'number' | 'string';

function detectKind(v: unknown): ValueKind {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  return 'string';
}

function normalizeValue(v: unknown, kind: ValueKind): unknown {
  if (kind === 'boolean') return Boolean(v);
  if (kind === 'number') return Number(v);
  return v ?? '';
}

export default function SystemConfigPage() {
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const canManage = hasPermission('system_config', 'manage');

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('config_group', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as SystemConfig[];
      setConfigs(rows);
      const init: Record<string, unknown> = {};
      rows.forEach((r) => {
        init[r.key] = r.value;
      });
      setDrafts(init);
    } catch (e) {
      showToast('Gagal memuat konfigurasi', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleSave = async (c: SystemConfig) => {
    const val = drafts[c.key];
    if (val === undefined) return;
    setSavingKey(c.key);
    try {
      const normalized = normalizeValue(val, detectKind(c.value));
      const { error } = await supabase
        .from('system_config')
        .update({ value: normalized })
        .eq('id', c.id);
      if (error) throw error;
      showToast(`Konfigurasi "${c.key}" disimpan`, 'success');
      await loadConfigs();
    } catch (e) {
      showToast('Gagal menyimpan: ' + (e as Error).message, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  // group configs
  const groups = configs.reduce<Record<string, SystemConfig[]>>((acc, c) => {
    const g = c.config_group ?? 'Umum';
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});
  const groupKeys = Object.keys(groups).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ubah pengaturan global sistem</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Memuat…
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Tidak ada konfigurasi.
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((g) => (
            <div key={g}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">
                <SettingsIcon className="h-4 w-4" />
                {g}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {groups[g].map((c) => {
                  const kind = detectKind(c.value);
                  const draftVal = drafts[c.key];
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {c.label ?? c.key}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {c.description ?? '—'}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-slate-400">{c.key}</p>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleSave(c)}
                            disabled={savingKey === c.key}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {savingKey === c.key ? '…' : 'Simpan'}
                          </button>
                        )}
                      </div>
                      <div className="mt-4">
                        {kind === 'boolean' ? (
                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <button
                              type="button"
                              disabled={!canManage}
                              onClick={() =>
                                setDrafts((prev) => ({ ...prev, [c.key]: !(prev[c.key] ?? c.value) }))
                              }
                              className={cn(
                                'relative h-6 w-11 rounded-full transition',
                                (draftVal ?? c.value) ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700',
                                !canManage && 'opacity-60',
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
                                  (draftVal ?? c.value) ? 'left-[1.375rem]' : 'left-0.5',
                                )}
                              />
                            </button>
                            <span>{(draftVal ?? c.value) ? 'Aktif' : 'Nonaktif'}</span>
                          </label>
                        ) : kind === 'number' ? (
                          <input
                            type="number"
                            disabled={!canManage}
                            value={typeof draftVal === 'number' ? draftVal : (draftVal ?? c.value ?? '') as number | string}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                        ) : (
                          <input
                            type="text"
                            disabled={!canManage}
                            value={(draftVal ?? c.value ?? '') as string}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [c.key]: e.target.value }))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
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

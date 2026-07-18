import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  label: string;
  description: string;
  config_group: string;
  updated_at: string;
}

type ValueType = 'boolean' | 'number' | 'string';

function detectType(value: unknown): ValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

export default function SystemConfigPage() {
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const canManage = hasPermission('system_config', 'manage');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('id, key, value, label, description, config_group, updated_at')
        .order('config_group', { ascending: true });
      if (error) throw error;
      setConfigs((data ?? []) as unknown as SystemConfig[]);
    } catch {
      showToast('Gagal memuat konfigurasi sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = Array.from(new Set(configs.map((c) => c.config_group || 'Umum')));

  const currentValue = (c: SystemConfig): string => {
    if (edits[c.key] !== undefined) return edits[c.key];
    if (typeof c.value === 'boolean') return String(c.value);
    if (typeof c.value === 'number') return String(c.value);
    return (c.value as string) ?? '';
  };

  const handleSave = async (c: SystemConfig) => {
    const raw = edits[c.key];
    if (raw === undefined) return;
    const type = detectType(c.value);
    let parsed: unknown = raw;
    if (type === 'boolean') parsed = raw === 'true';
    else if (type === 'number') parsed = Number(raw);

    setSavingKey(c.key);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ value: parsed })
        .eq('id', c.id);
      if (error) throw error;
      const next = edits;
      delete next[c.key];
      setEdits({ ...next });
      showToast('Konfigurasi disimpan', 'success');
      await load();
    } catch {
      showToast('Gagal menyimpan konfigurasi', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola pengaturan aplikasi yang tersimpan di database.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-slate-400">Memuat…</p>
      ) : groups.length === 0 ? (
        <p className="text-center text-slate-400">Belum ada konfigurasi.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {group}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {configs
                  .filter((c) => (c.config_group || 'Umum') === group)
                  .map((c) => {
                    const type = detectType(c.value);
                    const dirty = edits[c.key] !== undefined;
                    return (
                      <div
                        key={c.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {c.label ?? c.key}
                          </h3>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            {type}
                          </span>
                        </div>
                        {c.description && (
                          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{c.description}</p>
                        )}
                        {type === 'boolean' ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={currentValue(c) === 'true'}
                              onChange={(e) => setEdits({ ...edits, [c.key]: String(e.target.checked) })}
                              disabled={!canManage}
                              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-200">
                              {currentValue(c) === 'true' ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </label>
                        ) : (
                          <input
                            type={type === 'number' ? 'number' : 'text'}
                            value={currentValue(c)}
                            onChange={(e) => setEdits({ ...edits, [c.key]: e.target.value })}
                            disabled={!canManage}
                            className={inputCls}
                          />
                        )}
                        {canManage && dirty && (
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => handleSave(c)}
                              disabled={savingKey === c.key}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                              <Save className="h-3.5 w-3.5" />
                              {savingKey === c.key ? 'Menyimpan…' : 'Simpan'}
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

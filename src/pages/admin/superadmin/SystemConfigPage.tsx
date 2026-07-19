import { useEffect, useState, useCallback } from 'react';
import { Save, Settings, Search } from 'lucide-react';
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
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string' | 'object';

function detectType(value: unknown): ValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'string';
}

function valueToString(value: unknown, type: ValueType): string {
  if (type === 'object') return JSON.stringify(value, null, 2);
  if (type === 'boolean') return value ? 'true' : 'false';
  return String(value ?? '');
}

export default function SystemConfigPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('system_config', 'manage');

  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value, label, description, config_group, updated_at')
      .order('config_group', { ascending: true })
      .order('key', { ascending: true });
    setLoading(false);
    if (error) {
      showToast('Gagal memuat konfigurasi sistem', 'error');
      return;
    }
    const rows = (data ?? []) as unknown as SystemConfig[];
    setConfigs(rows);
    const initialDrafts: Record<string, string> = {};
    rows.forEach((c) => {
      initialDrafts[c.id] = valueToString(c.value, detectType(c.value));
    });
    setDrafts(initialDrafts);
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const filtered = configs.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.key ?? '').toLowerCase().includes(q) ||
      (c.label ?? '').toLowerCase().includes(q) ||
      (c.config_group ?? '').toLowerCase().includes(q)
    );
  });

  const groups = Array.from(new Set(filtered.map((c) => c.config_group ?? 'Lainnya')));

  const handleSave = async (config: SystemConfig) => {
    const draft = drafts[config.id] ?? '';
    const type = detectType(config.value);
    let parsedValue: unknown = draft;

    try {
      if (type === 'boolean') {
        parsedValue = draft === 'true' || draft === '1';
      } else if (type === 'number') {
        if (draft.trim() === '') {
          parsedValue = 0;
        } else {
          const num = Number(draft);
          if (Number.isNaN(num)) throw new Error('Nilai harus berupa angka');
          parsedValue = num;
        }
      } else if (type === 'object') {
        parsedValue = draft.trim() === '' ? {} : JSON.parse(draft);
      } else {
        parsedValue = draft;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Format nilai tidak valid';
      showToast(msg, 'error');
      return;
    }

    setSavingId(config.id);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ value: parsedValue, updated_at: new Date().toISOString() })
        .eq('id', config.id);
      if (error) throw error;
      showToast(`Konfigurasi "${config.key}" berhasil disimpan`, 'success');
      await loadConfigs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi';
      showToast(msg, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const renderField = (config: SystemConfig) => {
    const type = detectType(config.value);
    const draft = drafts[config.id] ?? '';

    if (type === 'boolean') {
      return (
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft === 'true'}
            onChange={(e) =>
              setDrafts({ ...drafts, [config.id]: e.target.checked ? 'true' : 'false' })
            }
            disabled={!canManage}
            className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {draft === 'true' ? 'Aktif' : 'Nonaktif'}
          </span>
        </label>
      );
    }

    if (type === 'number') {
      return (
        <input
          type="number"
          value={draft}
          onChange={(e) => setDrafts({ ...drafts, [config.id]: e.target.value })}
          disabled={!canManage}
          className="input"
        />
      );
    }

    if (type === 'object') {
      return (
        <textarea
          value={draft}
          onChange={(e) => setDrafts({ ...drafts, [config.id]: e.target.value })}
          disabled={!canManage}
          rows={4}
          className="input font-mono text-xs"
        />
      );
    }

    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDrafts({ ...drafts, [config.id]: e.target.value })}
        disabled={!canManage}
        className="input"
      />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ubah pengaturan sistem. Tipe nilai terdeteksi otomatis.
        </p>
      </div>

      <div className="card">
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari key, label, atau grup..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Tidak ada konfigurasi.</p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Settings className="h-4 w-4" />
                  {group}
                </h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filtered
                    .filter((c) => (c.config_group ?? 'Lainnya') === group)
                    .map((config) => {
                      const type = detectType(config.value);
                      const isSaving = savingId === config.id;
                      return (
                        <div
                          key={config.id}
                          className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-100">
                                {config.label ?? config.key}
                              </p>
                              <p className="text-xs text-slate-400">{config.key}</p>
                            </div>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                                type === 'boolean'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  : type === 'number'
                                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                    : type === 'object'
                                      ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                              )}
                            >
                              {type}
                            </span>
                          </div>
                          {config.description && (
                            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                              {config.description}
                            </p>
                          )}
                          <div className="mb-3">{renderField(config)}</div>
                          {canManage && (
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleSave(config)}
                                disabled={isSaving}
                                className="btn-primary"
                              >
                                <Save className="h-4 w-4" />
                                {isSaving ? 'Menyimpan...' : 'Simpan'}
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
    </div>
  );
}

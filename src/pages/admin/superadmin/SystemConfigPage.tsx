import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Settings,
  Save,
  Loader2,
  Type,
  Hash,
  ToggleLeft,
  Search,
} from 'lucide-react';

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
  if (type === 'boolean') return v ? 'true' : 'false';
  return String(v ?? '');
}

function stringToValue(s: string, type: ValueType): unknown {
  if (type === 'boolean') return s === 'true';
  if (type === 'number') {
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
  }
  return s;
}

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .order('config_group', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi: ' + error.message, 'error');
    } else {
      const list = (data ?? []) as unknown as SystemConfig[];
      setConfigs(list);
      const init: Record<string, string> = {};
      for (const c of list) {
        init[c.id] = valueToString(c.value, detectType(c.value));
      }
      setDrafts(init);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const groups = Array.from(new Set(configs.map(c => c.config_group ?? 'lainnya').filter(Boolean)));

  const filtered = configs.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch =
      (c.key ?? '').toLowerCase().includes(q) ||
      (c.label ?? '').toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q);
    const matchesGroup = !groupFilter || (c.config_group ?? 'lainnya') === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const handleSave = async (config: SystemConfig) => {
    const type = detectType(config.value);
    const draft = drafts[config.id] ?? '';
    const newValue = stringToValue(draft, type);
    setSavingId(config.id);
    const { error } = await supabase
      .from('system_config')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
    } else {
      showToast(`Konfigurasi "${config.label ?? config.key}" disimpan`, 'success');
      setConfigs(prev => prev.map(c => (c.id === config.id ? { ...c, value: newValue } : c)));
    }
    setSavingId(null);
  };

  const isDirty = (config: SystemConfig) => {
    const type = detectType(config.value);
    return drafts[config.id] !== valueToString(config.value, type);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" />
          System Configuration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola pengaturan sistem. Tipe nilai terdeteksi otomatis.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari konfigurasi..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <select
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          className="px-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Semua Grup</option>
          {groups.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Tidak ada konfigurasi ditemukan
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(config => {
            const type = detectType(config.value);
            const draft = drafts[config.id] ?? '';
            const dirty = isDirty(config);
            const Icon = type === 'boolean' ? ToggleLeft : type === 'number' ? Hash : Type;
            return (
              <div
                key={config.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    <Icon className="w-5 h-5 text-blue-500" />
                  </div>
                  {config.config_group && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {config.config_group}
                    </span>
                  )}
                </div>

                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {config.label ?? config.key}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-1">{config.key}</p>
                {config.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex-1">
                    {config.description}
                  </p>
                )}

                <div className="mt-2">
                  {type === 'boolean' ? (
                    <label className="flex items-center justify-between gap-2 cursor-pointer p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {draft === 'true' ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts(d => ({ ...d, [config.id]: draft === 'true' ? 'false' : 'true' }))
                        }
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          draft === 'true' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            draft === 'true' ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </label>
                  ) : (
                    <input
                      type={type === 'number' ? 'number' : 'text'}
                      value={draft}
                      onChange={e => setDrafts(d => ({ ...d, [config.id]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  )}
                </div>

                <button
                  onClick={() => handleSave(config)}
                  disabled={!dirty || savingId === config.id}
                  className={cn(
                    'mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    dirty
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'
                  )}
                >
                  {savingId === config.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Save, Loader2, Settings, Search, ToggleLeft, ToggleRight, Type, Hash,
} from 'lucide-react';

interface SystemConfig {
  id: string;
  key: string;
  value: unknown; // jsonb
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

function stringifyValue(v: unknown, type: ValueType): string {
  if (type === 'boolean') return v ? 'true' : 'false';
  if (v === null || v === undefined) return '';
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
  const canManage = hasPermission('system_config', 'manage');

  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value, label, description, config_group, updated_at')
      .order('config_group', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi sistem', 'error');
      setLoading(false);
      return;
    }
    const list = (data as unknown as SystemConfig[]) || [];
    setConfigs(list);
    const initDrafts: Record<string, string> = {};
    for (const c of list) {
      initDrafts[c.id] = stringifyValue(c.value, detectType(c.value));
    }
    setDrafts(initDrafts);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const filtered = configs.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.key?.toLowerCase().includes(q) ||
      c.label?.toLowerCase().includes(q) ||
      c.config_group?.toLowerCase().includes(q)
    );
  });

  // Group by config_group for nicer display.
  const grouped: Record<string, SystemConfig[]> = {};
  for (const c of filtered) {
    const g = c.config_group ?? 'Umum';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(c);
  }

  const handleSave = async (c: SystemConfig) => {
    const type = detectType(c.value);
    const raw = drafts[c.id] ?? '';
    const newValue = parseValue(raw, type);
    setSavingId(c.id);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ value: newValue, updated_at: new Date().toISOString() })
        .eq('id', c.id);
      if (error) {
        showToast('Gagal menyimpan konfigurasi: ' + error.message, 'error');
        setSavingId(null);
        return;
      }
      showToast(`Konfigurasi "${c.label ?? c.key}" disimpan`, 'success');
      await fetchConfigs();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const renderEditor = (c: SystemConfig) => {
    const type = detectType(c.value);
    const raw = drafts[c.id] ?? '';

    if (type === 'boolean') {
      const isOn = raw === 'true';
      return (
        <button
          onClick={() => setDrafts(prev => ({ ...prev, [c.id]: isOn ? 'false' : 'true' }))}
          className="flex items-center gap-2"
        >
          {isOn ? (
            <ToggleRight className="w-10 h-10 text-emerald-500" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-slate-400" />
          )}
          <span className={cn('text-sm font-medium', isOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
            {isOn ? 'Aktif' : 'Nonaktif'}
          </span>
        </button>
      );
    }

    const isNumeric = type === 'number';
    const isTextual = type === 'string';
    return (
      <div className="relative">
        {isNumeric && <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />}
        {isTextual && <Type className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />}
        <input
          type={isNumeric ? 'number' : 'text'}
          value={raw}
          onChange={e => setDrafts(prev => ({ ...prev, [c.id]: e.target.value }))}
          className={cn('input', (isNumeric || isTextual) && 'pl-10')}
        />
      </div>
    );
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
          Atur parameter dan pengaturan aplikasi SMART SARPRAS
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari key, label, atau grup konfigurasi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-11"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada konfigurasi</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {group}
              </h2>
              <div className="grid gap-4">
                {items.map(c => {
                  const type = detectType(c.value);
                  const dirty = (drafts[c.id] ?? '') !== stringifyValue(c.value, type);
                  return (
                    <div key={c.id} className="card p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-900 dark:text-white">{c.label ?? c.key}</h3>
                            <code className="px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                              {c.key}
                            </code>
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                              {type}
                            </span>
                          </div>
                          {c.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.description}</p>
                          )}
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleSave(c)}
                            disabled={savingId === c.id || !dirty}
                            className={cn(
                              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                              dirty
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-700/50 dark:text-slate-500 cursor-not-allowed'
                            )}
                          >
                            {savingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan
                          </button>
                        )}
                      </div>
                      <div className="mt-3">{renderEditor(c)}</div>
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

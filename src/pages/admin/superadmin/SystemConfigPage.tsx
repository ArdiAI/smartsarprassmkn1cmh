import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Settings, Loader2, Save, Search, Type, Hash, ToggleLeft,
} from 'lucide-react';

interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_at: string;
}

type ValueType = 'boolean' | 'number' | 'string';

function detectType(v: unknown): ValueType {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  return 'string';
}

export default function SystemConfigPage() {
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const canManage = hasPermission('system_config', 'manage');

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value, label, description, config_group, updated_at')
      .order('config_group', { ascending: true })
      .order('key', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi', 'error');
    } else {
      setConfigs((data as unknown as SystemConfig[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const groups = Array.from(new Set(configs.map(c => c.config_group ?? 'lainnya').filter(Boolean)));

  const filtered = configs.filter(c => {
    const grp = c.config_group ?? 'lainnya';
    if (groupFilter !== 'all' && grp !== groupFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.key?.toLowerCase().includes(q) ||
      c.label?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  const getDraft = (c: SystemConfig): string => {
    if (drafts[c.id] !== undefined) return drafts[c.id];
    if (typeof c.value === 'boolean') return c.value ? 'true' : 'false';
    return String(c.value ?? '');
  };

  const isDirty = (c: SystemConfig): boolean => {
    const draft = getDraft(c);
    const original = typeof c.value === 'boolean' ? (c.value ? 'true' : 'false') : String(c.value ?? '');
    return draft !== original;
  };

  const setDraft = (c: SystemConfig, val: string) => {
    setDrafts(prev => ({ ...prev, [c.id]: val }));
  };

  const handleSave = async (c: SystemConfig) => {
    const draft = getDraft(c);
    const type = detectType(c.value);
    let parsedValue: unknown = draft;
    if (type === 'boolean') {
      parsedValue = draft === 'true';
    } else if (type === 'number') {
      const n = Number(draft);
      if (Number.isNaN(n)) {
        showToast('Nilai harus berupa angka', 'error');
        return;
      }
      parsedValue = n;
    } else {
      parsedValue = draft;
    }

    setSavingKey(c.id);
    const { error } = await supabase
      .from('system_config')
      .update({ value: parsedValue })
      .eq('id', c.id);
    if (error) {
      showToast('Gagal menyimpan konfigurasi', 'error');
    } else {
      showToast('Konfigurasi disimpan', 'success');
      setDrafts(prev => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
      await fetchConfigs();
    }
    setSavingKey(null);
  };

  const typeIcon = (type: ValueType) => {
    if (type === 'boolean') return <ToggleLeft className="w-4 h-4 text-blue-500" />;
    if (type === 'number') return <Hash className="w-4 h-4 text-cyan-500" />;
    return <Type className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola pengaturan sistem SMART SARPRAS
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari key, label, atau deskripsi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Grup</option>
          {groups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada konfigurasi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => {
            const type = detectType(c.value);
            const dirty = isDirty(c);
            const draft = getDraft(c);
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {typeIcon(type)}
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {c.label || c.key}
                      </h3>
                      <code className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        {c.key}
                      </code>
                      {c.config_group && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          {c.config_group}
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{c.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => canManage && setDraft(c, draft === 'true' ? 'false' : 'true')}
                        disabled={!canManage}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50',
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
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {draft === 'true' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </label>
                  ) : (
                    <input
                      type={type === 'number' ? 'number' : 'text'}
                      value={draft}
                      onChange={e => setDraft(c, e.target.value)}
                      disabled={!canManage}
                      className="input max-w-xs"
                    />
                  )}

                  {canManage && dirty && (
                    <button
                      onClick={() => handleSave(c)}
                      disabled={savingKey === c.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {savingKey === c.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Simpan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

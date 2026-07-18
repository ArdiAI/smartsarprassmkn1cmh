import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Settings, Search, Loader2, Save, Tag, Hash, ToggleLeft, Type, Info, RefreshCw, Database,
} from 'lucide-react';

interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string' | 'json';

const detectType = (v: unknown): ValueType => {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'string') return 'string';
  return 'json';
};

const stringifyValue = (v: unknown, type: ValueType): string => {
  if (type === 'json') {
    try { return JSON.stringify(v, null, 2); } catch { return String(v ?? ''); }
  }
  return v == null ? '' : String(v);
};

const parseValue = (raw: string, type: ValueType): unknown => {
  if (type === 'boolean') return raw === 'true' || raw === '1';
  if (type === 'number') {
    const n = Number(raw);
    return Number.isNaN(n) ? 0 : n;
  }
  if (type === 'json') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
};

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value, label, description, config_group, updated_by, updated_at')
      .order('config_group', { ascending: true, nullsFirst: true });
    if (error) {
      showToast('Gagal memuat konfigurasi sistem', 'error');
      setLoading(false);
      return;
    }
    const rows = (data as unknown as SystemConfig[]) || [];
    setConfigs(rows);
    // Initialize drafts
    setDrafts(prev => {
      const next: Record<string, string> = {};
      rows.forEach(r => {
        const t = detectType(r.value);
        next[r.id] = prev[r.id] ?? stringifyValue(r.value, t);
      });
      return next;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const groups = Array.from(new Set(configs.map(c => c.config_group).filter(Boolean) as string[])).sort();

  const filtered = configs.filter(c => {
    if (groupFilter !== 'all' && c.config_group !== groupFilter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.key?.toLowerCase().includes(q) ||
      c.label?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  const handleSave = async (c: SystemConfig) => {
    const type = detectType(c.value);
    const raw = drafts[c.id] ?? '';
    const parsed = parseValue(raw, type);
    setSavingId(c.id);
    const { error } = await supabase
      .from('system_config')
      .update({
        value: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', c.id);
    if (error) {
      showToast('Gagal menyimpan konfigurasi: ' + error.message, 'error');
      setSavingId(null);
      return;
    }
    showToast(`Konfigurasi "${c.label || c.key}" disimpan`, 'success');
    await fetchConfigs();
    setSavingId(null);
  };

  const handleToggle = async (c: SystemConfig, next: boolean) => {
    setSavingId(c.id);
    const { error } = await supabase
      .from('system_config')
      .update({
        value: next,
        updated_at: new Date().toISOString(),
      })
      .eq('id', c.id);
    if (error) {
      showToast('Gagal mengubah konfigurasi', 'error');
      setSavingId(null);
      return;
    }
    showToast(`"${c.label || c.key}" ${next ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    await fetchConfigs();
    setSavingId(null);
  };

  const typeIcon = (type: ValueType) => {
    switch (type) {
      case 'boolean': return ToggleLeft;
      case 'number': return Hash;
      case 'json': return Database;
      default: return Type;
    }
  };

  const typeColor = (type: ValueType) => {
    switch (type) {
      case 'boolean': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'number': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'json': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-cyan-600" />
            System Configuration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengaturan sistem SMART SARPRAS
          </p>
        </div>
        <button
          onClick={fetchConfigs}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          <RefreshCw className="w-5 h-5" />
          Muat Ulang
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari key, label, atau deskripsi..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <select
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">Semua Grup</option>
          {groups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Settings className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada konfigurasi ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(c => {
            const type = detectType(c.value);
            const Icon = typeIcon(type);
            const draft = drafts[c.id] ?? '';
            const isDirty = draft !== stringifyValue(c.value, type);
            return (
              <div
                key={c.id}
                className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', typeColor(type))}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {c.label || c.key}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">{c.key}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    typeColor(type),
                  )}>
                    {type}
                  </span>
                </div>

                {c.description && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {c.description}
                  </p>
                )}

                <div className="mt-3">
                  {type === 'boolean' ? (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={c.value === true}
                        onClick={() => handleToggle(c, c.value !== true)}
                        disabled={savingId === c.id}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50',
                          c.value === true ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600',
                        )}
                      >
                        {savingId === c.id ? (
                          <Loader2 className="w-4 h-4 text-white absolute left-1 animate-spin" />
                        ) : (
                          <span className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            c.value === true ? 'translate-x-6' : 'translate-x-1',
                          )} />
                        )}
                      </button>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {c.value === true ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </label>
                  ) : type === 'json' ? (
                    <textarea
                      value={draft}
                      onChange={e => setDrafts(prev => ({ ...prev, [c.id]: e.target.value }))}
                      rows={4}
                      spellCheck={false}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-xs resize-y"
                    />
                  ) : (
                    <input
                      type={type === 'number' ? 'number' : 'text'}
                      value={draft}
                      onChange={e => setDrafts(prev => ({ ...prev, [c.id]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    {c.config_group && (
                      <>
                        <Tag className="w-3 h-3" /> {c.config_group}
                      </>
                    )}
                    {c.updated_at && (
                      <span className="ml-2">
                        · diperbarui {new Date(c.updated_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    )}
                  </span>
                  {type !== 'boolean' && (
                    <button
                      onClick={() => handleSave(c)}
                      disabled={savingId === c.id || !isDirty}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                        isDirty
                          ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400',
                      )}
                    >
                      {savingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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

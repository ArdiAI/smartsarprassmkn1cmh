import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Loader2, Save, Settings, Type, Hash, ToggleLeft, Search,
} from 'lucide-react';

interface SystemConfigRow {
  id: string;
  key: string;
  value: unknown;
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string';

function detectType(v: unknown): ValueType {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  return 'string';
}

export default function SystemConfigPage() {
  const { hasPermission, adminProfile } = useAuth();
  const canManage = hasPermission('system_config', 'manage');

  const [configs, setConfigs] = useState<SystemConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [drafts, setDrafts] = useState<Record<string, string | boolean | number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value, label, description, config_group, updated_by, updated_at')
      .order('config_group', { ascending: true })
      .order('key', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi', 'error');
    } else {
      setConfigs((data as unknown as SystemConfigRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const groups = Array.from(new Set(configs.map(c => c.config_group).filter(Boolean) as string[]));

  const filtered = configs.filter(c => {
    if (groupFilter !== 'all' && c.config_group !== groupFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.key?.toLowerCase().includes(q) ||
      c.label?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  const draftValue = (c: SystemConfigRow): string | boolean | number => {
    if (drafts[c.id] !== undefined) return drafts[c.id];
    return c.value as string | boolean | number;
  };

  const updateDraft = (c: SystemConfigRow, v: string | boolean | number) => {
    setDrafts(prev => ({ ...prev, [c.id]: v }));
  };

  const handleSave = async (c: SystemConfigRow) => {
    const v = draftValue(c);
    setSavingId(c.id);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({
          value: v,
          updated_by: adminProfile?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', c.id);
      if (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
        setSavingId(null);
        return;
      }
      showToast('Konfigurasi disimpan', 'success');
      setDrafts(prev => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
      await fetchConfigs();
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setSavingId(null);
    }
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola pengaturan sistem SMART SARPRAS
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari key, label, atau deskripsi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Semua Grup</option>
          {groups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada konfigurasi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => {
            const t = detectType(draftValue(c));
            const isDirty = drafts[c.id] !== undefined && drafts[c.id] !== (c.value as string | boolean | number);
            return (
              <div key={c.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{c.label ?? c.key}</h3>
                      {c.config_group && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                          {c.config_group}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{c.key}</p>
                    {c.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                    {t === 'boolean' ? <ToggleLeft className="w-3.5 h-3.5" /> : t === 'number' ? <Hash className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                    <span className="capitalize">{t}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {t === 'boolean' ? (
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => updateDraft(c, !(draftValue(c) as boolean))}
                      className={cn(
                        'relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50',
                        draftValue(c) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                      )}
                    >
                      <span className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                        draftValue(c) ? 'translate-x-6' : 'translate-x-1'
                      )} />
                    </button>
                  ) : (
                    <input
                      type={t === 'number' ? 'number' : 'text'}
                      value={String(draftValue(c) ?? '')}
                      disabled={!canManage}
                      onChange={e => updateDraft(c, t === 'number' ? Number(e.target.value) : e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                    />
                  )}

                  {canManage && (
                    <button
                      onClick={() => handleSave(c)}
                      disabled={!isDirty || savingId === c.id}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isDirty
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-700/50 cursor-not-allowed'
                      )}
                    >
                      {savingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Simpan
                    </button>
                  )}
                </div>

                {c.updated_at && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Diperbarui: {new Date(c.updated_at).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

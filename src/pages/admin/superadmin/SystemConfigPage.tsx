import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Settings,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Type,
  Hash,
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
  const { hasPermission, adminProfile } = useAuth();
  const canManage = hasPermission('system_config', 'manage');

  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('id, key, value, label, description, config_group, updated_at')
        .order('config_group', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as SystemConfig[];
      setConfigs(rows);
      // Initialize drafts from fetched values
      const d: Record<string, unknown> = {};
      rows.forEach((r) => {
        d[r.id] = r.value;
      });
      setDrafts(d);
    } catch {
      showToast('Gagal memuat konfigurasi sistem', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async (c: SystemConfig) => {
    setSavingId(c.id);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({
          value: drafts[c.id],
          updated_by: adminProfile?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', c.id);
      if (error) throw error;
      showToast(`Konfigurasi "${c.label ?? c.key}" berhasil disimpan`, 'success');
      fetchConfigs();
    } catch {
      showToast('Gagal menyimpan konfigurasi', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // Group configs by config_group
  const groups = configs.reduce<Record<string, SystemConfig[]>>((acc, c) => {
    const g = c.config_group ?? 'Lainnya';
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});

  const renderEditor = (c: SystemConfig) => {
    const type = detectType(c.value);
    const draftVal = drafts[c.id];

    if (type === 'boolean') {
      const checked = Boolean(draftVal);
      return (
        <button
          onClick={() => canManage && setDrafts((p) => ({ ...p, [c.id]: !checked }))}
          disabled={!canManage}
          className={cn(
            'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
            checked
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
            !canManage && 'cursor-not-allowed opacity-60'
          )}
        >
          {checked ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
          {checked ? 'Aktif' : 'Nonaktif'}
        </button>
      );
    }

    if (type === 'number') {
      return (
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="number"
            value={String(draftVal ?? '')}
            onChange={(e) => canManage && setDrafts((p) => ({ ...p, [c.id]: Number(e.target.value) }))}
            disabled={!canManage}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
      );
    }

    return (
      <div className="relative">
        <Type className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={String(draftVal ?? '')}
          onChange={(e) => canManage && setDrafts((p) => ({ ...p, [c.id]: e.target.value }))}
          disabled={!canManage}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Konfigurasi Sistem</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola pengaturan dan parameter sistem
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <Settings className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Belum ada konfigurasi</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {group}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => {
                  const type = detectType(c.value);
                  const dirty = JSON.stringify(drafts[c.id]) !== JSON.stringify(c.value);
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{c.label ?? c.key}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{c.key}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {type}
                        </span>
                      </div>

                      {c.description && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{c.description}</p>
                      )}

                      <div className="mt-3">{renderEditor(c)}</div>

                      {canManage && dirty && (
                        <button
                          onClick={() => handleSave(c)}
                          disabled={savingId === c.id}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                        >
                          {savingId === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Simpan
                        </button>
                      )}

                      <p className="mt-2 text-xs text-slate-400">
                        Diperbarui: {c.updated_at ? new Date(c.updated_at).toLocaleDateString('id-ID') : '-'}
                      </p>
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

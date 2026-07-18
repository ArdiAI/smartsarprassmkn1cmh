import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Settings, Loader2, Save, Type, Hash, ToggleRight, Info,
} from 'lucide-react';

interface SystemConfig {
  id: string;
  key: string;
  value: unknown; // jsonb
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string';

function detectType(value: unknown): ValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

function valueToString(value: unknown, type: ValueType): string {
  if (value === null || value === undefined) return '';
  if (type === 'boolean') return value ? 'true' : 'false';
  return String(value);
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
  const { hasPermission, adminProfile } = useAuth();
  const canManage = hasPermission('system_config', 'manage');

  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({}); // key -> raw string value
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value, label, description, config_group, updated_by, updated_at')
      .order('config_group', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi sistem', 'error');
      setLoading(false);
      return;
    }
    const rows = (data as unknown as SystemConfig[]) || [];
    setConfigs(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Group configs by config_group
  const groups: Record<string, SystemConfig[]> = {};
  for (const c of configs) {
    const g = c.config_group ?? 'Umum';
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  }

  const startEdit = (cfg: SystemConfig) => {
    if (!canManage) return;
    const type = detectType(cfg.value);
    setEditing({ ...editing, [cfg.key]: valueToString(cfg.value, type) });
  };

  const cancelEdit = (key: string) => {
    const next = { ...editing };
    delete next[key];
    setEditing(next);
  };

  const handleSave = async (cfg: SystemConfig) => {
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengubah konfigurasi', 'error');
      return;
    }
    const raw = editing[cfg.key] ?? '';
    const type = detectType(cfg.value);
    const newValue = parseValue(raw, type);

    setSavingKey(cfg.key);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({
          value: newValue,
          updated_by: adminProfile?.name ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cfg.id);
      if (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
        setSavingKey(null);
        return;
      }
      showToast('Konfigurasi berhasil disimpan', 'success');
      cancelEdit(cfg.key);
      await fetchConfigs();
    } catch (e) {
      showToast('Terjadi kesalahan saat menyimpan', 'error');
    } finally {
      setSavingKey(null);
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
          Kelola pengaturan konfigurasi aplikasi
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Tipe nilai terdeteksi otomatis: boolean (toggle), number (input angka), atau string (teks).
        </p>
      </div>

      {Object.keys(groups).length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada konfigurasi</p>
          <p className="text-sm text-slate-400 mt-1">Belum ada konfigurasi sistem yang terdaftar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                {group}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(cfg => {
                  const type = detectType(cfg.value);
                  const isEditing = editing[cfg.key] !== undefined;
                  const Icon = type === 'boolean' ? ToggleRight : type === 'number' ? Hash : Type;
                  return (
                    <div
                      key={cfg.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                              {cfg.label ?? cfg.key}
                            </h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                              {cfg.key}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400 flex-shrink-0">
                          {type}
                        </span>
                      </div>

                      {cfg.description ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          {cfg.description}
                        </p>
                      ) : null}

                      <div className="mt-4">
                        {!isEditing ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                              {type === 'boolean' ? (
                                <span className={cn(cfg.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
                                  {cfg.value ? 'Aktif' : 'Nonaktif'}
                                </span>
                              ) : (
                                <span>{String(cfg.value ?? '—')}</span>
                              )}
                            </div>
                            {canManage && (
                              <button
                                onClick={() => startEdit(cfg)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {type === 'boolean' ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editing[cfg.key] === 'true'}
                                  onChange={e => setEditing({ ...editing, [cfg.key]: e.target.checked ? 'true' : 'false' })}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                  {editing[cfg.key] === 'true' ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </label>
                            ) : type === 'number' ? (
                              <input
                                type="number"
                                value={editing[cfg.key] ?? ''}
                                onChange={e => setEditing({ ...editing, [cfg.key]: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            ) : (
                              <input
                                type="text"
                                value={editing[cfg.key] ?? ''}
                                onChange={e => setEditing({ ...editing, [cfg.key]: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => cancelEdit(cfg.key)}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                              >
                                Batal
                              </button>
                              <button
                                onClick={() => handleSave(cfg)}
                                disabled={savingKey === cfg.key}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                {savingKey === cfg.key ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                Simpan
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {cfg.updated_at ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                          Diperbarui: {new Date(cfg.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {cfg.updated_by ? ` oleh ${cfg.updated_by}` : ''}
                        </p>
                      ) : null}
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

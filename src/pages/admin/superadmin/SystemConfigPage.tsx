import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Settings, Loader2, Save, Search, Info, Type, Hash, ToggleLeft,
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

type ValueType = 'boolean' | 'number' | 'string' | 'object';

function detectType(value: unknown): ValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'object';
}

export default function SystemConfigPage() {
  const { hasPermission, user } = useAuth();
  const [configs, setConfigs] = useState<SystemConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [editing, setEditing] = useState<Record<string, string | boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const canManage = hasPermission('system_config', 'manage');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value, label, description, config_group, updated_by, updated_at')
      .order('config_group', { ascending: true })
      .order('key', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi sistem', 'error');
      setLoading(false);
      return;
    }
    setConfigs((data as unknown as SystemConfigRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groups = Array.from(new Set(configs.map(c => c.config_group ?? 'Lainnya').filter(Boolean)));

  const filteredConfigs = configs.filter(c => {
    const grp = c.config_group ?? 'Lainnya';
    if (groupFilter !== 'all' && grp !== groupFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.key?.toLowerCase().includes(q) ||
      (c.label ?? '').toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q)
    );
  });

  const getEditValue = (c: SystemConfigRow): string | boolean => {
    if (editing[c.id] !== undefined) return editing[c.id];
    const t = detectType(c.value);
    if (t === 'boolean') return Boolean(c.value);
    if (t === 'object') return JSON.stringify(c.value, null, 2);
    return String(c.value ?? '');
  };

  const setEditValue = (id: string, val: string | boolean) => {
    setEditing(prev => ({ ...prev, [id]: val }));
  };

  const handleSave = async (c: SystemConfigRow) => {
    if (!canManage) return;
    const raw = editing[c.id];
    if (raw === undefined) {
      showToast('Tidak ada perubahan', 'info');
      return;
    }
    setSavingKey(c.id);
    try {
      const t = detectType(c.value);
      let parsedValue: unknown;
      if (t === 'boolean') {
        parsedValue = Boolean(raw);
      } else if (t === 'number') {
        const n = Number(raw);
        if (isNaN(n)) {
          showToast('Nilai angka tidak valid', 'error');
          setSavingKey(null);
          return;
        }
        parsedValue = n;
      } else if (t === 'object') {
        try {
          parsedValue = JSON.parse(String(raw));
        } catch {
          showToast('JSON tidak valid', 'error');
          setSavingKey(null);
          return;
        }
      } else {
        parsedValue = String(raw);
      }

      const { error } = await supabase
        .from('system_config')
        .update({
          value: parsedValue,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', c.id);
      if (error) throw error;

      setConfigs(prev => prev.map(x => (x.id === c.id ? { ...x, value: parsedValue, updated_at: new Date().toISOString() } : x)));
      setEditing(prev => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
      showToast(`Konfigurasi "${c.label ?? c.key}" berhasil disimpan`, 'success');
    } catch (e: any) {
      showToast(`Gagal menyimpan: ${e.message}`, 'error');
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
          Kelola pengaturan sistem — tipe nilai terdeteksi otomatis (boolean, angka, teks, JSON)
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Perubahan konfigurasi langsung berlaku setelah disimpan. Nilai boolean ditampilkan sebagai toggle, angka sebagai input numerik, teks sebagai text field, dan objek sebagai JSON.
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

      {filteredConfigs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada konfigurasi</p>
          <p className="text-sm text-slate-400 mt-1">Belum ada entri system_config yang cocok</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredConfigs.map(c => {
            const t = detectType(c.value);
            const val = getEditValue(c);
            const isDirty = editing[c.id] !== undefined;
            const TypeIcon = t === 'boolean' ? ToggleLeft : t === 'number' ? Hash : t === 'object' ? Settings : Type;
            return (
              <div key={c.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{c.label ?? c.key}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{c.key}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 flex-shrink-0">
                    {c.config_group ?? 'Lainnya'}
                  </span>
                </div>

                {c.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{c.description}</p>
                )}

                <div>
                  {t === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(val)}
                        disabled={!canManage}
                        onClick={() => canManage && setEditValue(c.id, !val)}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          val ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600',
                          !canManage && 'opacity-60 cursor-not-allowed',
                        )}
                      >
                        <span className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          val ? 'translate-x-6' : 'translate-x-1',
                        )} />
                      </button>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{val ? 'Aktif' : 'Nonaktif'}</span>
                    </label>
                  ) : t === 'object' ? (
                    <textarea
                      value={String(val)}
                      onChange={e => setEditValue(c.id, e.target.value)}
                      disabled={!canManage}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60"
                    />
                  ) : (
                    <input
                      type={t === 'number' ? 'number' : 'text'}
                      value={String(val)}
                      onChange={e => setEditValue(c.id, e.target.value)}
                      disabled={!canManage}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {c.updated_at ? `Diperbarui: ${new Date(c.updated_at).toLocaleString('id-ID')}` : ''}
                  </p>
                  {canManage && (
                    <button
                      onClick={() => handleSave(c)}
                      disabled={!isDirty || savingKey === c.id}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        isDirty
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed',
                        savingKey === c.id && 'opacity-50',
                      )}
                    >
                      {savingKey === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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

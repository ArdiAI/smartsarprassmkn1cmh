import { useEffect, useState, useCallback } from 'react';
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
  ToggleRight,
  Search,
} from 'lucide-react';

// ---- Types matching the `system_config` table ----
interface SystemConfig {
  id: string;
  key: string | null;
  value: unknown; // jsonb — can be boolean, number, string, object, array
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string' | 'json';

function detectType(value: unknown): ValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'json';
}

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value, label, description, config_group, updated_by, updated_at')
      .order('config_group', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi: ' + error.message, 'error');
    } else {
      const list = (data ?? []) as unknown as SystemConfig[];
      setConfigs(list);
      // Initialize editing state with stringified values
      const init: Record<string, string> = {};
      list.forEach(c => {
        if (c.value !== null && c.value !== undefined) {
          init[c.id] = typeof c.value === 'string' ? c.value : JSON.stringify(c.value);
        } else {
          init[c.id] = '';
        }
      });
      setEditing(init);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const filtered = configs.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.key ?? '').toLowerCase().includes(q) ||
      (c.label ?? '').toLowerCase().includes(q) ||
      (c.config_group ?? '').toLowerCase().includes(q)
    );
  });

  // Group configs by config_group
  const grouped: Record<string, SystemConfig[]> = {};
  filtered.forEach(c => {
    const g = c.config_group ?? 'Lainnya';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(c);
  });

  const handleSave = async (config: SystemConfig) => {
    const raw = editing[config.id] ?? '';
    const type = detectType(config.value);
    let parsedValue: unknown;

    if (type === 'boolean') {
      parsedValue = raw === 'true';
    } else if (type === 'number') {
      const n = parseFloat(raw);
      if (isNaN(n)) {
        showToast('Nilai harus berupa angka', 'error');
        return;
      }
      parsedValue = n;
    } else if (type === 'string') {
      parsedValue = raw;
    } else {
      try {
        parsedValue = JSON.parse(raw);
      } catch {
        showToast('Nilai JSON tidak valid', 'error');
        return;
      }
    }

    setSavingId(config.id);
    const { error } = await supabase
      .from('system_config')
      .update({ value: parsedValue, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    setSavingId(null);

    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
      return;
    }
    showToast(`Konfigurasi "${config.label ?? config.key}" disimpan`, 'success');
    setConfigs(prev =>
      prev.map(c => (c.id === config.id ? { ...c, value: parsedValue } : c))
    );
  };

  const renderEditor = (config: SystemConfig) => {
    const type = detectType(config.value);
    const value = editing[config.id] ?? '';

    if (type === 'boolean') {
      const boolVal = value === 'true';
      return (
        <button
          onClick={() =>
            setEditing(prev => ({ ...prev, [config.id]: String(!boolVal) }))
          }
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors',
            boolVal
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          )}
        >
          {boolVal ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
          {boolVal ? 'Aktif' : 'Nonaktif'}
        </button>
      );
    }

    if (type === 'number') {
      return (
        <div className="relative">
          <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="number"
            value={value}
            onChange={e => setEditing(prev => ({ ...prev, [config.id]: e.target.value }))}
            className="input pl-10"
          />
        </div>
      );
    }

    if (type === 'string') {
      return (
        <div className="relative">
          <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={value}
            onChange={e => setEditing(prev => ({ ...prev, [config.id]: e.target.value }))}
            className="input pl-10"
          />
        </div>
      );
    }

    // json
    return (
      <textarea
        value={value}
        onChange={e => setEditing(prev => ({ ...prev, [config.id]: e.target.value }))}
        rows={4}
        className="input font-mono text-xs resize-y"
        placeholder='{"key": "value"}'
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" />
          System Configuration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola pengaturan sistem. Tipe nilai terdeteksi otomatis.
        </p>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari konfigurasi berdasarkan key, label, atau grup..."
            className="input pl-11"
          />
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card py-16 text-center text-slate-500 dark:text-slate-400">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Tidak ada konfigurasi ditemukan</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                {group}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map(config => {
                  const type = detectType(config.value);
                  const isSaving = savingId === config.id;
                  return (
                    <div key={config.id} className="card p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {config.label ?? config.key}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {config.key}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex-shrink-0">
                          {type}
                        </span>
                      </div>

                      {config.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {config.description}
                        </p>
                      )}

                      {renderEditor(config)}

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {config.updated_at
                            ? `Diperbarui: ${new Date(config.updated_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}`
                            : 'Belum pernah diperbarui'}
                        </p>
                        <button
                          onClick={() => handleSave(config)}
                          disabled={isSaving}
                          className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-sm"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Simpan
                            </>
                          )}
                        </button>
                      </div>
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

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Settings, Loader2, Search, Save, Type, Hash, ToggleLeft, ToggleRight,
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

type ValueType = 'boolean' | 'number' | 'string';

function detectType(value: unknown): ValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

function normalizeValue(value: unknown, type: ValueType): string {
  if (value === null || value === undefined) return '';
  if (type === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export default function SystemConfigPage() {
  const { hasPermission } = useAuth();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  // Editable values keyed by config id: { [id]: { value: string, type: ValueType } }
  const [edits, setEdits] = useState<Record<string, { value: string; type: ValueType }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const canManage = hasPermission('system_config', 'manage');

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('id, key, value, label, description, config_group, updated_by, updated_at')
      .order('config_group', { ascending: true });
    if (error) {
      showToast('Gagal memuat konfigurasi sistem', 'error');
    } else {
      const rows = (data as unknown as SystemConfig[]) || [];
      setConfigs(rows);
      // Initialize edits with current values.
      const initialEdits: Record<string, { value: string; type: ValueType }> = {};
      rows.forEach(c => {
        const type = detectType(c.value);
        initialEdits[c.id] = { value: normalizeValue(c.value, type), type };
      });
      setEdits(initialEdits);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const groups = Array.from(new Set(configs.map(c => c.config_group ?? 'lainnya').filter(Boolean)));

  const handleToggle = (id: string) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], value: prev[id]?.value === 'true' ? 'false' : 'true' },
    }));
  };

  const handleValueChange = (id: string, value: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], value } }));
  };

  const handleSave = async (c: SystemConfig) => {
    const edit = edits[c.id];
    if (!edit) return;

    let parsedValue: unknown;
    if (edit.type === 'boolean') {
      parsedValue = edit.value === 'true';
    } else if (edit.type === 'number') {
      const n = Number(edit.value);
      if (edit.value !== '' && Number.isNaN(n)) {
        showToast('Nilai harus berupa angka', 'error');
        return;
      }
      parsedValue = edit.value === '' ? 0 : n;
    } else {
      parsedValue = edit.value;
    }

    // Check if value changed.
    const originalNormalized = normalizeValue(c.value, edit.type);
    if (originalNormalized === edit.value) {
      showToast('Tidak ada perubahan', 'info');
      return;
    }

    setSavingId(c.id);
    const { error } = await supabase
      .from('system_config')
      .update({ value: parsedValue, updated_at: new Date().toISOString() })
      .eq('id', c.id);

    if (error) {
      showToast('Gagal menyimpan konfigurasi: ' + error.message, 'error');
    } else {
      showToast('Konfigurasi disimpan', 'success');
      await fetchConfigs();
    }
    setSavingId(null);
  };

  const filtered = configs.filter(c => {
    if (groupFilter !== 'all' && (c.config_group ?? 'lainnya') !== groupFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.key?.toLowerCase().includes(q) ||
      c.label?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  const renderValueInput = (c: SystemConfig) => {
    const edit = edits[c.id];
    if (!edit) return null;

    if (edit.type === 'boolean') {
      return (
        <button
          onClick={() => canManage && handleToggle(c.id)}
          disabled={!canManage}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors',
            edit.value === 'true'
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600',
            canManage ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
          )}
        >
          {edit.value === 'true' ? (
            <ToggleRight className="w-6 h-6 text-blue-500" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {edit.value === 'true' ? 'Aktif' : 'Nonaktif'}
          </span>
        </button>
      );
    }

    if (edit.type === 'number') {
      return (
        <input
          type="number"
          value={edit.value}
          onChange={e => handleValueChange(c.id, e.target.value)}
          disabled={!canManage}
          className="input max-w-xs"
        />
      );
    }

    return (
      <input
        type="text"
        value={edit.value}
        onChange={e => handleValueChange(c.id, e.target.value)}
        disabled={!canManage}
        className="input max-w-md"
      />
    );
  };

  const typeIcon = (type: ValueType) => {
    if (type === 'boolean') return <ToggleRight className="w-3.5 h-3.5" />;
    if (type === 'number') return <Hash className="w-3.5 h-3.5" />;
    return <Type className="w-3.5 h-3.5" />;
  };

  const typeLabel = (type: ValueType) => {
    if (type === 'boolean') return 'Boolean';
    if (type === 'number') return 'Number';
    return 'String';
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
            placeholder="Cari konfigurasi..."
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
        <div className="space-y-3">
          {filtered.map(c => {
            const edit = edits[c.id];
            const type = edit?.type ?? detectType(c.value);
            const isDirty = edit && normalizeValue(c.value, type) !== edit.value;
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {c.label ?? c.key}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        {typeIcon(type)}
                        {typeLabel(type)}
                      </span>
                      {c.config_group && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                          {c.config_group}
                        </span>
                      )}
                    </div>
                    <code className="text-xs text-slate-400 font-mono">{c.key}</code>
                    {c.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <div>{renderValueInput(c)}</div>
                    {canManage && (
                      <button
                        onClick={() => handleSave(c)}
                        disabled={!isDirty || savingId === c.id}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-medium transition-colors',
                          isDirty
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'
                        )}
                      >
                        {savingId === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Simpan
                      </button>
                    )}
                  </div>
                </div>
                {c.updated_at && (
                  <p className="text-xs text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-700 pt-2">
                    Diperbarui: {new Date(c.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
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

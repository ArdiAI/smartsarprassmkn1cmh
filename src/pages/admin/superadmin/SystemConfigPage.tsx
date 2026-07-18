import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Settings, Loader2, Save, CheckCircle2, Hash, Type, ToggleLeft, AlertCircle,
} from 'lucide-react';

interface SystemConfig {
  id: string;
  key: string;
  value: any;
  label: string | null;
  description: string | null;
  config_group: string | null;
  updated_at: string | null;
}

type ValueType = 'boolean' | 'number' | 'string' | 'unknown';

function detectType(value: any): ValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'unknown';
}

export default function SystemConfigPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('system_config', 'manage');

  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
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
    const rows = (data as unknown as SystemConfig[]) || [];
    setConfigs(rows);
    const draftMap: Record<string, any> = {};
    rows.forEach(r => {
      draftMap[r.id] = r.value;
    });
    setDrafts(draftMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async (cfg: SystemConfig) => {
    setSavingId(cfg.id);
    try {
      const newValue = drafts[cfg.id];
      const { error } = await supabase
        .from('system_config')
        .update({ value: newValue, updated_at: new Date().toISOString() })
        .eq('id', cfg.id);
      if (error) {
        showToast(`Gagal menyimpan: ${error.message}`, 'error');
        setSavingId(null);
        return;
      }
      setConfigs(prev => prev.map(c => (c.id === cfg.id ? { ...c, value: newValue } : c)));
      showToast(`Konfigurasi "${cfg.label || cfg.key}" disimpan`, 'success');
    } finally {
      setSavingId(null);
    }
  };

  const grouped: Record<string, SystemConfig[]> = {};
  configs.forEach(c => {
    const g = c.config_group || 'Umum';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(c);
  });

  const renderEditor = (cfg: SystemConfig) => {
    const type = detectType(cfg.value);
    const draft = drafts[cfg.id];
    const isDirty = JSON.stringify(draft) !== JSON.stringify(cfg.value);

    if (type === 'boolean') {
      return (
        <button
          onClick={() => canManage && setDrafts(prev => ({ ...prev, [cfg.id]: !prev[cfg.id] }))}
          disabled={!canManage}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
            draft
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
            !canManage && 'cursor-not-allowed opacity-70'
          )}
        >
          <ToggleLeft className="w-5 h-5" />
          {draft ? 'Aktif' : 'Nonaktif'}
        </button>
      );
    }

    if (type === 'number') {
      return (
        <input
          type="number"
          value={typeof draft === 'number' ? draft : (draft ?? '')}
          onChange={e => setDrafts(prev => ({ ...prev, [cfg.id]: Number(e.target.value) }))}
          disabled={!canManage}
          className="w-full sm:w-40 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />
      );
    }

    if (type === 'string') {
      return (
        <input
          type="text"
          value={draft ?? ''}
          onChange={e => setDrafts(prev => ({ ...prev, [cfg.id]: e.target.value }))}
          disabled={!canManage}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />
      );
    }

    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Tipe nilai tidak dikenali (object/array). Edit langsung di database.
        </p>
      </div>
    );
  };

  const typeIcon = (value: any) => {
    const t = detectType(value);
    if (t === 'boolean') return <ToggleLeft className="w-3.5 h-3.5" />;
    if (t === 'number') return <Hash className="w-3.5 h-3.5" />;
    if (t === 'string') return <Type className="w-3.5 h-3.5" />;
    return <AlertCircle className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" />
          Konfigurasi Sistem
        </h1>
        <p className="text-sm text-slate-500 mt-1">Kelola pengaturan dan parameter sistem</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada konfigurasi</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{group}</h2>
              <div className="grid gap-4">
                {items.map(cfg => {
                  const draft = drafts[cfg.id];
                  const isDirty = JSON.stringify(draft) !== JSON.stringify(cfg.value);
                  return (
                    <div
                      key={cfg.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-slate-900 dark:text-white">
                              {cfg.label || cfg.key}
                            </h3>
                            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                              {typeIcon(cfg.value)} {detectType(cfg.value)}
                            </span>
                            <code className="text-xs text-slate-400 font-mono">{cfg.key}</code>
                          </div>
                          {cfg.description && (
                            <p className="text-xs text-slate-500 mt-1">{cfg.description}</p>
                          )}
                          {cfg.updated_at && (
                            <p className="text-xs text-slate-400 mt-1">
                              Diperbarui: {new Date(cfg.updated_at).toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                        <div className="sm:w-64 flex flex-col gap-2">
                          {renderEditor(cfg)}
                          {canManage && isDirty && (
                            <button
                              onClick={() => handleSave(cfg)}
                              disabled={savingId === cfg.id}
                              className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md disabled:opacity-60"
                            >
                              {savingId === cfg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Simpan
                            </button>
                          )}
                        </div>
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

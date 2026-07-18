import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Loader2, Plus, Trash2, Workflow, ArrowRight, Info, GripVertical,
  X, Settings2,
} from 'lucide-react';

interface WorkflowStepRow {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
  created_at: string;
}

interface WorkflowTemplateRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  workflow_steps?: WorkflowStepRow[];
}

interface RoleRow {
  id: string;
  name: string;
  level: number;
}

interface StepDraft {
  id: string; // local id
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('workflows', 'manage');

  const [templates, setTemplates] = useState<WorkflowTemplateRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showBuilder, setShowBuilder] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select(`
        id, name, description, is_active, created_at, updated_at,
        workflow_steps!workflow_template_id ( id, workflow_template_id, step_order, role_id, step_label, is_info_only, created_at )
      `)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat template workflow', 'error');
    } else {
      const rows = (data as unknown as WorkflowTemplateRow[]) || [];
      rows.forEach(t => {
        t.workflow_steps = (t.workflow_steps || []).sort((a, b) => a.step_order - b.step_order);
      });
      setTemplates(rows);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat role', 'error');
    } else {
      setRoles((data as unknown as RoleRow[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchRoles();
  }, [fetchTemplates, fetchRoles]);

  const roleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? 'Role tidak ditemukan';

  const openBuilder = () => {
    setTplName('');
    setTplDesc('');
    setSteps([
      { id: crypto.randomUUID(), step_order: 1, role_id: '', step_label: '', is_info_only: false },
    ]);
    setShowBuilder(true);
  };

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        step_order: prev.length + 1,
        role_id: '',
        step_label: '',
        is_info_only: false,
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev
      .filter(s => s.id !== id)
      .map((s, idx) => ({ ...s, step_order: idx + 1 })));
  };

  const updateStep = (id: string, patch: Partial<StepDraft>) => {
    setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleCreate = async () => {
    if (!tplName.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    const validSteps = steps.filter(s => s.role_id && s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Tambahkan minimal 1 step dengan role dan label', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { data: tpl, error: tplErr } = await supabase
        .from('workflow_templates')
        .insert({
          name: tplName.trim(),
          description: tplDesc.trim() || null,
          is_active: true,
        })
        .select('id')
        .single();
      if (tplErr || !tpl) {
        showToast('Gagal membuat template: ' + (tplErr?.message ?? ''), 'error');
        setSaving(false);
        return;
      }
      const tplId = (tpl as unknown as { id: string }).id;
      const stepRows = validSteps.map((s, idx) => ({
        workflow_template_id: tplId,
        step_order: idx + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
      }));
      const { error: stepErr } = await supabase.from('workflow_steps').insert(stepRows);
      if (stepErr) {
        showToast('Template dibuat tapi gagal menambah steps: ' + stepErr.message, 'error');
      } else {
        showToast('Template workflow dibuat', 'success');
        setShowBuilder(false);
        await fetchTemplates();
      }
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (tpl: WorkflowTemplateRow) => {
    setActionId(tpl.id);
    const { error } = await supabase
      .from('workflow_templates')
      .update({ is_active: !tpl.is_active, updated_at: new Date().toISOString() })
      .eq('id', tpl.id);
    if (error) {
      showToast('Gagal mengubah status', 'error');
    } else {
      showToast(`Template ${tpl.is_active ? 'dinonaktifkan' : 'diaktifkan'}`, 'success');
      await fetchTemplates();
    }
    setActionId(null);
  };

  const handleDelete = async (tpl: WorkflowTemplateRow) => {
    if (!confirm(`Hapus template "${tpl.name}" beserta semua step-nya?`)) return;
    setActionId(tpl.id);
    await supabase.from('workflow_steps').delete().eq('workflow_template_id', tpl.id);
    const { error } = await supabase.from('workflow_templates').delete().eq('id', tpl.id);
    if (error) {
      showToast('Gagal menghapus template: ' + error.message, 'error');
    } else {
      showToast('Template dihapus', 'success');
      await fetchTemplates();
    }
    setActionId(null);
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workflow Approval</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan dan urutan step-nya
          </p>
        </div>
        {canManage && (
          <button
            onClick={openBuilder}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buat Template
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada template workflow</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{tpl.name ?? ''}</h3>
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-medium',
                      tpl.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                    )}>
                      {tpl.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  {tpl.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tpl.description}</p>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(tpl)}
                      disabled={actionId === tpl.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      {actionId === tpl.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings2 className="w-3.5 h-3.5" />}
                      {tpl.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => handleDelete(tpl)}
                      disabled={actionId === tpl.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              {tpl.workflow_steps && tpl.workflow_steps.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-700">
                  {tpl.workflow_steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center">
                      <div className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium',
                        step.is_info_only
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      )}>
                        <span className="opacity-60 mr-1">{step.step_order}.</span>
                        {step.step_label ?? ''}
                        <span className="opacity-60 ml-1">· {roleName(step.role_id)}</span>
                        {step.is_info_only && <span className="ml-1 opacity-60">(info)</span>}
                      </div>
                      {idx < tpl.workflow_steps!.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mx-1" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic pt-2 border-t border-slate-100 dark:border-slate-700">
                  Belum ada step
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Buat Template Workflow</h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Nama Template *</label>
                <input
                  type="text"
                  value={tplName}
                  onChange={e => setTplName(e.target.value)}
                  placeholder="mis. Approval Peminjaman Sarana"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Deskripsi</label>
                <textarea
                  value={tplDesc}
                  onChange={e => setTplDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Step Approval</h3>
                {canManage && (
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Tambah Step
                  </button>
                )}
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Step "info only" tidak memerlukan approval, hanya menampilkan label sebagai tahap informasi.
                </p>
              </div>

              <div className="space-y-2">
                {steps.map((s, idx) => (
                  <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Step {idx + 1}</span>
                      {steps.length > 1 && (
                        <button
                          onClick={() => removeStep(s.id)}
                          className="ml-auto text-red-500 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={s.role_id}
                        onChange={e => updateStep(s.id, { role_id: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Pilih role approver...</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (Lvl {r.level})</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={s.step_label}
                        onChange={e => updateStep(s.id, { step_label: e.target.value })}
                        placeholder="Label step (mis. Verifikasi Sarpras)"
                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.is_info_only}
                        onChange={e => updateStep(s.id, { is_info_only: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Hanya informasi (tanpa approval)</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white dark:bg-slate-800">
              <button
                onClick={() => setShowBuilder(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Buat Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

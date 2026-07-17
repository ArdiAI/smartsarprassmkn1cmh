import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Workflow, Plus, Trash2, X, Loader2, RefreshCw,
  ArrowRight, Info, Power, ChevronDown, ChevronUp, GitBranch,
} from 'lucide-react';

/* ----------------------------- Types ----------------------------- */
interface WorkflowStep {
  id: string;
  template_id: string;
  step_order: number;
  step_label: string;
  role_name: string;
  is_info_only: boolean;
}
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  steps?: WorkflowStep[];
}
interface Role {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
}
interface StepDraft {
  id?: string;
  step_order: number;
  step_label: string;
  role_name: string;
  is_info_only: boolean;
}
interface TemplateForm {
  name: string;
  description: string;
  is_active: boolean;
  steps: StepDraft[];
}

const emptyForm: TemplateForm = {
  name: '',
  description: '',
  is_active: true,
  steps: [],
};

/* --------------------------- Component ---------------------------- */
export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, rolesRes] = await Promise.all([
        supabase.from('workflow_templates').select('*').order('name', { ascending: true }),
        supabase.from('roles').select('id, name, level, is_active').order('level', { ascending: true }),
      ]);
      if (tplRes.error) throw tplRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const tplList = (tplRes.data as unknown as WorkflowTemplate[]) || [];
      const roleList = (rolesRes.data as unknown as Role[]) || [];

      // Fetch steps for all templates
      if (tplList.length > 0) {
        const { data: stepsData, error: stepsErr } = await supabase
          .from('workflow_steps')
          .select('*')
          .order('step_order', { ascending: true });
        if (stepsErr) throw stepsErr;
        const steps = (stepsData as unknown as WorkflowStep[]) || [];
        tplList.forEach((t) => {
          t.steps = steps.filter((s) => s.template_id === t.id);
        });
      }
      setTemplates(tplList);
      setRoles(roleList);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load workflows';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const toggleExpand = (id: string) => setExpanded((s) => (s === id ? null : id));

  const openAdd = () => {
    setForm({
      ...emptyForm,
      steps: [
        { step_order: 1, step_label: '', role_name: '', is_info_only: false },
      ],
    });
    setShowModal(true);
  };

  const addStep = () => {
    setForm((s) => ({
      ...s,
      steps: [
        ...s.steps,
        {
          step_order: s.steps.length + 1,
          step_label: '',
          role_name: '',
          is_info_only: false,
        },
      ],
    }));
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setForm((s) => ({
      ...s,
      steps: s.steps.map((st, i) => (i === idx ? { ...st, ...patch } : st)),
    }));
  };

  const removeStep = (idx: number) => {
    setForm((s) => ({
      ...s,
      steps: s.steps
        .filter((_, i) => i !== idx)
        .map((st, i) => ({ ...st, step_order: i + 1 })),
    }));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    setForm((s) => {
      const arr = [...s.steps];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return s;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return {
        ...s,
        steps: arr.map((st, i) => ({ ...st, step_order: i + 1 })),
      };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Template name is required', 'warning');
      return;
    }
    const validSteps = form.steps.filter((s) => s.step_label.trim() && s.role_name);
    if (validSteps.length === 0) {
      showToast('Add at least one complete step', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { data: tpl, error: tplErr } = await supabase
        .from('workflow_templates')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          is_active: form.is_active,
        })
        .select('*')
        .single();
      if (tplErr) throw tplErr;
      const newTpl = tpl as unknown as WorkflowTemplate;

      const stepPayload = validSteps.map((s, i) => ({
        template_id: newTpl.id,
        step_order: i + 1,
        step_label: s.step_label.trim(),
        role_name: s.role_name,
        is_info_only: s.is_info_only,
      }));
      const { error: stepErr } = await supabase
        .from('workflow_steps')
        .insert(stepPayload);
      if (stepErr) throw stepErr;

      const { data: freshSteps } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('template_id', newTpl.id)
        .order('step_order', { ascending: true });
      newTpl.steps = (freshSteps as unknown as WorkflowStep[]) || [];

      setTemplates((prev) => [...(prev as WorkflowTemplate[]), newTpl]);
      setShowModal(false);
      showToast('Workflow template created', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create template';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tpl: WorkflowTemplate) => {
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !tpl.is_active })
        .eq('id', tpl.id);
      if (error) throw error;
      setTemplates((prev) =>
        prev.map((t) => (t.id === tpl.id ? { ...t, is_active: !t.is_active } : t))
      );
      showToast(`Template ${!tpl.is_active ? 'activated' : 'deactivated'}`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle template';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async (tpl: WorkflowTemplate) => {
    if (!confirm(`Delete workflow "${tpl.name}" and all its steps?`)) return;
    try {
      await supabase.from('workflow_steps').delete().eq('template_id', tpl.id);
      const { error } = await supabase.from('workflow_templates').delete().eq('id', tpl.id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
      showToast('Workflow deleted', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete workflow';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <Workflow className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approval Workflows</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Build multi-step approval chains
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadData()}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Template</span>
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400">
            <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No workflow templates yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((tpl) => {
              const isOpen = expanded === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => toggleExpand(tpl.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'p-2 rounded-xl flex-shrink-0',
                          tpl.is_active
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        )}
                      >
                        <Workflow className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {tpl.name}
                          </p>
                          <span
                            className={cn(
                              'text-[10px] font-medium px-2 py-0.5 rounded-md',
                              tpl.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            )}
                          >
                            {tpl.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {tpl.steps?.length ?? 0} step{(tpl.steps?.length ?? 0) !== 1 ? 's' : ''}
                          {tpl.description ? ` · ${tpl.description}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleToggleActive(tpl); }}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          tpl.is_active
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                        title={tpl.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(tpl); }}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                      {tpl.steps && tpl.steps.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2 py-2">
                          {tpl.steps.map((step, i) => (
                            <div key={step.id} className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-xl border',
                                  step.is_info_only
                                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                )}
                              >
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex-shrink-0">
                                  {step.step_order}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {step.step_label}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {step.role_name}
                                    {step.is_info_only && ' · info only'}
                                  </p>
                                </div>
                              </div>
                              {i < tpl.steps!.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 py-2">No steps defined.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Workflow Template</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Purchase Approval"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Short summary"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, is_active: !s.is_active }))}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors',
                    form.is_active ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      form.is_active && 'translate-x-5'
                    )}
                  />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
              </label>

              {/* Step builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Steps
                  </label>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add step
                  </button>
                </div>

                <div className="space-y-2">
                  {form.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                        {step.step_order}
                      </span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={step.step_label}
                          onChange={(e) => updateStep(idx, { step_label: e.target.value })}
                          placeholder="Step label"
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={step.role_name}
                          onChange={(e) => updateStep(idx, { role_name: e.target.value })}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select role…</option>
                          {roles.filter((r) => r.is_active).map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 sm:col-span-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={step.is_info_only}
                            onChange={(e) => updateStep(idx, { is_info_only: e.target.checked })}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                          />
                          <Info className="w-3.5 h-3.5 text-blue-400" />
                          Info only (no approval required)
                        </label>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveStep(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveStep(idx, 1)}
                          disabled={idx === form.steps.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeStep(idx)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0 mt-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Workflow className="w-4 h-4" />}
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

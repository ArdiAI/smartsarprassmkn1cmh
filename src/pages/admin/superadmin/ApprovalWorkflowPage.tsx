import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Workflow,
  Plus,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  ArrowRight,
  GripVertical,
  Info,
  CheckCircle2,
  Pencil,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ---- Types matching DB schema ----
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number | null;
  role_id: string | null;
  step_label: string | null;
  is_info_only: boolean | null;
  created_at: string | null;
}

interface Role {
  id: string;
  name: string;
  level: number | null;
}

interface TemplateWithSteps extends WorkflowTemplate {
  steps: WorkflowStep[];
}

interface StepDraft {
  tempId: string;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

type TemplateForm = {
  name: string;
  description: string;
  is_active: boolean;
  steps: StepDraft[];
};

const EMPTY_FORM: TemplateForm = {
  name: '',
  description: '',
  is_active: true,
  steps: [],
};

let stepCounter = 0;
const makeStepId = () => `draft-${++stepCounter}`;

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TemplateWithSteps | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, stepRes, roleRes] = await Promise.all([
        supabase.from('workflow_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('workflow_steps').select('*'),
        supabase.from('roles').select('id, name, level').order('level', { ascending: true, nullsFirst: false }),
      ]);

      if (tplRes.error) throw tplRes.error;
      if (stepRes.error) throw stepRes.error;
      if (roleRes.error) throw roleRes.error;

      const tpls = (tplRes.data ?? []) as unknown as WorkflowTemplate[];
      const steps = (stepRes.data ?? []) as unknown as WorkflowStep[];
      const rls = (roleRes.data ?? []) as unknown as Role[];

      const grouped: TemplateWithSteps[] = tpls.map(t => ({
        ...t,
        steps: steps
          .filter(s => s.workflow_template_id === t.id)
          .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0)),
      }));

      setTemplates(grouped);
      setRoles(rls);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load workflows';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, steps: [] });
    setShowModal(true);
  };

  const openEdit = (tpl: TemplateWithSteps) => {
    setEditing(tpl);
    setForm({
      name: tpl.name ?? '',
      description: tpl.description ?? '',
      is_active: tpl.is_active !== false,
      steps: tpl.steps.map(s => ({
        tempId: makeStepId(),
        role_id: s.role_id ?? '',
        step_label: s.step_label ?? '',
        is_info_only: s.is_info_only === true,
      })),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [
        ...f.steps,
        { tempId: makeStepId(), role_id: '', step_label: '', is_info_only: false },
      ],
    }));
  };

  const removeStep = (tempId: string) => {
    setForm(f => ({ ...f, steps: f.steps.filter(s => s.tempId !== tempId) }));
  };

  const updateStep = (tempId: string, patch: Partial<StepDraft>) => {
    setForm(f => ({
      ...f,
      steps: f.steps.map(s => (s.tempId === tempId ? { ...s, ...patch } : s)),
    }));
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    setForm(f => {
      const steps = [...f.steps];
      const target = index + dir;
      if (target < 0 || target >= steps.length) return f;
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...f, steps };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Template name is required', 'warning');
      return;
    }
    // Validate steps have role_id (unless info-only)
    for (const s of form.steps) {
      if (!s.is_info_only && !s.role_id) {
        showToast('Each approval step must have a role assigned', 'warning');
        return;
      }
      if (!s.step_label.trim()) {
        showToast('Each step must have a label', 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        // Update template
        const { error: tplErr } = await supabase
          .from('workflow_templates')
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);
        if (tplErr) throw tplErr;

        // Delete existing steps and re-insert (simplest reliable approach)
        const { error: delErr } = await supabase
          .from('workflow_steps')
          .delete()
          .eq('workflow_template_id', editing.id);
        if (delErr) throw delErr;

        // Insert new steps
        if (form.steps.length > 0) {
          const stepPayload = form.steps.map((s, i) => ({
            workflow_template_id: editing.id,
            step_order: i + 1,
            role_id: s.is_info_only ? null : s.role_id,
            step_label: s.step_label.trim(),
            is_info_only: s.is_info_only,
          }));
          const { error: stepErr } = await supabase.from('workflow_steps').insert(stepPayload);
          if (stepErr) throw stepErr;
        }

        showToast('Workflow updated', 'success');
      } else {
        // Create template
        const { data: newTpl, error: tplErr } = await supabase
          .from('workflow_templates')
          .insert({
            name: form.name.trim(),
            description: form.description.trim() || null,
            is_active: form.is_active,
          })
          .select()
          .single();
        if (tplErr) throw tplErr;

        const newTplId = (newTpl as unknown as WorkflowTemplate).id;

        // Insert steps
        if (form.steps.length > 0) {
          const stepPayload = form.steps.map((s, i) => ({
            workflow_template_id: newTplId,
            step_order: i + 1,
            role_id: s.is_info_only ? null : s.role_id,
            step_label: s.step_label.trim(),
            is_info_only: s.is_info_only,
          }));
          const { error: stepErr } = await supabase.from('workflow_steps').insert(stepPayload);
          if (stepErr) throw stepErr;
        }

        showToast('Workflow created', 'success');
      }
      closeModal();
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save workflow';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tpl: TemplateWithSteps) => {
    setTogglingId(tpl.id);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !tpl.is_active, updated_at: new Date().toISOString() })
        .eq('id', tpl.id);
      if (error) throw error;
      showToast(`Workflow ${!tpl.is_active ? 'activated' : 'deactivated'}`, 'success');
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle';
      showToast(msg, 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (tpl: TemplateWithSteps) => {
    if (!confirm(`Delete workflow "${tpl.name}"? This will also delete all its steps.`)) return;
    setDeletingId(tpl.id);
    try {
      // Delete steps first
      const { error: stepErr } = await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_template_id', tpl.id);
      if (stepErr) throw stepErr;

      const { error: tplErr } = await supabase.from('workflow_templates').delete().eq('id', tpl.id);
      if (tplErr) throw tplErr;

      showToast('Workflow deleted', 'success');
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete workflow';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleName = (roleId: string | null) => {
    if (!roleId) return null;
    return roles.find(r => r.id === roleId)?.name ?? 'Unknown Role';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-500" />
            Approval Workflows
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Design multi-step approval chains for requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Template
          </button>
        </div>
      </div>

      {/* Template list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Workflow className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No workflow templates yet</p>
          <p className="text-sm text-slate-400 mt-1">Create a template to define an approval chain</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(tpl => {
            const isExpanded = expandedId === tpl.id;
            return (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
              >
                {/* Template header row */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {tpl.name}
                      </h3>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          tpl.is_active !== false
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500'
                        )}
                      >
                        {tpl.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {tpl.description ?? 'No description'} · {tpl.steps.length} step
                      {tpl.steps.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(tpl)}
                      disabled={togglingId === tpl.id}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                        tpl.is_active !== false
                          ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      )}
                    >
                      {togglingId === tpl.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>{tpl.is_active !== false ? 'Deactivate' : 'Activate'}</>
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(tpl)}
                      className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tpl)}
                      disabled={deletingId === tpl.id}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === tpl.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded step chain */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700/50">
                    {tpl.steps.length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">No steps defined</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 py-4">
                        {tpl.steps.map((step, i) => (
                          <div key={step.id} className="flex items-center gap-2">
                            {i > 0 && <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                            <div
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-xl border',
                                step.is_info_only
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700'
                              )}
                            >
                              <span className="text-xs font-bold text-slate-400">
                                {step.step_order ?? i + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {step.step_label ?? 'Unnamed'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {step.is_info_only ? (
                                    <span className="flex items-center gap-1">
                                      <Info className="w-3 h-3" />
                                      Info only
                                    </span>
                                  ) : (
                                    getRoleName(step.role_id) ?? 'No role'
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-white dark:bg-slate-800 pb-3 -mx-6 px-6 border-b border-slate-100 dark:border-slate-700/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Workflow' : 'New Workflow Template'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Facility Request Approval"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What is this workflow for?"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors',
                    form.is_active ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
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

              {/* Steps builder */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Approval Steps
                  </h3>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Step
                  </button>
                </div>

                {form.steps.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    No steps yet. Add steps to build the approval chain.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.steps.map((step, i) => (
                      <div
                        key={step.tempId}
                        className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                      >
                        <div className="flex flex-col items-center gap-0.5 pt-1">
                          <button
                            onClick={() => moveStep(i, -1)}
                            disabled={i === 0}
                            className="text-slate-300 dark:text-slate-600 hover:text-blue-500 disabled:opacity-30 transition-colors"
                          >
                            <GripVertical className="w-4 h-4 rotate-180" />
                          </button>
                          <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                          <button
                            onClick={() => moveStep(i, 1)}
                            disabled={i === form.steps.length - 1}
                            className="text-slate-300 dark:text-slate-600 hover:text-blue-500 disabled:opacity-30 transition-colors"
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={step.step_label}
                            onChange={e => updateStep(step.tempId, { step_label: e.target.value })}
                            placeholder="Step label (e.g. Manager Review)"
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                          <select
                            value={step.role_id}
                            onChange={e => updateStep(step.tempId, { role_id: e.target.value })}
                            disabled={step.is_info_only}
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                          >
                            <option value="">— Select role —</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                                {r.level != null ? ` (L${r.level})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.is_info_only}
                              onChange={e => updateStep(step.tempId, { is_info_only: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              Info only
                            </span>
                          </label>
                          <button
                            onClick={() => removeStep(step.tempId)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {form.steps.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    "Info only" steps notify a role without requiring approval. They don't need a role assigned.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 sticky bottom-0 bg-white dark:bg-slate-800 pt-3 -mx-6 px-6 border-t border-slate-100 dark:border-slate-700/50">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editing ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

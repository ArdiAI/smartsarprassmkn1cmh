import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Workflow,
  Plus,
  Trash2,
  Loader2,
  X,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Circle,
  GripVertical,
} from 'lucide-react';

// ---- Types matching the schema ----
// workflow_steps uses `workflow_template_id` (NOT template_id) and `role_id` (NOT role_name)
interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number | null;
  role_id: string | null;
  step_label: string | null;
  is_info_only: boolean | null;
  created_at: string | null;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Role {
  id: string;
  name: string;
}

interface StepDraft {
  id: string; // local id for React keys
  step_order: number;
  role_id: string;
  step_label: string;
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

let stepCounter = 0;
const makeStep = (order: number): StepDraft => ({
  id: `step-${Date.now()}-${++stepCounter}`,
  step_order: order,
  role_id: '',
  step_label: '',
  is_info_only: false,
});

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [stepsByTemplate, setStepsByTemplate] = useState<Record<string, WorkflowStep[]>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat roles: ' + error.message, 'error');
      return;
    }
    setRoles((data ?? []) as unknown as Role[]);
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('id, name, description, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat workflow templates: ' + error.message, 'error');
      setLoading(false);
      return;
    }
    const tpls = (data ?? []) as unknown as WorkflowTemplate[];
    setTemplates(tpls);

    // Fetch steps for each template
    if (tpls.length === 0) {
      setStepsByTemplate({});
      setLoading(false);
      return;
    }
    const { data: stepsData, error: stepsError } = await supabase
      .from('workflow_steps')
      .select(
        'id, workflow_template_id, step_order, role_id, step_label, is_info_only, created_at'
      )
      .order('step_order', { ascending: true });
    if (stepsError) {
      showToast('Gagal memuat workflow steps: ' + stepsError.message, 'error');
      setLoading(false);
      return;
    }
    const stepsList = (stepsData ?? []) as unknown as WorkflowStep[];
    const grouped: Record<string, WorkflowStep[]> = {};
    stepsList.forEach(s => {
      const key = s.workflow_template_id;
      if (key) {
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      }
    });
    setStepsByTemplate(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchRoles();
  }, [fetchTemplates, fetchRoles]);

  const openCreate = () => {
    setForm({ ...emptyForm, steps: [makeStep(1)] });
    setShowModal(true);
  };

  const addStep = () => {
    setForm(prev => ({
      ...prev,
      steps: [...prev.steps, makeStep(prev.steps.length + 1)],
    }));
  };

  const removeStep = (id: string) => {
    setForm(prev => {
      const filtered = prev.steps.filter(s => s.id !== id);
      return {
        ...prev,
        steps: filtered.map((s, i) => ({ ...s, step_order: i + 1 })),
      };
    });
  };

  const moveStep = (index: number, dir: 'up' | 'down') => {
    setForm(prev => {
      const arr = [...prev.steps];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return {
        ...prev,
        steps: arr.map((s, i) => ({ ...s, step_order: i + 1 })),
      };
    });
  };

  const updateStep = (id: string, patch: Partial<StepDraft>) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map(s => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    if (form.steps.length === 0) {
      showToast('Tambahkan minimal satu langkah', 'warning');
      return;
    }
    for (const s of form.steps) {
      if (!s.step_label.trim()) {
        showToast('Setiap langkah harus memiliki label', 'warning');
        return;
      }
      if (!s.is_info_only && !s.role_id) {
        showToast('Langkah approval harus memiliki role', 'warning');
        return;
      }
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
      })
      .select('id')
      .single();
    if (error || !data) {
      setSaving(false);
      showToast('Gagal membuat template: ' + (error?.message ?? 'Unknown'), 'error');
      return;
    }
    const templateId = (data as unknown as { id: string }).id;

    const stepRows = form.steps.map(s => ({
      workflow_template_id: templateId,
      step_order: s.step_order,
      role_id: s.is_info_only ? null : s.role_id || null,
      step_label: s.step_label.trim(),
      is_info_only: s.is_info_only,
    }));

    const { error: stepsError } = await supabase
      .from('workflow_steps')
      .insert(stepRows);
    setSaving(false);
    if (stepsError) {
      showToast('Template dibuat, tapi gagal menambah steps: ' + stepsError.message, 'warning');
      setShowModal(false);
      fetchTemplates();
      return;
    }
    showToast('Workflow template berhasil dibuat', 'success');
    setShowModal(false);
    fetchTemplates();
  };

  const handleToggleActive = async (tpl: WorkflowTemplate) => {
    const next = !(tpl.is_active ?? false);
    const { error } = await supabase
      .from('workflow_templates')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', tpl.id);
    if (error) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
      return;
    }
    showToast(next ? 'Template diaktifkan' : 'Template dinonaktifkan', 'success');
    setTemplates(prev =>
      prev.map(t => (t.id === tpl.id ? { ...t, is_active: next } : t))
    );
  };

  const handleDelete = async (tpl: WorkflowTemplate) => {
    if (!confirm(`Hapus template "${tpl.name}" beserta semua langkahnya?`)) return;
    // Delete steps first
    const { error: stepErr } = await supabase
      .from('workflow_steps')
      .delete()
      .eq('workflow_template_id', tpl.id);
    if (stepErr) {
      showToast('Gagal menghapus steps: ' + stepErr.message, 'error');
      return;
    }
    const { error } = await supabase
      .from('workflow_templates')
      .delete()
      .eq('id', tpl.id);
    if (error) {
      showToast('Gagal menghapus template: ' + error.message, 'error');
      return;
    }
    showToast('Template dihapus', 'success');
    fetchTemplates();
  };

  const roleName = (roleId: string | null) =>
    roles.find(r => r.id === roleId)?.name ?? 'Role tidak diketahui';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-500" />
            Approval Workflow
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan dan rantai langkahnya
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 justify-center">
          <Plus className="w-4 h-4" />
          Buat Template
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card py-16 text-center text-slate-500 dark:text-slate-400">
          <Workflow className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Belum ada workflow template</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(tpl => {
            const steps = stepsByTemplate[tpl.id] ?? [];
            const isOpen = expanded === tpl.id;
            return (
              <div key={tpl.id} className="card overflow-hidden">
                <div
                  className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : tpl.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        tpl.is_active
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-slate-100 dark:bg-slate-700'
                      )}
                    >
                      <Layers
                        className={cn(
                          'w-5 h-5',
                          tpl.is_active ? 'text-blue-500' : 'text-slate-400'
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {tpl.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {tpl.description ?? 'Tidak ada deskripsi'} · {steps.length} langkah
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(tpl);
                      }}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-xs font-medium transition-colors',
                        tpl.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {tpl.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tpl);
                      }}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Hapus template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                    {steps.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                        Belum ada langkah
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {steps.map((step, idx) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30"
                          >
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                                step.is_info_only
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                              )}
                            >
                              {step.step_order ?? idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {step.step_label ?? 'Tanpa label'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                {step.is_info_only ? (
                                  <>
                                    <Info className="w-3 h-3" />
                                    <span>Info only</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{roleName(step.role_id)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {idx < steps.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                            )}
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-slate-800 -mx-6 px-6 -mt-6 pt-6 pb-3 border-b border-slate-100 dark:border-slate-700/50 z-10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Buat Workflow Template
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Nama Template</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="contoh: Approval Pengajuan Sarana"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi workflow..."
                  rows={2}
                  className="input resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>

              {/* Steps builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Langkah-langkah</label>
                  <button
                    onClick={addStep}
                    className="text-sm text-blue-500 font-medium hover:text-blue-600 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Langkah
                  </button>
                </div>

                <div className="space-y-2">
                  {form.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30"
                    >
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        <span className="text-xs font-semibold text-slate-400">
                          {step.step_order}
                        </span>
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={step.step_label}
                          onChange={e => updateStep(step.id, { step_label: e.target.value })}
                          placeholder="Label langkah"
                          className="input py-2"
                        />
                        <select
                          value={step.role_id}
                          onChange={e => updateStep(step.id, { role_id: e.target.value })}
                          disabled={step.is_info_only}
                          className="input py-2 disabled:opacity-50"
                        >
                          <option value="">Pilih role</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <label
                          className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
                          title="Langkah hanya informasi (tanpa approval)"
                        >
                          <input
                            type="checkbox"
                            checked={step.is_info_only}
                            onChange={e =>
                              updateStep(step.id, {
                                is_info_only: e.target.checked,
                                role_id: e.target.checked ? '' : step.role_id,
                              })
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                          />
                          Info
                        </label>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveStep(idx, 'down')}
                          disabled={idx === form.steps.length - 1}
                          className="p-1 rounded text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeStep(step.id)}
                        disabled={form.steps.length <= 1}
                        className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <Circle className="w-3 h-3" />
                  <span>
                    Langkah "Info only" tidak memerlukan role approver — hanya menampilkan
                    informasi dalam alur.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Buat Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

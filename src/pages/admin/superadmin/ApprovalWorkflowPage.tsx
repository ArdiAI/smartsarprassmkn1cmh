import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Workflow,
  Plus,
  Trash2,
  Loader2,
  XCircle,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Info,
  GripVertical,
  ArrowDown,
} from 'lucide-react';

// ---- Types ----
interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  step_label: string;
  role_id: string | null;
  is_info_only: boolean;
  role?: Role | null;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
  workflow_steps?: WorkflowStep[];
}

interface Role {
  id: string;
  name: string;
  level: number;
}

interface StepDraft {
  step_label: string;
  role_id: string;
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
  steps: [{ step_label: '', role_id: '', is_info_only: false }],
};

// ---- Component ----
export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, rolesRes] = await Promise.all([
        supabase
          .from('workflow_templates')
          .select(
            'id, name, description, is_active, created_at, workflow_steps:workflow_steps(id, workflow_template_id, step_order, step_label, role_id, is_info_only, role:roles(id, name, level))'
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('roles')
          .select('id, name, level')
          .eq('is_active', true)
          .order('level', { ascending: true }),
      ]);

      if (tplRes.error) throw tplRes.error;
      if (rolesRes.error) throw rolesRes.error;

      // Sort steps by step_order client-side
      const tpls = (tplRes.data ?? []) as unknown as WorkflowTemplate[];
      tpls.forEach(t => {
        if (t.workflow_steps) {
          t.workflow_steps.sort((a, b) => a.step_order - b.step_order);
        }
      });
      setTemplates(tpls);
      setRoles((rolesRes.data ?? []) as unknown as Role[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreate = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const addStep = () => {
    setForm(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        { step_label: '', role_id: '', is_info_only: false },
      ],
    }));
  };

  const removeStep = (index: number) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    setForm(prev => {
      const next = [...prev.steps];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, steps: next };
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    const validSteps = form.steps.filter(s => s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Minimal satu langkah wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      // 1. Insert template
      const { data: tplData, error: tplError } = await supabase
        .from('workflow_templates')
        .insert({
          name: form.name.trim(),
          description: form.description.trim(),
          is_active: form.is_active,
        })
        .select('id')
        .single();
      if (tplError) throw tplError;
      const templateId = (tplData as unknown as { id: string }).id;

      // 2. Insert steps
      const stepRows = validSteps.map((s, i) => ({
        workflow_template_id: templateId,
        step_order: i + 1,
        step_label: s.step_label.trim(),
        role_id: s.role_id || null,
        is_info_only: s.is_info_only,
      }));
      const { error: stepsError } = await supabase
        .from('workflow_steps')
        .insert(stepRows);
      if (stepsError) throw stepsError;

      showToast('Template workflow dibuat', 'success');
      setShowModal(false);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat template';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tpl: WorkflowTemplate) => {
    setTogglingId(tpl.id);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !tpl.is_active })
        .eq('id', tpl.id);
      if (error) throw error;
      showToast(`Template ${!tpl.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      setTemplates(prev =>
        prev.map(t => (t.id === tpl.id ? { ...t, is_active: !t.is_active } : t))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status';
      showToast(msg, 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (tpl: WorkflowTemplate) => {
    if (!confirm(`Hapus template "${tpl.name}"? Semua langkah akan ikut terhapus.`)) return;
    try {
      // Steps should cascade; delete template
      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', tpl.id);
      if (error) throw error;
      showToast('Template dihapus', 'success');
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus template';
      showToast(msg, 'error');
    }
  };

  const roleName = (roleId: string | null): string => {
    if (!roleId) return '—';
    const r = roles.find(x => x.id === roleId);
    return r ? r.name : '—';
  };

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
            Kelola template dan rangkaian langkah persetujuan
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Buat Template
        </button>
      </div>

      {/* Templates list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400">
          Belum ada template workflow
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-700">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {tpl.name}
                    </h3>
                    {tpl.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                        <ToggleRight className="w-3.5 h-3.5" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        <ToggleLeft className="w-3.5 h-3.5" />
                        Nonaktif
                      </span>
                    )}
                  </div>
                  {tpl.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {tpl.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(tpl)}
                    disabled={togglingId === tpl.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50',
                      tpl.is_active
                        ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    )}
                  >
                    {togglingId === tpl.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : tpl.is_active ? (
                      <ToggleLeft className="w-4 h-4" />
                    ) : (
                      <ToggleRight className="w-4 h-4" />
                    )}
                    {tpl.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleDelete(tpl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </button>
                </div>
              </div>

              {/* Step chain */}
              <div className="p-5">
                {tpl.workflow_steps && tpl.workflow_steps.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {tpl.workflow_steps.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <div
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm',
                            step.is_info_only
                              ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                            {step.step_order}
                          </span>
                          <span className="font-medium">{step.step_label}</span>
                          <span className="text-xs text-slate-400">
                            · {roleName(step.role_id)}
                          </span>
                          {step.is_info_only && (
                            <Info className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </div>
                        {idx < tpl.workflow_steps!.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Tidak ada langkah</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4 sticky top-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Buat Template Workflow
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="contoh: Approval Peminjaman Ruangan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Deskripsi
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Deskripsi singkat..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Steps builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Langkah-langkah <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah langkah
                  </button>
                </div>
                <div className="space-y-3">
                  {form.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30"
                    >
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={step.step_label}
                          onChange={e =>
                            updateStep(idx, { step_label: e.target.value })
                          }
                          placeholder="Label langkah (cth: Review Operator)"
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <select
                          value={step.role_id}
                          onChange={e =>
                            updateStep(idx, { role_id: e.target.value })
                          }
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="">— Pilih Role —</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} (Lv {r.level})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={step.is_info_only}
                            onChange={e =>
                              updateStep(idx, { is_info_only: e.target.checked })
                            }
                            className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                          />
                          Info only
                        </label>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveStep(idx, -1)}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                          title="Naik"
                        >
                          <GripVertical className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                          onClick={() => moveStep(idx, 1)}
                          disabled={idx === form.steps.length - 1}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                          title="Turun"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      {form.steps.length > 1 && (
                        <button
                          onClick={() => removeStep(idx)}
                          className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Hapus langkah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, is_active: !form.is_active })
                  }
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.is_active ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Template aktif
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
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

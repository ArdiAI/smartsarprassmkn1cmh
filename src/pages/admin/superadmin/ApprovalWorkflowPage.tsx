import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Workflow, Plus, Trash2, Loader2, X, ArrowRight, GripVertical,
  RefreshCw, Info, Layers, CheckCircle, XCircle,
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  steps?: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean | null;
  created_at: string | null;
  role?: { id: string; name: string } | null;
}

interface Role {
  id: string;
  name: string;
}

interface StepDraft {
  tempId: string;
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

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*, steps:workflow_steps(*, role:roles(id,name))')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat workflow', 'error');
    } else {
      const list = (data as unknown as WorkflowTemplate[]) || [];
      list.forEach(t => {
        if (t.steps) t.steps.sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
      });
      setTemplates(list);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data } = await supabase
      .from('roles')
      .select('id,name')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (data) setRoles(data as unknown as Role[]);
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchRoles();
  }, [fetchTemplates, fetchRoles]);

  const openAddModal = () => {
    setEditingTemplate(null);
    setForm({ ...emptyForm, steps: [] });
    setShowModal(true);
  };

  const openEditModal = async (template: WorkflowTemplate) => {
    setEditingTemplate(template);
    let steps: StepDraft[] = [];
    if (template.steps && template.steps.length > 0) {
      steps = template.steps.map(s => ({
        tempId: s.id,
        role_id: s.role_id ?? '',
        step_label: s.step_label ?? '',
        is_info_only: s.is_info_only ?? false,
      }));
    } else {
      const { data } = await supabase
        .from('workflow_steps')
        .select('*, role:roles(id,name)')
        .eq('workflow_template_id', template.id)
        .order('step_order', { ascending: true });
      const fetched = (data as unknown as WorkflowStep[]) || [];
      steps = fetched.map(s => ({
        tempId: s.id,
        role_id: s.role_id ?? '',
        step_label: s.step_label ?? '',
        is_info_only: s.is_info_only ?? false,
      }));
    }
    setForm({
      name: template.name ?? '',
      description: template.description ?? '',
      is_active: template.is_active ?? true,
      steps,
    });
    setShowModal(true);
  };

  const addStep = () => {
    setForm(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          tempId: `new-${Date.now()}`,
          role_id: '',
          step_label: '',
          is_info_only: false,
        },
      ],
    }));
  };

  const updateStep = (tempId: string, field: keyof StepDraft, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map(s => (s.tempId === tempId ? { ...s, [field]: value } : s)),
    }));
  };

  const removeStep = (tempId: string) => {
    setForm(prev => ({ ...prev, steps: prev.steps.filter(s => s.tempId !== tempId) }));
  };

  const moveStep = (index: number, dir: 'up' | 'down') => {
    setForm(prev => {
      const steps = [...prev.steps];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= steps.length) return prev;
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...prev, steps };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    if (form.steps.length === 0) {
      showToast('Tambahkan minimal 1 langkah', 'warning');
      return;
    }
    const invalidStep = form.steps.find(s => !s.role_id || !s.step_label.trim());
    if (invalidStep) {
      showToast('Setiap langkah harus memiliki role dan label', 'warning');
      return;
    }

    setSaving(true);
    try {
      const templatePayload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      let templateId: string;

      if (editingTemplate) {
        const { error } = await supabase
          .from('workflow_templates')
          .update(templatePayload)
          .eq('id', editingTemplate.id);
        if (error) {
          showToast('Gagal memperbarui template: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        templateId = editingTemplate.id;

        // Replace all steps
        await supabase.from('workflow_steps').delete().eq('workflow_template_id', templateId);
      } else {
        const { data, error } = await supabase
          .from('workflow_templates')
          .insert({ ...templatePayload, created_at: new Date().toISOString() })
          .select('id')
          .single();
        if (error || !data) {
          showToast('Gagal membuat template: ' + (error?.message ?? 'unknown'), 'error');
          setSaving(false);
          return;
        }
        templateId = (data as unknown as { id: string }).id;
      }

      const stepInserts = form.steps.map((s, idx) => ({
        workflow_template_id: templateId,
        step_order: idx + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
        created_at: new Date().toISOString(),
      }));

      if (stepInserts.length > 0) {
        const { error: stepError } = await supabase.from('workflow_steps').insert(stepInserts);
        if (stepError) {
          showToast('Gagal menyimpan langkah: ' + stepError.message, 'error');
          setSaving(false);
          return;
        }
      }

      showToast(editingTemplate ? 'Workflow diperbarui' : 'Workflow dibuat', 'success');
      setShowModal(false);
      fetchTemplates();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (template: WorkflowTemplate) => {
    setTogglingId(template.id);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !(template.is_active ?? false), updated_at: new Date().toISOString() })
        .eq('id', template.id);
      if (error) {
        showToast('Gagal mengubah status', 'error');
      } else {
        showToast('Status workflow diperbarui', 'success');
        fetchTemplates();
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (template: WorkflowTemplate) => {
    if (!confirm(`Hapus workflow "${template.name}"?`)) return;
    setDeletingId(template.id);
    try {
      await supabase.from('workflow_steps').delete().eq('workflow_template_id', template.id);
      const { error } = await supabase.from('workflow_templates').delete().eq('id', template.id);
      if (error) {
        showToast('Gagal menghapus workflow', 'error');
      } else {
        showToast('Workflow dihapus', 'success');
        fetchTemplates();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-7 h-7 text-blue-500" />
            Approval Workflow
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola template dan rantai langkah approval
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Template
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1" />
        <button
          onClick={fetchTemplates}
          className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada workflow</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{template.name}</h3>
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-medium',
                        template.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      )}
                    >
                      {template.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{template.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(template)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(template)}
                    disabled={togglingId === template.id}
                    className={cn(
                      'p-2 rounded-lg border transition-colors disabled:opacity-50',
                      template.is_active
                        ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20'
                    )}
                    title={template.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {togglingId === template.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : template.is_active ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    disabled={deletingId === template.id}
                    className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Hapus"
                  >
                    {deletingId === template.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {template.steps && template.steps.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  {template.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium',
                          step.is_info_only
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        )}
                      >
                        <span className="text-slate-400 mr-1">{step.step_order}.</span>
                        {step.step_label}
                        {step.is_info_only && (
                          <span className="ml-1 text-blue-400">(info)</span>
                        )}
                        {step.role && (
                          <span className="ml-1 text-slate-400">· {step.role.name}</span>
                        )}
                      </div>
                      {idx < template.steps!.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-slate-800 pb-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingTemplate ? 'Edit Workflow' : 'Buat Workflow Baru'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Nama Template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="contoh: Approval Peminjaman Ruangan"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Deskripsi workflow..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Template aktif</span>
              </label>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Langkah Approval
                  </label>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Langkah
                  </button>
                </div>

                {form.steps.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Belum ada langkah. Klik "Tambah Langkah" untuk mulai.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.steps.map((step, idx) => (
                      <div
                        key={step.tempId}
                        className="flex items-start gap-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/50"
                      >
                        <div className="flex flex-col items-center gap-0.5 pt-2">
                          <button
                            onClick={() => moveStep(idx, 'up')}
                            disabled={idx === 0}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          >
                            <GripVertical className="w-4 h-4 rotate-180" />
                          </button>
                          <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                          <button
                            onClick={() => moveStep(idx, 'down')}
                            disabled={idx === form.steps.length - 1}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={step.role_id}
                            onChange={e => updateStep(step.tempId, 'role_id', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                          >
                            <option value="">Pilih role</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={step.step_label}
                            onChange={e => updateStep(step.tempId, 'step_label', e.target.value)}
                            placeholder="Label langkah (contoh: Review Waka)"
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                          />
                          <label className="flex items-center gap-2 col-span-full cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.is_info_only}
                              onChange={e => updateStep(step.tempId, 'is_info_only', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              Hanya informasi (tidak perlu approval)
                            </span>
                          </label>
                        </div>
                        <button
                          onClick={() => removeStep(step.tempId)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6 sticky bottom-0 bg-white dark:bg-slate-800 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Workflow className="w-4 h-4" />}
                {editingTemplate ? 'Simpan' : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

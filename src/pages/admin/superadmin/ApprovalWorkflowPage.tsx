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
  Save,
  ArrowRight,
  Info,
  Eye,
  CheckCircle2,
  GripVertical,
  Power,
  Layers,
} from 'lucide-react';

// ---- Types ----

interface Role {
  id: string;
  name: string;
  level: number;
}

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  step_label: string;
  role_id: string | null;
  role_name?: string;
  is_info_only: boolean;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  steps: WorkflowStep[];
}

interface TempStep {
  step_order: number;
  step_label: string;
  role_id: string;
  is_info_only: boolean;
}

// ---- Component ----

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSteps, setFormSteps] = useState<TempStep[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, rolesRes] = await Promise.all([
        supabase
          .from('workflow_templates')
          .select(`
            *,
            steps:workflow_steps(*)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name, level').order('level', { ascending: true }),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rawTemplates = (templatesRes.data || []) as unknown as WorkflowTemplate[];
      const sortedTemplates = rawTemplates.map(t => ({
        ...t,
        steps: [...(t.steps || [])].sort((a, b) => a.step_order - b.step_order),
      }));

      setTemplates(sortedTemplates);
      setRoles((rolesRes.data || []) as unknown as Role[]);
    } catch (err) {
      console.error('Error fetching workflow templates:', err);
      showToast('Gagal memuat data workflow', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setFormName('');
    setFormDescription('');
    setFormSteps([
      { step_order: 1, step_label: '', role_id: '', is_info_only: false },
    ]);
    setShowModal(true);
  };

  const addStep = () => {
    setFormSteps(prev => [
      ...prev,
      {
        step_order: prev.length + 1,
        step_label: '',
        role_id: '',
        is_info_only: false,
      },
    ]);
  };

  const removeStep = (index: number) => {
    setFormSteps(prev =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, step_order: i + 1 }))
    );
  };

  const updateStep = (index: number, field: keyof TempStep, value: string | boolean) => {
    setFormSteps(prev =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    setFormSteps(prev => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr.map((s, i) => ({ ...s, step_order: i + 1 }));
    });
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    const validSteps = formSteps.filter(s => s.step_label.trim() && s.role_id);
    if (validSteps.length === 0) {
      showToast('Tambahkan minimal satu langkah yang valid', 'warning');
      return;
    }

    setSaving(true);
    try {
      // Insert template
      const { data: templateData, error: templateError } = await supabase
        .from('workflow_templates')
        .insert({
          name: formName.trim(),
          description: formDescription.trim(),
          is_active: true,
        })
        .select('id')
        .single();

      if (templateError) throw templateError;

      const templateId = (templateData as unknown as { id: string }).id;

      // Insert steps
      const stepsToInsert = validSteps.map((s, i) => ({
        workflow_template_id: templateId,
        step_order: i + 1,
        step_label: s.step_label.trim(),
        role_id: s.role_id,
        is_info_only: s.is_info_only,
      }));

      const { error: stepsError } = await supabase
        .from('workflow_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;

      showToast('Template workflow berhasil dibuat', 'success');
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Error saving workflow template:', err);
      showToast('Gagal membuat template workflow', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (template: WorkflowTemplate) => {
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);
      if (error) throw error;
      showToast(`Template ${!template.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      fetchData();
    } catch (err) {
      console.error('Error toggling template:', err);
      showToast('Gagal mengubah status template', 'error');
    }
  };

  const handleDelete = async (template: WorkflowTemplate) => {
    if (!confirm(`Hapus template "${template.name}"? Semua langkah akan ikut terhapus.`)) return;
    try {
      // Delete steps first
      const { error: stepsError } = await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_template_id', template.id);
      if (stepsError) throw stepsError;

      const { error: templateError } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', template.id);
      if (templateError) throw templateError;

      showToast('Template berhasil dihapus', 'success');
      fetchData();
    } catch (err) {
      console.error('Error deleting template:', err);
      showToast('Gagal menghapus template', 'error');
    }
  };

  const getRoleName = (roleId: string | null) => {
    if (!roleId) return '—';
    return roles.find(r => r.id === roleId)?.name || '—';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-500" />
            Approval Workflow
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan peminjaman
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Buat Template
        </button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada template workflow</p>
          <p className="text-sm text-slate-400 mt-1">Buat template pertama untuk alur persetujuan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Template Header */}
              <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                    template.is_active
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  )}>
                    <Layers className={cn('w-5 h-5', template.is_active ? 'text-white' : 'text-slate-400')} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white">{template.name}</h3>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                        template.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', template.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                        {template.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {template.description || 'Tidak ada deskripsi'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {template.steps.length} langkah
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(template)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      template.is_active
                        ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                    title={template.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                    title="Hapus template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Step Chain Display */}
              {template.steps.length > 0 && (
                <div className="p-5">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {template.steps.map((step, idx) => (
                      <div key={step.id} className="flex items-center flex-shrink-0">
                        <div className={cn(
                          'flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 min-w-[140px]',
                          step.is_info_only
                            ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30'
                            : 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                        )}>
                          <div className="flex items-center gap-1.5">
                            {step.is_info_only ? (
                              <Info className="w-4 h-4 text-slate-400" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="text-xs font-bold text-slate-400">
                              Step {step.step_order}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white text-center">
                            {step.step_label}
                          </p>
                          <span className={cn(
                            'px-2 py-0.5 rounded-md text-xs font-medium',
                            step.is_info_only
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          )}>
                            {getRoleName(step.role_id)}
                          </span>
                          {step.is_info_only && (
                            <span className="text-xs text-slate-400 italic">Info only</span>
                          )}
                        </div>
                        {idx < template.steps.length - 1 && (
                          <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-1 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal with Dynamic Step Builder */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Workflow className="w-5 h-5 text-blue-500" />
                Buat Template Workflow
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Template Info */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Nama Template</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="contoh: Workflow Sarpras"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Deskripsi (opsional)</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Deskripsi singkat workflow..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Step Builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Langkah-langkah Workflow
                  </label>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Langkah
                  </button>
                </div>

                <div className="space-y-3">
                  {formSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30"
                    >
                      {/* Drag handle + order */}
                      <div className="flex flex-col items-center gap-1 pt-2">
                        <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        <span className="text-xs font-bold text-slate-400 w-6 text-center">{step.step_order}</span>
                      </div>

                      {/* Step fields */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={step.step_label}
                          onChange={e => updateStep(index, 'step_label', e.target.value)}
                          placeholder="Label langkah (contoh: Review PJ)"
                          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                        <select
                          value={step.role_id}
                          onChange={e => updateStep(index, 'role_id', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                          <option value="">Pilih role...</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} (Lv. {r.level})
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
                          <button
                            type="button"
                            onClick={() => updateStep(index, 'is_info_only', !step.is_info_only)}
                            className={cn(
                              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                              step.is_info_only ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                            )}
                          >
                            <span className={cn(
                              'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                              step.is_info_only ? 'translate-x-4' : 'translate-x-1'
                            )} />
                          </button>
                          <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            Info only (tidak butuh persetujuan, hanya notifikasi)
                          </span>
                        </label>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-col gap-1 pt-2">
                        <button
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowRight className="w-4 h-4 rotate-[-90deg]" />
                        </button>
                        <button
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === formSteps.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowRight className="w-4 h-4 rotate-90" />
                        </button>
                        {formSteps.length > 1 && (
                          <button
                            onClick={() => removeStep(index)}
                            className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Preview */}
              {formSteps.filter(s => s.step_label.trim()).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Preview Alur</label>
                  <div className="flex items-center gap-2 overflow-x-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                    {formSteps.filter(s => s.step_label.trim()).map((step, idx, arr) => (
                      <div key={idx} className="flex items-center flex-shrink-0">
                        <div className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                          step.is_info_only
                            ? 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        )}>
                          {step.is_info_only ? <Info className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {step.step_label}
                        </div>
                        {idx < arr.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-1" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Buat Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

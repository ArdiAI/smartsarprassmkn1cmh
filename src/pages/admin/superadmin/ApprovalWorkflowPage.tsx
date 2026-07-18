import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Plus, Trash2, Loader2, Workflow, Pencil, Check, X, ArrowRight, Info, GripVertical,
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string;
  step_label: string;
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
  steps?: WorkflowStep[];
}

interface Role {
  id: string;
  name: string;
  level: number | null;
}

interface DraftStep {
  step_label: string;
  role_id: string;
  is_info_only: boolean;
}

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('workflows', 'manage');

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat workflow templates', 'error');
      setLoading(false);
      return;
    }
    const tmpl = (data as unknown as WorkflowTemplate[]) || [];
    const withSteps = await Promise.all(
      tmpl.map(async t => {
        const { data: stepsData } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('workflow_template_id', t.id)
          .order('step_order', { ascending: true });
        return { ...t, steps: (stepsData as unknown as WorkflowStep[]) || [] };
      })
    );
    setTemplates(withSteps);
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat data role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchRoles();
  }, [fetchTemplates, fetchRoles]);

  const roleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? 'Role tidak dikenal';

  const openCreate = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormDescription('');
    setFormIsActive(true);
    setDraftSteps([{ step_label: '', role_id: '', is_info_only: false }]);
    setShowModal(true);
  };

  const openEdit = (template: WorkflowTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description ?? '');
    setFormIsActive(template.is_active ?? true);
    setDraftSteps(
      (template.steps ?? []).map(s => ({
        step_label: s.step_label,
        role_id: s.role_id,
        is_info_only: s.is_info_only ?? false,
      }))
    );
    setShowModal(true);
  };

  const addDraftStep = () => {
    setDraftSteps(prev => [...prev, { step_label: '', role_id: '', is_info_only: false }]);
  };

  const removeDraftStep = (idx: number) => {
    setDraftSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const updateDraftStep = (idx: number, field: keyof DraftStep, value: string | boolean) => {
    setDraftSteps(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => {
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengelola workflow', 'error');
      return;
    }
    if (!formName.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    const validSteps = draftSteps.filter(s => s.step_label.trim() && s.role_id);
    if (validSteps.length === 0) {
      showToast('Minimal satu step dengan label dan role wajib diisi', 'warning');
      return;
    }
    setActionLoading('save');
    try {
      if (editingTemplate) {
        const { error: updateError } = await supabase
          .from('workflow_templates')
          .update({
            name: formName.trim(),
            description: formDescription.trim() || null,
            is_active: formIsActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);
        if (updateError) {
          showToast(`Gagal mengubah template: ${updateError.message}`, 'error');
          setActionLoading(null);
          return;
        }

        await supabase.from('workflow_steps').delete().eq('workflow_template_id', editingTemplate.id);
        const stepRows = validSteps.map((s, i) => ({
          workflow_template_id: editingTemplate.id,
          step_order: i + 1,
          role_id: s.role_id,
          step_label: s.step_label.trim(),
          is_info_only: s.is_info_only,
        }));
        const { error: stepsError } = await supabase.from('workflow_steps').insert(stepRows);
        if (stepsError) {
          showToast(`Gagal menyimpan steps: ${stepsError.message}`, 'error');
        } else {
          showToast('Workflow berhasil diperbarui', 'success');
          setShowModal(false);
          await fetchTemplates();
        }
      } else {
        const { data: newTemplate, error: insertError } = await supabase
          .from('workflow_templates')
          .insert({
            name: formName.trim(),
            description: formDescription.trim() || null,
            is_active: formIsActive,
          })
          .select()
          .single();
        if (insertError || !newTemplate) {
          showToast(`Gagal membuat template: ${insertError?.message ?? 'unknown'}`, 'error');
          setActionLoading(null);
          return;
        }
        const created = newTemplate as unknown as WorkflowTemplate;
        const stepRows = validSteps.map((s, i) => ({
          workflow_template_id: created.id,
          step_order: i + 1,
          role_id: s.role_id,
          step_label: s.step_label.trim(),
          is_info_only: s.is_info_only,
        }));
        const { error: stepsError } = await supabase.from('workflow_steps').insert(stepRows);
        if (stepsError) {
          showToast(`Gagal menyimpan steps: ${stepsError.message}`, 'error');
        } else {
          showToast('Workflow berhasil dibuat', 'success');
          setShowModal(false);
          await fetchTemplates();
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (template: WorkflowTemplate) => {
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengelola workflow', 'error');
      return;
    }
    setActionLoading(`toggle-${template.id}`);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !template.is_active, updated_at: new Date().toISOString() })
        .eq('id', template.id);
      if (error) {
        showToast(`Gagal mengubah status: ${error.message}`, 'error');
      } else {
        showToast('Status workflow diperbarui', 'success');
        await fetchTemplates();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (template: WorkflowTemplate) => {
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengelola workflow', 'error');
      return;
    }
    if (!confirm(`Hapus workflow "${template.name}"? Semua step akan ikut terhapus.`)) return;
    setActionLoading(`del-${template.id}`);
    try {
      await supabase.from('workflow_steps').delete().eq('workflow_template_id', template.id);
      const { error } = await supabase.from('workflow_templates').delete().eq('id', template.id);
      if (error) {
        showToast(`Gagal menghapus workflow: ${error.message}`, 'error');
      } else {
        showToast('Workflow berhasil dihapus', 'success');
        await fetchTemplates();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-500" /> Approval Workflow
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Buat Workflow
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada workflow</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(template => (
            <div key={template.id} className="card p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-3 flex-wrap">
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
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(template)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(template)}
                      disabled={actionLoading === `toggle-${template.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === `toggle-${template.id}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : template.is_active ? (
                        <X className="w-3.5 h-3.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      {template.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      disabled={actionLoading === `del-${template.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === `del-${template.id}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              {template.steps && template.steps.length > 0 && (
                <div className="mt-4 flex items-center gap-1 flex-wrap">
                  {template.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium',
                          step.is_info_only
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        )}
                      >
                        <span className="opacity-60 mr-1">{step.step_order}.</span>
                        {step.step_label}
                        <span className="opacity-60 ml-1">· {roleName(step.role_id)}</span>
                        {step.is_info_only && <span className="ml-1 opacity-60">(info)</span>}
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingTemplate ? 'Edit Workflow' : 'Buat Workflow'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="contoh: Approval Peminjaman Barang"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Deskripsi workflow..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Template aktif</span>
              </label>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Steps Workflow
                  </label>
                  <button
                    onClick={addDraftStep}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Step
                  </button>
                </div>
                <div className="space-y-2">
                  {draftSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 flex-shrink-0 pt-2">
                        <GripVertical className="w-4 h-4 text-slate-300" />
                        <span className="text-sm font-medium text-slate-500 w-5">{idx + 1}</span>
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={step.step_label}
                          onChange={e => updateDraftStep(idx, 'step_label', e.target.value)}
                          placeholder="Label step (contoh: Review Kepala Lab)"
                          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <select
                          value={step.role_id}
                          onChange={e => updateDraftStep(idx, 'role_id', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="">Pilih role</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name}{r.level != null ? ` (Lvl ${r.level})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 cursor-pointer whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={step.is_info_only}
                            onChange={e => updateDraftStep(idx, 'is_info_only', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-blue-500 focus:ring-blue-500"
                          />
                          Info only
                        </label>
                        {draftSteps.length > 1 && (
                          <button
                            onClick={() => removeDraftStep(idx)}
                            className="text-red-500 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    "Info only" berarti step hanya untuk notifikasi/informasi, tidak memerlukan approval.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading === 'save'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

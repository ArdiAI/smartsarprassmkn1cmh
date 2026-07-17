import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Workflow,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
  ArrowRight,
  Info,
  GripVertical,
  CheckCircle2,
  Circle,
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean | null;
  created_at: string | null;
}

interface Role {
  id: string;
  name: string;
}

interface TemplateWithSteps extends WorkflowTemplate {
  steps: WorkflowStep[];
}

interface StepDraft {
  id: string;
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

const makeStep = (): StepDraft => ({
  id: Math.random().toString(36).slice(2),
  role_id: '',
  step_label: '',
  is_info_only: false,
});

const emptyForm: TemplateForm = {
  name: '',
  description: '',
  is_active: true,
  steps: [makeStep()],
};

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WorkflowTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [tplRes, stepRes, roleRes] = await Promise.all([
      supabase.from('workflow_templates').select('*').order('created_at', { ascending: false }),
      supabase.from('workflow_steps').select('*').order('step_order', { ascending: true }),
      supabase.from('roles').select('id, name').eq('is_active', true).order('name', { ascending: true }),
    ]);

    if (tplRes.error) {
      showToast('Gagal memuat templates: ' + tplRes.error.message, 'error');
      setLoading(false);
      return;
    }
    if (stepRes.error) {
      showToast('Gagal memuat steps: ' + stepRes.error.message, 'error');
    }
    if (roleRes.error) {
      showToast('Gagal memuat roles: ' + roleRes.error.message, 'error');
    }

    const tplList = (tplRes.data ?? []) as unknown as WorkflowTemplate[];
    const stepList = (stepRes.data ?? []) as unknown as WorkflowStep[];
    const roleList = (roleRes.data ?? []) as unknown as Role[];
    setRoles(roleList);

    const stepsByTemplate = new Map<string, WorkflowStep[]>();
    for (const s of stepList) {
      const arr = stepsByTemplate.get(s.workflow_template_id) ?? [];
      arr.push(s);
      stepsByTemplate.set(s.workflow_template_id, arr);
    }

    setTemplates(
      tplList.map(t => ({
        ...t,
        steps: stepsByTemplate.get(t.id) ?? [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, steps: [makeStep()] });
    setShowModal(true);
  };

  const openEdit = (tpl: TemplateWithSteps) => {
    setEditing(tpl);
    setForm({
      name: tpl.name ?? '',
      description: tpl.description ?? '',
      is_active: tpl.is_active ?? true,
      steps:
        tpl.steps.length > 0
          ? tpl.steps.map(s => ({
              id: s.id,
              role_id: s.role_id,
              step_label: s.step_label ?? '',
              is_info_only: s.is_info_only ?? false,
            }))
          : [makeStep()],
    });
    setShowModal(true);
  };

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, makeStep()] }));
  const removeStep = (id: string) =>
    setForm(f => ({ ...f, steps: f.steps.length > 1 ? f.steps.filter(s => s.id !== id) : f.steps }));
  const updateStep = (id: string, patch: Partial<StepDraft>) =>
    setForm(f => ({ ...f, steps: f.steps.map(s => (s.id === id ? { ...s, ...patch } : s)) }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    const validSteps = form.steps.filter(s => s.role_id && s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Minimal satu step dengan role dan label harus diisi', 'warning');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      let templateId = editing?.id ?? '';

      if (editing) {
        const { error } = await supabase.from('workflow_templates').update(payload).eq('id', templateId);
        if (error) throw error;
        await supabase.from('workflow_steps').delete().eq('workflow_template_id', templateId);
      } else {
        const insertPayload = { ...payload, created_at: new Date().toISOString() };
        const { data, error } = await supabase
          .from('workflow_templates')
          .insert(insertPayload)
          .select('id')
          .single();
        if (error) throw error;
        templateId = (data as unknown as { id: string }).id;
      }

      const stepRows = validSteps.map((s, idx) => ({
        workflow_template_id: templateId,
        step_order: idx + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
        created_at: new Date().toISOString(),
      }));

      const { error: stepErr } = await supabase.from('workflow_steps').insert(stepRows);
      if (stepErr) throw stepErr;

      showToast(editing ? 'Template diperbarui' : 'Template dibuat', 'success');
      setShowModal(false);
      fetchAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast('Gagal menyimpan: ' + msg, 'error');
    }
    setSaving(false);
  };

  const handleToggleActive = async (tpl: WorkflowTemplate) => {
    const next = !(tpl.is_active ?? false);
    const { error } = await supabase
      .from('workflow_templates')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', tpl.id);
    if (error) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
    } else {
      showToast('Status diperbarui', 'success');
      setTemplates(prev => prev.map(t => (t.id === tpl.id ? { ...t, is_active: next } : t)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus template ini? Semua step akan ikut terhapus.')) return;
    await supabase.from('workflow_steps').delete().eq('workflow_template_id', id);
    const { error } = await supabase.from('workflow_templates').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
    } else {
      showToast('Template dihapus', 'success');
      fetchAll();
    }
  };

  const roleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-500" />
            Approval Workflow
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan dan rantai step-nya
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Belum ada template workflow
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{tpl.name}</h3>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        tpl.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      )}
                    >
                      {tpl.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  {tpl.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tpl.description}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(tpl)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      tpl.is_active
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                    )}
                  >
                    {tpl.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => openEdit(tpl)}
                    className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {tpl.steps.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">Belum ada step</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {tpl.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
                          step.is_info_only
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        )}
                      >
                        {step.is_info_only ? (
                          <Info className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span className="text-xs font-medium text-slate-400">#{step.step_order}</span>
                        <span>{step.step_label}</span>
                        <span className="text-xs opacity-70">({roleName(step.role_id)})</span>
                      </div>
                      {idx < tpl.steps.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sticky top-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Template' : 'Buat Template Workflow'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Template
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="mis. Approval Fasilitas Standar"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi alur"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Step Alur
                  </label>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Step
                  </button>
                </div>
                <div className="space-y-2">
                  {form.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-1 text-slate-400 flex-shrink-0">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-xs font-medium">{idx + 1}</span>
                      </div>
                      <select
                        value={step.role_id}
                        onChange={e => updateStep(step.id, { role_id: e.target.value })}
                        className="flex-1 px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Pilih Role</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={step.step_label}
                        onChange={e => updateStep(step.id, { step_label: e.target.value })}
                        placeholder="Label step"
                        className="flex-1 px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={step.is_info_only}
                          onChange={e => updateStep(step.id, { is_info_only: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Info</span>
                      </label>
                      <button
                        onClick={() => removeStep(step.id)}
                        disabled={form.steps.length === 1}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Step "Info Only" hanya menampilkan informasi tanpa memerlukan persetujuan
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

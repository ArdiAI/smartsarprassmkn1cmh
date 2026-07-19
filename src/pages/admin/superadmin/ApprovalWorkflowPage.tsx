import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Workflow, X, GripVertical, ArrowRight, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../utils/cn';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
  created_at: string;
  role?: { name: string } | null;
}

interface Role {
  id: string;
  name: string;
}

interface StepDraft {
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('workflows', 'manage');

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [stepsByTemplate, setStepsByTemplate] = useState<Record<string, WorkflowStep[]>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
      return;
    }
    setRoles((data ?? []) as unknown as Role[]);
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('id, name, description, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      setLoading(false);
      showToast('Gagal memuat workflow templates', 'error');
      return;
    }
    const rows = (data ?? []) as unknown as WorkflowTemplate[];
    setTemplates(rows);

    if (rows.length > 0) {
      const { data: stepData, error: stepErr } = await supabase
        .from('workflow_steps')
        .select('id, workflow_template_id, step_order, role_id, step_label, is_info_only, created_at, role:roles(name)')
        .in(
          'workflow_template_id',
          rows.map((t) => t.id),
        )
        .order('step_order', { ascending: true });
      setLoading(false);
      if (stepErr) {
        showToast('Gagal memuat workflow steps', 'error');
        return;
      }
      const grouped: Record<string, WorkflowStep[]> = {};
      (stepData ?? []).forEach((s) => {
        const step = s as unknown as WorkflowStep;
        if (!grouped[step.workflow_template_id]) grouped[step.workflow_template_id] = [];
        grouped[step.workflow_template_id].push(step);
      });
      setStepsByTemplate(grouped);
    } else {
      setLoading(false);
      setStepsByTemplate({});
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    loadRoles();
  }, [loadTemplates, loadRoles]);

  const openCreate = () => {
    setName('');
    setDescription('');
    setSteps([{ role_id: '', step_label: '', is_info_only: false }]);
    setShowModal(true);
  };

  const addStep = () => {
    setSteps([...steps, { role_id: '', step_label: '', is_info_only: false }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setSteps(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast('Nama workflow wajib diisi', 'warning');
      return;
    }
    const validSteps = steps.filter((s) => s.role_id && s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Minimal satu langkah valid diperlukan', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { data: tpl, error: tplErr } = await supabase
        .from('workflow_templates')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          is_active: true,
        })
        .select('id')
        .single();
      if (tplErr) throw tplErr;
      const newTpl = tpl as unknown as { id: string };

      const stepInserts = validSteps.map((s, i) => ({
        workflow_template_id: newTpl.id,
        step_order: i + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
      }));
      const { error: stepErr } = await supabase.from('workflow_steps').insert(stepInserts);
      if (stepErr) throw stepErr;

      showToast('Workflow berhasil dibuat', 'success');
      await loadTemplates();
      setShowModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat workflow';
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
      showToast(tpl.is_active ? 'Workflow dinonaktifkan' : 'Workflow diaktifkan', 'success');
      await loadTemplates();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status';
      showToast(msg, 'error');
    }
  };

  const handleDelete = async (tpl: WorkflowTemplate) => {
    if (!confirm(`Hapus workflow "${tpl.name}" beserta langkah-langkahnya?`)) return;
    try {
      const { error: stepErr } = await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_template_id', tpl.id);
      if (stepErr) throw stepErr;
      const { error: tplErr } = await supabase.from('workflow_templates').delete().eq('id', tpl.id);
      if (tplErr) throw tplErr;
      showToast('Workflow berhasil dihapus', 'success');
      await loadTemplates();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus workflow';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Approval Workflow</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola template alur persetujuan dan rantai langkahnya.
          </p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Buat Workflow
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Memuat...</p>
      ) : templates.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">Belum ada workflow template.</div>
      ) : (
        <div className="space-y-4">
          {templates.map((tpl) => {
            const tSteps = stepsByTemplate[tpl.id] ?? [];
            return (
              <div key={tpl.id} className="card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                      <Workflow className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{tpl.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {tpl.description ?? '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        tpl.is_active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                      )}
                    >
                      {tpl.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    {canManage && (
                      <>
                        <button
                          onClick={() => handleToggleActive(tpl)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          {tpl.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          onClick={() => handleDelete(tpl)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          aria-label="Hapus workflow"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {tSteps.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {tSteps.map((s, idx) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                            s.is_info_only
                              ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300'
                              : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                          )}
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{s.step_label}</span>
                          <span className="text-xs text-slate-400">
                            {s.role?.name ?? '-'}
                          </span>
                          {s.is_info_only && (
                            <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                              info
                            </span>
                          )}
                        </div>
                        {idx < tSteps.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-400">Belum ada langkah pada workflow ini.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Buat Workflow</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Nama Workflow</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="contoh: Persetujuan Peminjaman"
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  rows={2}
                  placeholder="Deskripsi workflow (opsional)"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="label mb-0">Langkah-langkah</label>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Langkah
                  </button>
                </div>

                <div className="space-y-3">
                  {steps.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2 pt-2">
                        <GripVertical className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                          {i + 1}
                        </span>
                      </div>
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label">Label Langkah</label>
                          <input
                            type="text"
                            value={s.step_label}
                            onChange={(e) => updateStep(i, { step_label: e.target.value })}
                            className="input"
                            placeholder="contoh: Review Pengajuan"
                          />
                        </div>
                        <div>
                          <label className="label">Role Approver</label>
                          <select
                            value={s.role_id}
                            onChange={(e) => updateStep(i, { role_id: e.target.value })}
                            className="input"
                          >
                            <option value="">Pilih role...</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={s.is_info_only}
                            onChange={(e) => updateStep(i, { is_info_only: e.target.checked })}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          Info only
                        </label>
                        {steps.length > 1 && (
                          <button
                            onClick={() => removeStep(i)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            aria-label="Hapus langkah"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <Info className="h-3.5 w-3.5" />
                  Langkah dengan "Info only" hanya menampilkan informasi tanpa memerlukan persetujuan.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Batal
              </button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : 'Buat Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

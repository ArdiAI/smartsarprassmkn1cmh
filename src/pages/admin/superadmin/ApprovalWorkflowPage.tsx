import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, X, Workflow as WorkflowIcon, ArrowRight, Info } from 'lucide-react';
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
}

interface Role {
  id: string;
  name: string;
}

interface TemplateWithSteps extends WorkflowTemplate {
  workflow_steps?: WorkflowStep[];
}

interface StepDraft {
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const canManage = hasPermission('workflows', 'manage');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, rolesRes] = await Promise.all([
        supabase
          .from('workflow_templates')
          .select('*, workflow_steps(*)')
          .order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name').eq('is_active', true).order('name'),
      ]);
      if (tplRes.error) throw tplRes.error;
      if (rolesRes.error) throw rolesRes.error;
      // sort steps per template
      const data = (tplRes.data ?? []) as unknown as TemplateWithSteps[];
      data.forEach((t) => {
        if (t.workflow_steps) {
          t.workflow_steps.sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
        }
      });
      setTemplates(data);
      setRoles((rolesRes.data ?? []) as unknown as Role[]);
    } catch (e) {
      showToast('Gagal memuat workflow', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSteps([]);
    setShowModal(false);
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { step_order: prev.length + 1, role_id: '', step_label: '', is_info_only: false },
    ]);
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    if (steps.length === 0) {
      showToast('Tambahkan minimal 1 langkah', 'warning');
      return;
    }
    const invalidStep = steps.find((s) => !s.role_id || !s.step_label.trim());
    if (invalidStep) {
      showToast('Setiap langkah wajib memiliki role dan label', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { data: tpl, error: tplErr } = await supabase
        .from('workflow_templates')
        .insert({ name: name.trim(), description: description.trim() || null, is_active: true })
        .select()
        .single();
      if (tplErr) throw tplErr;
      const tplRow = tpl as unknown as WorkflowTemplate;

      const stepRows = steps.map((s, i) => ({
        workflow_template_id: tplRow.id,
        step_order: i + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
      }));
      const { error: stepsErr } = await supabase.from('workflow_steps').insert(stepRows);
      if (stepsErr) throw stepsErr;

      showToast('Workflow dibuat', 'success');
      resetForm();
      await loadData();
    } catch (e) {
      showToast('Gagal membuat workflow: ' + (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: TemplateWithSteps) => {
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !t.is_active })
        .eq('id', t.id);
      if (error) throw error;
      showToast(t.is_active ? 'Workflow dinonaktifkan' : 'Workflow diaktifkan', 'success');
      await loadData();
    } catch (e) {
      showToast('Gagal mengubah status: ' + (e as Error).message, 'error');
    }
  };

  const handleDelete = async (t: TemplateWithSteps) => {
    if (!confirm(`Hapus workflow "${t.name}"?`)) return;
    try {
      const { error: sErr } = await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_template_id', t.id);
      if (sErr) throw sErr;
      const { error } = await supabase.from('workflow_templates').delete().eq('id', t.id);
      if (error) throw error;
      showToast('Workflow dihapus', 'success');
      await loadData();
    } catch (e) {
      showToast('Gagal menghapus: ' + (e as Error).message, 'error');
    }
  };

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workflow Persetujuan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola template & rantai langkah persetujuan</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Buat Workflow
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Memuat…
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate--800 dark:bg-slate-900">
          Belum ada workflow.
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                    <WorkflowIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{t.name ?? ''}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.description ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      t.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                    )}
                  >
                    {t.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleToggle(t)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:hover:bg-brand-900/20"
                      >
                        {t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="inline-flex items-center gap-1 rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(t.workflow_steps ?? []).length === 0 ? (
                  <span className="text-xs text-slate-400">Tidak ada langkah.</span>
                ) : (
                  (t.workflow_steps ?? []).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div
                        className={cn(
                          'rounded-xl border px-3 py-1.5 text-xs',
                          s.is_info_only
                            ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800/40 dark:bg-brand-900/20 dark:text-brand-300',
                        )}
                      >
                        <span className="font-semibold">{s.step_order}.</span> {s.step_label ?? ''}
                        <span className="ml-1 opacity-60">({roleName(s.role_id)})</span>
                        {s.is_info_only && <span className="ml-1 opacity-60">· info</span>}
                      </div>
                      {i < (t.workflow_steps ?? []).length - 1 && (
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Buat Workflow</h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Nama *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Deskripsi</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Langkah</label>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Plus className="h-3 w-3" /> Tambah
                  </button>
                </div>
                <div className="space-y-2">
                  {steps.length === 0 && (
                    <div className="flex items-start gap-2 rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400 dark:border-slate-700">
                      <Info className="mt-0.5 h-3.5 w-3.5" />
                      Belum ada langkah. Klik "Tambah" untuk menambah langkah.
                    </div>
                  )}
                  {steps.map((s, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Langkah {i + 1}</span>
                        <button
                          onClick={() => removeStep(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={s.role_id}
                          onChange={(e) => updateStep(i, { role_id: e.target.value })}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="">— role —</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name ?? ''}
                            </option>
                          ))}
                        </select>
                        <input
                          value={s.step_label}
                          onChange={(e) => updateStep(i, { step_label: e.target.value })}
                          placeholder="Label langkah"
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={s.is_info_only}
                          onChange={(e) => updateStep(i, { is_info_only: e.target.checked })}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        Hanya informasi (tanpa persetujuan)
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

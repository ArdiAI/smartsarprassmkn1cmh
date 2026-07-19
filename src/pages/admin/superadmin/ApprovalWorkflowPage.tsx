import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Workflow,
  Plus,
  Trash2,
  X,
  Loader2,
  ChevronRight,
  ArrowDown,
  Info,
  Eye,
} from 'lucide-react';

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
}

interface Role {
  id: string;
  name: string;
  level: number;
}

interface TemplateWithSteps extends WorkflowTemplate {
  workflow_steps: WorkflowStep[];
}

interface StepDraft {
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('workflows', 'manage');

  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, roleRes] = await Promise.all([
        supabase
          .from('workflow_templates')
          .select('id, name, description, is_active, created_at, workflow_steps(*)')
          .order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name, level').eq('is_active', true).order('level', { ascending: false }),
      ]);
      if (tplRes.error) throw tplRes.error;
      if (roleRes.error) throw roleRes.error;
      setTemplates((tplRes.data ?? []) as unknown as TemplateWithSteps[]);
      setRoles((roleRes.data ?? []) as unknown as Role[]);
    } catch {
      showToast('Gagal memuat data workflow', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        step_order: prev.length + 1,
        role_id: '',
        step_label: '',
        is_info_only: false,
      },
    ]);
  };

  const updateStep = (index: number, field: keyof StepDraft, value: string | boolean) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeStep = (index: number) => {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, step_order: i + 1 }))
    );
  };

  const handleSave = async () => {
    if (!tplName.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    if (steps.length === 0) {
      showToast('Tambahkan minimal satu langkah', 'warning');
      return;
    }
    for (const s of steps) {
      if (!s.role_id || !s.step_label.trim()) {
        showToast('Setiap langkah harus memiliki role dan label', 'warning');
        return;
      }
    }
    setSaving(true);
    try {
      const { data: tpl, error: tplErr } = await supabase
        .from('workflow_templates')
        .insert({
          name: tplName.trim(),
          description: tplDesc.trim() || null,
          is_active: true,
        })
        .select('id')
        .single();
      if (tplErr) throw tplErr;

      const stepRows = steps.map((s, i) => ({
        workflow_template_id: tpl.id,
        step_order: i + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
      }));

      const { error: stepErr } = await supabase.from('workflow_steps').insert(stepRows);
      if (stepErr) throw stepErr;

      showToast('Template workflow berhasil dibuat', 'success');
      setShowModal(false);
      setTplName('');
      setTplDesc('');
      setSteps([]);
      fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat workflow';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: WorkflowTemplate) => {
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !t.is_active, updated_at: new Date().toISOString() })
        .eq('id', t.id);
      if (error) throw error;
      showToast(t.is_active ? 'Template dinonaktifkan' : 'Template diaktifkan', 'success');
      fetchData();
    } catch {
      showToast('Gagal mengubah status template', 'error');
    }
  };

  const handleDelete = async (t: WorkflowTemplate) => {
    if (!confirm(`Hapus template "${t.name}"? Semua langkah akan ikut terhapus.`)) return;
    try {
      // Delete steps first
      const { error: stepErr } = await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_template_id', t.id);
      if (stepErr) throw stepErr;

      const { error } = await supabase.from('workflow_templates').delete().eq('id', t.id);
      if (error) throw error;
      showToast('Template berhasil dihapus', 'success');
      fetchData();
    } catch {
      showToast('Gagal menghapus template', 'error');
    }
  };

  const roleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? 'Role tidak ditemukan';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approval Workflow</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola template alur persetujuan
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Template
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <Workflow className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Belum ada template workflow</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{t.name}</h3>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        t.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      )}
                    >
                      {t.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t.description ?? 'Tanpa deskripsi'}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(t)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      {t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              {t.workflow_steps && t.workflow_steps.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {[...t.workflow_steps]
                    .sort((a, b) => a.step_order - b.step_order)
                    .map((step, i, arr) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <div
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium',
                            step.is_info_only
                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                              : 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                          )}
                        >
                          {step.is_info_only && <Eye className="h-3 w-3" />}
                          <span className="text-slate-500 dark:text-slate-400">#{step.step_order}</span>
                          <span>{step.step_label}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 dark:text-slate-400">{roleName(step.role_id)}</span>
                        </div>
                        {i < arr.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300" />}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Template Workflow</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Template</label>
                <input
                  type="text"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="Contoh: Approval Pengajuan Barang"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi</label>
                <textarea
                  value={tplDesc}
                  onChange={(e) => setTplDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="Deskripsi singkat workflow"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Langkah-langkah</label>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Langkah
                  </button>
                </div>

                {steps.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400 dark:border-slate-600">
                    <Info className="h-4 w-4" />
                    Belum ada langkah. Klik "Tambah Langkah" untuk mulai.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {steps.map((s, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/50">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Langkah {i + 1}</span>
                          <button
                            onClick={() => removeStep(i)}
                            className="ml-auto text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <label className="mb-0.5 block text-xs text-slate-500 dark:text-slate-400">Role Approver</label>
                            <select
                              value={s.role_id}
                              onChange={(e) => updateStep(i, 'role_id', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                            >
                              <option value="">Pilih role...</option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} (Level {r.level})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-0.5 block text-xs text-slate-500 dark:text-slate-400">Label Langkah</label>
                            <input
                              type="text"
                              value={s.step_label}
                              onChange={(e) => updateStep(i, 'step_label', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                              placeholder="Contoh: Review oleh Kepala"
                            />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`info-only-${i}`}
                            checked={s.is_info_only}
                            onChange={(e) => updateStep(i, 'is_info_only', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          <label htmlFor={`info-only-${i}`} className="text-xs text-slate-600 dark:text-slate-400">
                            Hanya informasi (tidak perlu approval)
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

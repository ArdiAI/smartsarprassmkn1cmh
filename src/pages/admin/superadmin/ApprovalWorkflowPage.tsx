import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Workflow, Plus, Trash2, Loader2, X, ArrowRight, Settings2,
  ToggleLeft, ToggleRight, Info, GripVertical,
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
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
  level: number;
  is_active: boolean;
}

interface StepDraft {
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

const emptyTemplate = {
  name: '',
  description: '',
  is_active: true,
};

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('workflows', 'manage');

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [stepsByTemplate, setStepsByTemplate] = useState<Record<string, WorkflowStep[]>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState(emptyTemplate);
  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('id, name, description, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat workflow templates', 'error');
      setLoading(false);
      return;
    }
    const tpls = (data as unknown as WorkflowTemplate[]) || [];
    setTemplates(tpls);

    // Fetch all steps for these templates
    if (tpls.length === 0) {
      setStepsByTemplate({});
      setLoading(false);
      return;
    }
    const { data: stepsData, error: stepsErr } = await supabase
      .from('workflow_steps')
      .select('id, workflow_template_id, step_order, role_id, step_label, is_info_only, created_at')
      .order('step_order', { ascending: true });
    if (stepsErr) {
      showToast('Gagal memuat langkah workflow', 'error');
      setLoading(false);
      return;
    }
    const steps = (stepsData as unknown as WorkflowStep[]) || [];
    const grouped: Record<string, WorkflowStep[]> = {};
    for (const s of steps) {
      if (!grouped[s.workflow_template_id]) grouped[s.workflow_template_id] = [];
      grouped[s.workflow_template_id].push(s);
    }
    setStepsByTemplate(grouped);
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level, is_active')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
      return;
    }
    setRoles((data as unknown as Role[]) || []);
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchRoles();
  }, [fetchTemplates, fetchRoles]);

  const getRoleName = (roleId: string): string => {
    const r = roles.find(x => x.id === roleId);
    return r?.name ?? '—';
  };

  const addStep = () => {
    setStepDrafts([
      ...stepDrafts,
      {
        step_order: stepDrafts.length + 1,
        role_id: '',
        step_label: '',
        is_info_only: false,
      },
    ]);
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setStepDrafts(stepDrafts.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeStep = (idx: number) => {
    const next = stepDrafts.filter((_, i) => i !== idx);
    // Re-number
    setStepDrafts(next.map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= stepDrafts.length) return;
    const next = [...stepDrafts];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setStepDrafts(next.map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const openCreate = () => {
    setForm(emptyTemplate);
    setStepDrafts([
      { step_order: 1, role_id: '', step_label: '', is_info_only: false },
    ]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengelola workflow', 'error');
      return;
    }
    if (!form.name.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    const validSteps = stepDrafts.filter(s => s.role_id && s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Tambahkan minimal satu langkah dengan role dan label', 'warning');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { data: tpl, error: tplErr } = await supabase
        .from('workflow_templates')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          is_active: form.is_active,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();
      if (tplErr || !tpl) {
        showToast('Gagal membuat template: ' + (tplErr?.message ?? 'unknown'), 'error');
        setSaving(false);
        return;
      }
      const templateId = (tpl as unknown as { id: string }).id;

      const stepRows = validSteps.map((s, i) => ({
        workflow_template_id: templateId,
        step_order: i + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
        created_at: now,
      }));
      const { error: stepsErr } = await supabase
        .from('workflow_steps')
        .insert(stepRows);
      if (stepsErr) {
        showToast('Template dibuat, tapi gagal menambah langkah: ' + stepsErr.message, 'warning');
      } else {
        showToast('Workflow template berhasil dibuat', 'success');
      }
      setShowModal(false);
      await fetchTemplates();
    } catch (e) {
      showToast('Terjadi kesalahan saat menyimpan workflow', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tpl: WorkflowTemplate) => {
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengelola workflow', 'error');
      return;
    }
    setTogglingId(tpl.id);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !tpl.is_active, updated_at: new Date().toISOString() })
        .eq('id', tpl.id);
      if (error) {
        showToast('Gagal mengubah status: ' + error.message, 'error');
        setTogglingId(null);
        return;
      }
      showToast(tpl.is_active ? 'Template dinonaktifkan' : 'Template diaktifkan', 'success');
      await fetchTemplates();
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (tpl: WorkflowTemplate) => {
    if (!canManage) {
      showToast('Anda tidak memiliki izin untuk mengelola workflow', 'error');
      return;
    }
    if (!confirm(`Hapus template "${tpl.name}" beserta semua langkahnya?`)) return;
    setDeletingId(tpl.id);
    try {
      // Delete steps first
      await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_template_id', tpl.id);

      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', tpl.id);
      if (error) {
        showToast('Gagal menghapus template: ' + error.message, 'error');
        setDeletingId(null);
        return;
      }
      showToast('Template berhasil dihapus', 'success');
      await fetchTemplates();
    } catch (e) {
      showToast('Terjadi kesalahan saat menghapus', 'error');
    } finally {
      setDeletingId(null);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workflow Approval</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan dan rantai langkah
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buat Template
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Setiap langkah (step) memiliki role penyetuju. Langkah bertanda "info only" hanya menampilkan informasi tanpa perlu persetujuan.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada template</p>
          <p className="text-sm text-slate-400 mt-1">Belum ada workflow template yang dibuat</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(tpl => {
            const steps = stepsByTemplate[tpl.id] || [];
            return (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {tpl.name ?? '—'}
                      </h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          tpl.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
                        )}
                      >
                        {tpl.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    {tpl.description ? (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {tpl.description}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {steps.length} langkah · Dibuat {new Date(tpl.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(tpl)}
                        disabled={togglingId === tpl.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        {togglingId === tpl.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : tpl.is_active ? (
                          <ToggleRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-slate-400" />
                        )}
                        {tpl.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        onClick={() => handleDelete(tpl)}
                        disabled={deletingId === tpl.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        {deletingId === tpl.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                {steps.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1 flex-wrap">
                      {steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center">
                          <div
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-medium',
                              step.is_info_only
                                ? 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                            )}
                            title={`${step.step_label} — Role: ${getRoleName(step.role_id)}${step.is_info_only ? ' (info only)' : ''}`}
                          >
                            {step.step_order}. {step.step_label}
                            <span className="opacity-60 ml-1">({getRoleName(step.role_id)})</span>
                            {step.is_info_only && <span className="opacity-60 ml-1">· info</span>}
                          </div>
                          {idx < steps.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 mx-0.5" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Template Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Buat Workflow Template
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="contoh: Approval Peminjaman Barang"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi workflow"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Template aktif</span>
              </label>

              {/* Step builder */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Langkah Workflow
                  </h3>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Langkah
                  </button>
                </div>

                <div className="space-y-2">
                  {stepDrafts.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30"
                    >
                      <div className="flex flex-col">
                        <button
                          onClick={() => moveStep(idx, -1)}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                        >
                          <GripVertical className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                          onClick={() => moveStep(idx, 1)}
                          disabled={idx === stepDrafts.length - 1}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-6 text-center">
                        {step.step_order}
                      </span>
                      <input
                        type="text"
                        value={step.step_label}
                        onChange={e => updateStep(idx, { step_label: e.target.value })}
                        placeholder="Label langkah"
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <select
                        value={step.role_id}
                        onChange={e => updateStep(idx, { role_id: e.target.value })}
                        className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">— Role —</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={step.is_info_only}
                          onChange={e => updateStep(idx, { is_info_only: e.target.checked })}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Info only
                      </label>
                      <button
                        onClick={() => removeStep(idx)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {stepDrafts.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      Belum ada langkah. Klik "Tambah Langkah" untuk memulai.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Buat Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

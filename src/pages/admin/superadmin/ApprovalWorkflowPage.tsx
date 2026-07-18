import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ArrowRight, Info, GripVertical, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

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
  workflow_steps?: WorkflowStep[];
}

interface StepDraft {
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

const emptyDraft: StepDraft = { step_order: 1, role_id: '', step_label: '', is_info_only: false };

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([{ ...emptyDraft }]);
  const [saving, setSaving] = useState(false);

  const canManage = hasPermission('workflows', 'manage');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, rolesRes] = await Promise.all([
        supabase
          .from('workflow_templates')
          .select('id, name, description, is_active, created_at, workflow_steps(id, workflow_template_id, step_order, role_id, step_label, is_info_only)')
          .order('created_at', { ascending: false }),
        supabase.from('roles').select('id, name, level').eq('is_active', true).order('level', { ascending: false }),
      ]);
      if (tplRes.error) throw tplRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const tpls = (tplRes.data ?? []) as unknown as TemplateWithSteps[];
      // sort steps by step_order client-side
      tpls.forEach((t) => {
        if (t.workflow_steps) {
          t.workflow_steps.sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
        }
      });
      setTemplates(tpls);
      setRoles((rolesRes.data ?? []) as unknown as Role[]);
    } catch (err) {
      showToast('Gagal memuat workflow: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const roleName = (roleId: string): string => roles.find((r) => r.id === roleId)?.name ?? 'Role tidak dikenal';

  const openCreate = () => {
    setName('');
    setDescription('');
    setSteps([{ ...emptyDraft }]);
    setShowModal(true);
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { ...emptyDraft, step_order: prev.length + 1 }]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast('Nama workflow wajib diisi', 'warning');
      return;
    }
    const validSteps = steps.filter((s) => s.role_id || s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Tambahkan minimal satu langkah', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { data: tpl, error: tplErr } = await supabase
        .from('workflow_templates')
        .insert({ name: name.trim(), description: description.trim() || null, is_active: true })
        .select('id')
        .single();
      if (tplErr) throw tplErr;
      const newTpl = tpl as unknown as { id: string };

      const stepRows = validSteps.map((s, i) => ({
        workflow_template_id: newTpl.id,
        step_order: i + 1,
        role_id: s.role_id || null,
        step_label: s.step_label.trim() || roleName(s.role_id),
        is_info_only: s.is_info_only,
      }));

      const { error: stepErr } = await supabase.from('workflow_steps').insert(stepRows);
      if (stepErr) throw stepErr;

      showToast('Workflow berhasil dibuat', 'success');
      setShowModal(false);
      setName('');
      setDescription('');
      setSteps([{ ...emptyDraft }]);
      await loadData();
    } catch (err) {
      showToast('Gagal membuat workflow: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: WorkflowTemplate) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !t.is_active, updated_at: new Date().toISOString() })
        .eq('id', t.id);
      if (error) throw error;
      showToast(`Workflow ${!t.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      await loadData();
    } catch (err) {
      showToast('Gagal mengubah status: ' + (err as Error).message, 'error');
    }
  };

  const handleDelete = async (t: WorkflowTemplate) => {
    if (!confirm(`Hapus workflow "${t.name}" beserta semua langkahnya?`)) return;
    try {
      // delete steps first (FK)
      const { error: stepErr } = await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_template_id', t.id);
      if (stepErr) throw stepErr;

      const { error } = await supabase.from('workflow_templates').delete().eq('id', t.id);
      if (error) throw error;

      showToast('Workflow berhasil dihapus', 'success');
      await loadData();
    } catch (err) {
      showToast('Gagal menghapus workflow: ' + (err as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workflow Persetujuan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola template alur persetujuan dan langkahnya</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Buat Workflow
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-900/20">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
        <p className="text-sm text-brand-800 dark:text-brand-200">
          Setiap langkah (step) merepresentasikan satu titik persetujuan. Langkah "info only" hanya menampilkan informasi tanpa memerlukan persetujuan.
        </p>
      </div>

      {/* Templates */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Memuat...
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Belum ada workflow.
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t.name ?? '-'}</h3>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        t.is_active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                      )}
                    >
                      {t.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  {t.description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.description}</p>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(t)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium',
                        t.is_active
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
                      )}
                    >
                      {t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Step chain */}
              {t.workflow_steps && t.workflow_steps.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {t.workflow_steps.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                          s.is_info_only
                            ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-300',
                        )}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                          {s.step_order}
                        </span>
                        <span className="font-medium">{s.step_label || roleName(s.role_id ?? '')}</span>
                        {s.role_id && (
                          <span className="text-xs opacity-70">({roleName(s.role_id)})</span>
                        )}
                        {s.is_info_only && (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] uppercase dark:bg-slate-700">
                            info
                          </span>
                        )}
                      </div>
                      {i < t.workflow_steps!.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Tidak ada langkah.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Buat Workflow Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Workflow <span className="text-red-500">*</span></label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="contoh: Persetujuan Peminjaman"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Step builder */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Langkah-langkah</label>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Langkah
                  </button>
                </div>
                <div className="space-y-2">
                  {steps.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="mt-2 flex items-center gap-1 text-slate-400">
                        <GripVertical className="h-4 w-4" />
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                        <select
                          value={s.role_id}
                          onChange={(e) => updateStep(idx, { role_id: e.target.value })}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="">Pilih role approver...</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>{r.name} (Lv. {r.level})</option>
                          ))}
                        </select>
                        <input
                          value={s.step_label}
                          onChange={(e) => updateStep(idx, { step_label: e.target.value })}
                          placeholder="Label langkah (opsional)"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <label className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={s.is_info_only}
                          onChange={(e) => updateStep(idx, { is_info_only: e.target.checked })}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        Info only
                      </label>
                      {steps.length > 1 && (
                        <button
                          onClick={() => removeStep(idx)}
                          className="mt-1.5 rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setName(''); setDescription(''); setSteps([{ ...emptyDraft }]); }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Buat Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

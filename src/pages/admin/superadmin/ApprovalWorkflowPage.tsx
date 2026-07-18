import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Workflow, Plus, Trash2, Loader2, RefreshCw, X, ArrowRight, Info, CheckCircle, Circle, Layers,
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
  steps?: WorkflowStep[];
}

interface StepDraft {
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data: tplData, error: tplError } = await supabase
      .from('workflow_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (tplError) {
      showToast('Gagal memuat template workflow', 'error');
      setLoading(false);
      return;
    }
    const tpls = (tplData as unknown as WorkflowTemplate[]) || [];
    if (tpls.length === 0) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    const { data: stepData, error: stepError } = await supabase
      .from('workflow_steps')
      .select('*')
      .in('workflow_template_id', tpls.map(t => t.id))
      .order('step_order', { ascending: true });
    if (stepError) {
      showToast('Gagal memuat langkah workflow', 'error');
      setTemplates(tpls.map(t => ({ ...t, steps: [] })));
    } else {
      const allSteps = (stepData as unknown as WorkflowStep[]) || [];
      setTemplates(tpls.map(t => ({ ...t, steps: allSteps.filter(s => s.workflow_template_id === t.id) })));
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .eq('is_active', true)
      .order('level', { ascending: true });
    if (error) {
      showToast('Gagal memuat daftar role', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchRoles();
  }, [fetchTemplates, fetchRoles]);

  const roleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? 'Role tidak dikenal';

  const openAdd = () => {
    setTplName('');
    setTplDesc('');
    setSteps([{ step_order: 1, role_id: '', step_label: '', is_info_only: false }]);
    setShowModal(true);
  };

  const addStep = () => {
    setSteps(prev => [...prev, {
      step_order: prev.length + 1,
      role_id: '',
      step_label: '',
      is_info_only: false,
    }]);
  };

  const removeStep = (idx: number) => {
    setSteps(prev => prev
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const handleSave = async () => {
    if (!tplName.trim()) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    const validSteps = steps.filter(s => s.role_id && s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Minimal satu langkah valid diperlukan', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { data: tpl, error: tplError } = await supabase
        .from('workflow_templates')
        .insert({
          name: tplName.trim(),
          description: tplDesc.trim() || null,
          is_active: true,
        })
        .select()
        .single();
      if (tplError) throw tplError;

      const newTpl = tpl as unknown as WorkflowTemplate;
      const stepPayload = validSteps.map((s, i) => ({
        workflow_template_id: newTpl.id,
        step_order: i + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
      }));
      const { error: stepError } = await supabase
        .from('workflow_steps')
        .insert(stepPayload);
      if (stepError) throw stepError;

      showToast('Template workflow dibuat', 'success');
      setShowModal(false);
      fetchTemplates();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal membuat template';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (tpl: WorkflowTemplate) => {
    setTogglingId(tpl.id);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !tpl.is_active })
        .eq('id', tpl.id);
      if (error) throw error;
      setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, is_active: !t.is_active } : t));
      showToast('Status template diperbarui', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal mengubah status';
      showToast(msg, 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (tpl: WorkflowTemplate) => {
    if (!confirm(`Hapus template "${tpl.name}" beserta langkah-langkahnya?`)) return;
    setDeletingId(tpl.id);
    try {
      await supabase.from('workflow_steps').delete().eq('workflow_template_id', tpl.id);
      const { error } = await supabase.from('workflow_templates').delete().eq('id', tpl.id);
      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      showToast('Template dihapus', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus template';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-500" />
            Approval Workflow
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan dan rantai langkahnya
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTemplates}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Muat ulang"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Workflow className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada template workflow</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{tpl.name ?? 'Tanpa Nama'}</h3>
                    {tpl.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        <Circle className="w-3 h-3" /> Nonaktif
                      </span>
                    )}
                  </div>
                  {tpl.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tpl.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(tpl)}
                    disabled={togglingId === tpl.id}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50',
                      tpl.is_active
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                    )}
                  >
                    {togglingId === tpl.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : tpl.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleDelete(tpl)}
                    disabled={deletingId === tpl.id}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                    title="Hapus template"
                  >
                    {deletingId === tpl.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {tpl.steps && tpl.steps.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-700">
                  {tpl.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                          step.is_info_only
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        )}
                      >
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-slate-800 text-xs font-bold border border-slate-200 dark:border-slate-600">
                          {step.step_order}
                        </span>
                        <span className="font-medium">{step.step_label ?? 'Tanpa Label'}</span>
                        <span className="text-xs text-slate-400">
                          {step.is_info_only ? '(info)' : roleName(step.role_id)}
                        </span>
                      </div>
                      {i < tpl.steps!.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700">
                  Tidak ada langkah
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl my-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Buat Template Workflow</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tplName}
                  onChange={e => setTplName(e.target.value)}
                  placeholder="Contoh: Approval Peminjaman Standar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                <input
                  type="text"
                  value={tplDesc}
                  onChange={e => setTplDesc(e.target.value)}
                  placeholder="Deskripsi singkat template"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> Langkah Approval
                  </label>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Langkah
                  </button>
                </div>
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
                        {step.step_order}
                      </span>
                      <input
                        type="text"
                        value={step.step_label}
                        onChange={e => updateStep(idx, { step_label: e.target.value })}
                        placeholder="Label langkah"
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={step.role_id}
                        onChange={e => updateStep(idx, { role_id: e.target.value })}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pilih role</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 cursor-pointer flex-shrink-0" title="Hanya informasi, tidak perlu approval">
                        <input
                          type="checkbox"
                          checked={step.is_info_only}
                          onChange={e => updateStep(idx, { is_info_only: e.target.checked })}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Info
                      </label>
                      {steps.length > 1 && (
                        <button
                          onClick={() => removeStep(idx)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 mt-2 text-xs text-slate-400">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <p>"Info" berarti langkah hanya untuk pemberitahuan, tidak memerlukan persetujuan. Langkah tanpa role dan label akan diabaikan saat menyimpan.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Buat Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

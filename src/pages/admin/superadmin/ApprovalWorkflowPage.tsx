import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Workflow, Plus, Trash2, Loader2, X, CheckCircle2, ArrowRight, Info, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
  created_at: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface WorkflowTemplateWithSteps extends WorkflowTemplate {
  steps: WorkflowStep[];
}

interface Role {
  id: string;
  name: string;
  level: number;
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

  const [templates, setTemplates] = useState<WorkflowTemplateWithSteps[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (tpls.length === 0) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    const tplIds = tpls.map(t => t.id);
    const { data: stepData, error: stepErr } = await supabase
      .from('workflow_steps')
      .select('id, workflow_template_id, step_order, role_id, step_label, is_info_only, created_at')
      .in('workflow_template_id', tplIds)
      .order('step_order', { ascending: true });
    if (stepErr) {
      showToast('Gagal memuat langkah workflow', 'error');
      setLoading(false);
      return;
    }
    const allSteps = (stepData as unknown as WorkflowStep[]) || [];
    const grouped: WorkflowTemplateWithSteps[] = tpls.map(t => ({
      ...t,
      description: t.description ?? '',
      steps: allSteps.filter(s => s.workflow_template_id === t.id),
    }));
    setTemplates(grouped);
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
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

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      {
        step_order: prev.length + 1,
        role_id: '',
        step_label: '',
        is_info_only: false,
      },
    ]);
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setSteps(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeStep = (idx: number) => {
    setSteps(prev =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, step_order: i + 1 }))
    );
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, step_order: i + 1 }));
    });
  };

  const openCreate = () => {
    setTplName('');
    setTplDesc('');
    setSteps([{ step_order: 1, role_id: '', step_label: '', is_info_only: false }]);
    setShowModal(true);
  };

  const handleCreate = async () => {
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
        showToast('Setiap langkah wajib memiliki role dan label', 'warning');
        return;
      }
    }
    setSaving(true);
    try {
      const { data: tplData, error: tplErr } = await supabase
        .from('workflow_templates')
        .insert({
          name: tplName.trim(),
          description: tplDesc.trim() || null,
          is_active: true,
        })
        .select('id, name, description, is_active, created_at, updated_at')
        .single();
      if (tplErr) {
        showToast(`Gagal membuat template: ${tplErr.message}`, 'error');
        setSaving(false);
        return;
      }
      const newTpl = tplData as unknown as WorkflowTemplate;

      const stepRows = steps.map(s => ({
        workflow_template_id: newTpl.id,
        step_order: s.step_order,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
      }));
      const { data: insertedSteps, error: stepErr } = await supabase
        .from('workflow_steps')
        .insert(stepRows)
        .select('id, workflow_template_id, step_order, role_id, step_label, is_info_only, created_at');
      if (stepErr) {
        showToast(`Gagal menyimpan langkah: ${stepErr.message}`, 'error');
        setSaving(false);
        return;
      }
      const newSteps = (insertedSteps as unknown as WorkflowStep[]) || [];
      setTemplates(prev => [
        { ...newTpl, description: newTpl.description ?? '', steps: newSteps },
        ...prev,
      ]);
      showToast('Template workflow berhasil dibuat', 'success');
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (tpl: WorkflowTemplateWithSteps) => {
    setTogglingId(tpl.id);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !tpl.is_active, updated_at: new Date().toISOString() })
        .eq('id', tpl.id);
      if (error) {
        showToast('Gagal mengubah status', 'error');
        setTogglingId(null);
        return;
      }
      setTemplates(prev =>
        prev.map(t => (t.id === tpl.id ? { ...t, is_active: !t.is_active } : t))
      );
      showToast(`Template ${!tpl.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (tpl: WorkflowTemplateWithSteps) => {
    if (!confirm(`Hapus template "${tpl.name}" beserta semua langkahnya?`)) return;
    setDeletingId(tpl.id);
    try {
      // Delete steps first
      await supabase.from('workflow_steps').delete().eq('workflow_template_id', tpl.id);
      const { error } = await supabase.from('workflow_templates').delete().eq('id', tpl.id);
      if (error) {
        showToast('Gagal menghapus template', 'error');
        setDeletingId(null);
        return;
      }
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      showToast('Template berhasil dihapus', 'success');
    } finally {
      setDeletingId(null);
    }
  };

  const roleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? '(role tidak ditemukan)';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-500" />
            Approval Workflow
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola template alur persetujuan</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Buat Template
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Workflow className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada template workflow</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Workflow className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{tpl.name}</h3>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-lg font-medium',
                        tpl.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500'
                      )}
                    >
                      {tpl.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span className="text-xs text-slate-400">{tpl.steps.length} langkah</span>
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-slate-500 mt-1 truncate">{tpl.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Lihat langkah"
                  >
                    {expandedId === tpl.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleToggle(tpl)}
                        disabled={togglingId === tpl.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {togglingId === tpl.id ? <Loader2 className="w-4 h-4 animate-spin" /> : tpl.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        onClick={() => handleDelete(tpl)}
                        disabled={deletingId === tpl.id}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Hapus"
                      >
                        {deletingId === tpl.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {expandedId === tpl.id && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/40">
                  {tpl.steps.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">Tidak ada langkah</p>
                  ) : (
                    <div className="space-y-2">
                      {tpl.steps.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {step.step_order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {step.step_label}
                            </p>
                            <p className="text-xs text-slate-500">{roleName(step.role_id)}</p>
                          </div>
                          {step.is_info_only && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500">
                              <Eye className="w-3 h-3" /> Info only
                            </span>
                          )}
                          {i < tpl.steps.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Buat Template Workflow</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama Template *</label>
                <input
                  type="text"
                  value={tplName}
                  onChange={e => setTplName(e.target.value)}
                  placeholder="Contoh: Approval Peminjaman Barang"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Deskripsi</label>
                <textarea
                  value={tplDesc}
                  onChange={e => setTplDesc(e.target.value)}
                  rows={2}
                  placeholder="Deskripsi singkat"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-500">Langkah-langkah Approval</label>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Langkah
                  </button>
                </div>

                {steps.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <Info className="w-5 h-5 mx-auto mb-1" />
                    Belum ada langkah. Klik "Tambah Langkah".
                  </div>
                ) : (
                  <div className="space-y-2">
                    {steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveStep(idx, -1)}
                            disabled={idx === 0}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-blue-500 text-center">{step.step_order}</span>
                          <button
                            onClick={() => moveStep(idx, 1)}
                            disabled={idx === steps.length - 1}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={step.step_label}
                            onChange={e => updateStep(idx, { step_label: e.target.value })}
                            placeholder="Label langkah (cth: Review Operator)"
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <select
                            value={step.role_id}
                            onChange={e => updateStep(idx, { role_id: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">— Pilih Role —</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name} (Lvl {r.level})</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-2 cursor-pointer sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={step.is_info_only}
                              onChange={e => updateStep(idx, { is_info_only: e.target.checked })}
                              className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Hanya informasi (tidak perlu approval)
                            </span>
                          </label>
                        </div>
                        <button
                          onClick={() => removeStep(idx)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Buat Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

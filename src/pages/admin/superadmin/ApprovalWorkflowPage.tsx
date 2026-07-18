import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Workflow, Plus, Trash2, X, Loader2, Search, ArrowRight, Info, Power, GripVertical,
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean | null;
  role?: { name: string | null } | null;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string;
  workflow_steps?: WorkflowStep[] | null;
}

interface Role {
  id: string;
  name: string;
  level: number | null;
}

interface StepDraft {
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState<WorkflowTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canManage = hasPermission('workflows', 'manage');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select(`
        id, name, description, is_active, created_at,
        workflow_steps:workflow_steps(
          id, workflow_template_id, step_order, role_id, step_label, is_info_only,
          role:roles(name)
        )
      `)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat workflow templates', 'error');
    } else {
      const rows = (data as unknown as WorkflowTemplate[]) || [];
      // Ensure steps are sorted by step_order
      rows.forEach(t => {
        if (t.workflow_steps) {
          t.workflow_steps.sort((a, b) => a.step_order - b.step_order);
        }
      });
      setTemplates(rows);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
      .eq('is_active', true)
      .order('level', { ascending: false });
    if (error) {
      showToast('Gagal memuat roles', 'error');
    } else {
      setRoles((data as unknown as Role[]) || []);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchRoles();
  }, [fetchTemplates, fetchRoles]);

  const openCreate = () => {
    setForm({ name: '', description: '', is_active: true });
    setSteps([{ role_id: '', step_label: '', is_info_only: false }]);
    setModalOpen(true);
  };

  const addStep = () => {
    setSteps([...steps, { role_id: '', step_label: '', is_info_only: false }]);
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const next = [...steps];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setSteps(next);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama template wajib diisi', 'error');
      return;
    }
    const validSteps = steps.filter(s => s.role_id && s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Tambahkan minimal 1 step dengan role dan label', 'error');
      return;
    }
    setSaving(true);

    const { data: tpl, error: tplErr } = await supabase
      .from('workflow_templates')
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
      })
      .select('id')
      .single();
    const tplRow = tpl as unknown as { id: string } | null;

    if (tplErr || !tplRow) {
      showToast('Gagal membuat template: ' + (tplErr?.message ?? 'unknown'), 'error');
      setSaving(false);
      return;
    }

    const stepPayload = validSteps.map((s, i) => ({
      workflow_template_id: tplRow.id,
      step_order: i + 1,
      role_id: s.role_id,
      step_label: s.step_label.trim(),
      is_info_only: s.is_info_only,
    }));

    const { error: stepErr } = await supabase.from('workflow_steps').insert(stepPayload);
    if (stepErr) {
      showToast('Template dibuat tetapi gagal menambah steps: ' + stepErr.message, 'warning');
    } else {
      showToast('Workflow template dibuat', 'success');
    }

    setModalOpen(false);
    setSaving(false);
    await fetchTemplates();
  };

  const handleToggleActive = async (t: WorkflowTemplate) => {
    setTogglingId(t.id);
    const newVal = !(t.is_active ?? false);
    const { error } = await supabase
      .from('workflow_templates')
      .update({ is_active: newVal })
      .eq('id', t.id);
    if (error) {
      showToast('Gagal mengubah status', 'error');
    } else {
      showToast(newVal ? 'Template diaktifkan' : 'Template dinonaktifkan', 'success');
      await fetchTemplates();
    }
    setTogglingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    setDeleting(true);
    // Delete steps first (FK safety), then template
    await supabase.from('workflow_steps').delete().eq('workflow_template_id', deleteTemplate.id);
    const { error } = await supabase.from('workflow_templates').delete().eq('id', deleteTemplate.id);
    if (error) {
      showToast('Gagal menghapus template', 'error');
    } else {
      showToast('Template dihapus', 'success');
      setDeleteTemplate(null);
      await fetchTemplates();
    }
    setDeleting(false);
  };

  const filtered = templates.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approval Workflow</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Template
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari template..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada workflow template</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => {
            const isActive = t.is_active ?? false;
            const tplSteps = t.workflow_steps ?? [];
            return (
              <div key={t.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Workflow className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{t.name}</h3>
                      {t.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{t.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-medium',
                        isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      )}
                    >
                      {isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    {canManage && (
                      <>
                        <button
                          onClick={() => handleToggleActive(t)}
                          disabled={togglingId === t.id}
                          className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                          title={isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {togglingId === t.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTemplate(t)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {tplSteps.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    {tplSteps.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2">
                        {i > 0 && <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                        <div
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                            s.is_info_only
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          )}
                        >
                          <span className="text-slate-400">{s.step_order}.</span>
                          <span>{s.step_label}</span>
                          <span className="text-slate-400">·</span>
                          <span>{s.role?.name ?? '?'}</span>
                          {s.is_info_only && (
                            <span className="text-blue-400">(info)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    Belum ada step
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Workflow Template</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nama Template <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Contoh: Approval Peminjaman Barang"
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="input"
                  placeholder="Deskripsi workflow..."
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                  />
                  Aktifkan template
                </label>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">Steps</label>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Tambah Step
                  </button>
                </div>
                <div className="space-y-3">
                  {steps.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <div className="flex flex-col gap-1 pt-2">
                        <button
                          onClick={() => moveStep(idx, -1)}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                        >
                          <GripVertical className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                          onClick={() => moveStep(idx, 1)}
                          disabled={idx === steps.length - 1}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-xs text-slate-400">Step {idx + 1}</span>
                          <input
                            type="text"
                            value={s.step_label}
                            onChange={e => updateStep(idx, { step_label: e.target.value })}
                            className="input"
                            placeholder="Label step (cth: Review PJ)"
                          />
                        </div>
                        <div>
                          <span className="text-xs text-slate-400">Role approver</span>
                          <select
                            value={s.role_id}
                            onChange={e => updateStep(idx, { role_id: e.target.value })}
                            className="input"
                          >
                            <option value="">— Pilih Role —</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={s.is_info_only}
                            onChange={e => updateStep(idx, { is_info_only: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                          />
                          Info only (tidak memerlukan approval, hanya notifikasi)
                        </label>
                      </div>
                      <button
                        onClick={() => removeStep(idx)}
                        disabled={steps.length === 1}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 mt-6"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 mt-3">
                  <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    Urutan step dari atas ke bawah menentukan alur approval. Step "info only" hanya mengirim notifikasi tanpa memerlukan persetujuan.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 btn-primary"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteTemplate(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Template?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Template <span className="font-medium text-slate-900 dark:text-white">{deleteTemplate.name}</span> beserta semua step-nya akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTemplate(null)} className="btn-secondary">Batal</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

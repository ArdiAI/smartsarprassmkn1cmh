import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Plus, Trash2, Loader2, Workflow, ArrowRight, X, Check,
  ToggleLeft, ToggleRight, GripVertical, Info,
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
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
}

interface TemplateWithSteps extends WorkflowTemplate {
  workflow_steps?: WorkflowStep[] | null;
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('id, name, description, is_active, created_at, workflow_steps(*)')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat workflow template', 'error');
      setLoading(false);
      return;
    }
    const list = (data as unknown as TemplateWithSteps[]) || [];
    // Sort steps by step_order within each template.
    for (const t of list) {
      if (t.workflow_steps) {
        t.workflow_steps.sort((a, b) => a.step_order - b.step_order);
      }
    }
    setTemplates(list);
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

  const openAdd = () => {
    setFormName('');
    setFormDescription('');
    setSteps([
      { step_order: 1, role_id: '', step_label: '', is_info_only: false },
    ]);
    setShowModal(true);
  };

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { step_order: prev.length + 1, role_id: '', step_label: '', is_info_only: false },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setSteps(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
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
    setActionLoading('create');
    try {
      const { data: tmpl, error: tmplError } = await supabase
        .from('workflow_templates')
        .insert({
          name: formName.trim(),
          description: formDescription.trim() || null,
          is_active: true,
        })
        .select('id')
        .single();
      if (tmplError || !tmpl) {
        showToast('Gagal membuat template: ' + (tmplError?.message ?? 'unknown'), 'error');
        setActionLoading(null);
        return;
      }
      const templateId = (tmpl as unknown as { id: string }).id;
      const stepRows = steps.map(s => ({
        workflow_template_id: templateId,
        step_order: s.step_order,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
      }));
      const { error: stepError } = await supabase.from('workflow_steps').insert(stepRows);
      if (stepError) {
        showToast('Template dibuat, tapi gagal menambah langkah: ' + stepError.message, 'warning');
      } else {
        showToast('Workflow template berhasil dibuat', 'success');
      }
      setShowModal(false);
      await fetchTemplates();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (t: TemplateWithSteps) => {
    setActionLoading(`toggle-${t.id}`);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !t.is_active, updated_at: new Date().toISOString() })
        .eq('id', t.id);
      if (error) {
        showToast('Gagal mengubah status: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast(`Template ${!t.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      await fetchTemplates();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (t: TemplateWithSteps) => {
    if (!confirm(`Hapus template "${t.name}" beserta seluruh langkahnya?`)) return;
    setActionLoading(`delete-${t.id}`);
    try {
      // Delete steps first, then template.
      await supabase.from('workflow_steps').delete().eq('workflow_template_id', t.id);
      const { error } = await supabase.from('workflow_templates').delete().eq('id', t.id);
      if (error) {
        showToast('Gagal menghapus template: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast('Template berhasil dihapus', 'success');
      await fetchTemplates();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const roleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? 'Role tidak dikenal';

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
            <Workflow className="w-6 h-6 text-blue-500" /> Workflow Approval
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan peminjaman
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Buat Template
          </button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada workflow template</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map(t => {
            const stepList = t.workflow_steps ?? [];
            return (
              <div key={t.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{t.name}</h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          t.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                        )}
                      >
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.description}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(t)}
                        disabled={actionLoading === `toggle-${t.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `toggle-${t.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : t.is_active ? (
                          <ToggleRight className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                        )}
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        disabled={actionLoading === `delete-${t.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `delete-${t.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                {stepList.length > 0 ? (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {stepList.map((s, idx) => (
                      <div key={s.id} className="flex items-center">
                        <div
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-medium',
                            s.is_info_only
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          )}
                          title={s.is_info_only ? 'Langkah informasi saja' : 'Langkah approval'}
                        >
                          {s.step_order}. {s.step_label}
                          <span className="opacity-70"> · {roleName(s.role_id)}</span>
                          {s.is_info_only && <span className="ml-1">ℹ</span>}
                        </div>
                        {idx < stepList.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Belum ada langkah pada template ini.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="card w-full max-w-lg p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Buat Workflow Template</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="label">Nama Template <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Contoh: Approval Peminjaman Barang"
                className="input"
              />
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Deskripsi singkat template"
                className="input"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="label !mb-0">Langkah Approval</label>
                <button
                  onClick={addStep}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Langkah
                </button>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Langkah "info only" hanya menampilkan status tanpa memerlukan approval. Langkah approval akan meminta role terkait untuk menyetujui/menolak.
                </p>
              </div>
              {steps.map((s, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <GripVertical className="w-4 h-4 text-slate-400" /> Langkah {s.step_order}
                    </span>
                    {steps.length > 1 && (
                      <button
                        onClick={() => removeStep(idx)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="label">Label Langkah <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={s.step_label}
                      onChange={e => updateStep(idx, { step_label: e.target.value })}
                      placeholder="Contoh: Disetujui Sarpras"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Role Approver <span className="text-red-500">*</span></label>
                    <select
                      value={s.role_id}
                      onChange={e => updateStep(idx, { role_id: e.target.value })}
                      className="input"
                    >
                      <option value="">— Pilih Role —</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name} (Lvl {r.level})</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.is_info_only}
                      onChange={e => updateStep(idx, { is_info_only: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Hanya informasi (tanpa approval)</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading === 'create'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Buat Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

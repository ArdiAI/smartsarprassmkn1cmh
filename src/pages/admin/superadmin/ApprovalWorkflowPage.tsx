import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Workflow, Plus, Trash2, Loader2, X, Save, Power, ArrowRight, Info, Layers, GitBranch,
} from 'lucide-react';

interface RoleRow {
  id: string;
  name: string;
  level: number;
  is_active: boolean;
}

interface WorkflowStepRow {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

interface WorkflowTemplateRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  workflow_steps?: WorkflowStepRow[];
}

interface DraftStep {
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const [templates, setTemplates] = useState<WorkflowTemplateRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([]);

  const canManage = hasPermission('workflows', 'manage');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: tmplData }, { data: roleData }] = await Promise.all([
      supabase
        .from('workflow_templates')
        .select('id, name, description, is_active, created_at, updated_at, workflow_steps(id, workflow_template_id, step_order, role_id, step_label, is_info_only)')
        .order('created_at', { ascending: false }),
      supabase.from('roles').select('id, name, level, is_active').eq('is_active', true).order('level', { ascending: false }),
    ]);

    const tmpls = (tmplData as unknown as WorkflowTemplateRow[]) || [];
    // Sort steps by step_order for each template
    for (const t of tmpls) {
      if (t.workflow_steps) {
        t.workflow_steps.sort((a, b) => a.step_order - b.step_order);
      }
    }
    setTemplates(tmpls);
    setRoles((roleData as unknown as RoleRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRoleName = (roleId: string): string => {
    const r = roles.find(x => x.id === roleId);
    return r?.name ?? '—';
  };

  const resetForm = () => {
    setForm({ name: '', description: '' });
    setDraftSteps([]);
  };

  const addDraftStep = () => {
    setDraftSteps(prev => [
      ...prev,
      {
        step_order: prev.length + 1,
        role_id: '',
        step_label: '',
        is_info_only: false,
      },
    ]);
  };

  const updateDraftStep = (idx: number, patch: Partial<DraftStep>) => {
    setDraftSteps(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeDraftStep = (idx: number) => {
    setDraftSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const handleCreate = async () => {
    if (!canManage) return;
    if (!form.name.trim()) {
      showToast('Nama template wajib diisi', 'error');
      return;
    }
    if (draftSteps.length === 0) {
      showToast('Tambahkan minimal satu langkah workflow', 'error');
      return;
    }
    for (const s of draftSteps) {
      if (!s.role_id || !s.step_label.trim()) {
        showToast('Setiap langkah wajib memiliki role dan label', 'error');
        return;
      }
    }
    setSaving(true);
    try {
      const { data: newTmpl, error: tmplError } = await supabase
        .from('workflow_templates')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          is_active: true,
        })
        .select('id')
        .single();
      if (tmplError) throw tmplError;
      const tmplId = (newTmpl as unknown as { id: string }).id;

      const stepsToInsert = draftSteps.map((s, i) => ({
        workflow_template_id: tmplId,
        step_order: i + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
      }));
      const { error: stepsError } = await supabase.from('workflow_steps').insert(stepsToInsert);
      if (stepsError) throw stepsError;

      showToast('Template workflow berhasil dibuat', 'success');
      setShowModal(false);
      resetForm();
      await fetchData();
    } catch (e: any) {
      showToast(`Gagal membuat template: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: WorkflowTemplateRow) => {
    if (!canManage) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !t.is_active, updated_at: new Date().toISOString() })
        .eq('id', t.id);
      if (error) throw error;
      setTemplates(prev => prev.map(x => (x.id === t.id ? { ...x, is_active: !x.is_active } : x)));
      showToast(`Template ${!t.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } catch (e: any) {
      showToast(`Gagal: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: WorkflowTemplateRow) => {
    if (!canManage) return;
    if (!confirm(`Hapus template "${t.name}"? Semua langkah workflow akan ikut terhapus.`)) return;
    setSaving(true);
    try {
      // Delete steps first (in case of FK constraints)
      await supabase.from('workflow_steps').delete().eq('workflow_template_id', t.id);
      const { error } = await supabase.from('workflow_templates').delete().eq('id', t.id);
      if (error) throw error;
      setTemplates(prev => prev.filter(x => x.id !== t.id));
      showToast('Template berhasil dihapus', 'success');
    } catch (e: any) {
      showToast(`Gagal menghapus: ${e.message}`, 'error');
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workflow Approval</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan dengan rantai langkah berbasis role
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { resetForm(); addDraftStep(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Template Baru
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Setiap langkah (step) akan dikerjakan oleh pemegang role yang dipilih. Langkah "info only" tidak memerlukan persetujuan dan otomatis dilanjutkan ke langkah berikutnya.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada template workflow</p>
          <p className="text-sm text-slate-400 mt-1">Buat template untuk mendefinisikan alur persetujuan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(t => {
            const isExpanded = expandedId === t.id;
            const steps = t.workflow_steps ?? [];
            return (
              <div key={t.id} className="card overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <GitBranch className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <h3 className="font-semibold text-slate-900 dark:text-white">{t.name}</h3>
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-medium',
                          t.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                        )}>
                          {t.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.description}</p>
                      )}
                      <div className="flex items-center gap-1 flex-wrap mt-3">
                        {steps.length === 0 ? (
                          <span className="text-xs text-slate-400">Tidak ada langkah</span>
                        ) : (
                          steps.map((s, idx) => (
                            <div key={s.id} className="flex items-center">
                              <span className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-medium',
                                s.is_info_only
                                  ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                              )}>
                                {s.step_order}. {s.step_label}
                                <span className="opacity-60 ml-1">({getRoleName(s.role_id)})</span>
                                {s.is_info_only && <span className="opacity-60 ml-1">· info</span>}
                              </span>
                              {idx < steps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" />}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleActive(t)}
                          disabled={saving}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                            t.is_active
                              ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                          )}
                        >
                          <Power className="w-3.5 h-3.5" /> {t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Template Workflow Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Template *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="cth: Approval Peminjaman Barang"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi singkat (opsional)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> Langkah Workflow
                  </label>
                  <button
                    onClick={addDraftStep}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Langkah
                  </button>
                </div>
                <div className="space-y-2">
                  {draftSteps.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">Belum ada langkah. Klik "Tambah Langkah".</p>
                  )}
                  {draftSteps.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 p-2">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <select
                        value={s.role_id}
                        onChange={e => updateDraftStep(idx, { role_id: e.target.value })}
                        className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Pilih role...</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={s.step_label}
                        onChange={e => updateDraftStep(idx, { step_label: e.target.value })}
                        placeholder="Label langkah (cth: Review PJ)"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={s.is_info_only}
                          onChange={e => updateDraftStep(idx, { is_info_only: e.target.checked })}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                        />
                        Info only
                      </label>
                      <button
                        onClick={() => removeDraftStep(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50',
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Buat Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

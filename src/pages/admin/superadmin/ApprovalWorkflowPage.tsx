import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Workflow, Plus, Search, Pencil, Trash2, X, Loader2, ArrowRight, GitBranch,
  CheckCircle, Info, ChevronUp, ChevronDown, Trash,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  level: number | null;
  is_active: boolean;
}

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
  created_at: string;
  role?: Role | null;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  steps?: WorkflowStep[] | null;
}

interface StepDraft {
  step_order: number;
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

const emptyDraft: StepDraft = { step_order: 1, role_id: '', step_label: '', is_info_only: false };

const emptyTemplateForm = { name: '', description: '' };

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WorkflowTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    const { data } = await supabase
      .from('roles')
      .select('id, name, level, is_active')
      .eq('is_active', true)
      .order('level', { ascending: true, nullsFirst: false });
    if (data) setRoles(data as unknown as Role[]);
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select(`
        id, name, description, is_active, created_at, updated_at,
        workflow_steps(id, workflow_template_id, step_order, role_id, step_label, is_info_only, created_at, role:roles(id, name, level, is_active))
      `)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat workflow template', 'error');
      setLoading(false);
      return;
    }
    const rows = (data as unknown as WorkflowTemplate[]) || [];
    // Sort steps by step_order
    rows.forEach(t => {
      if (t.steps && Array.isArray(t.steps)) {
        t.steps.sort((a, b) => a.step_order - b.step_order);
      }
    });
    setTemplates(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchRoles();
  }, [fetchTemplates, fetchRoles]);

  const openAdd = () => {
    setEditing(null);
    setTemplateForm(emptyTemplateForm);
    setStepDrafts([{ ...emptyDraft, step_order: 1 }]);
    setShowModal(true);
  };

  const openEdit = async (t: WorkflowTemplate) => {
    setEditing(t);
    setTemplateForm({ name: t.name ?? '', description: t.description ?? '' });
    const steps = (t.steps ?? []).map(s => ({
      step_order: s.step_order,
      role_id: s.role_id ?? '',
      step_label: s.step_label ?? '',
      is_info_only: s.is_info_only,
    }));
    setStepDrafts(steps.length > 0 ? steps : [{ ...emptyDraft, step_order: 1 }]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setTemplateForm(emptyTemplateForm);
    setStepDrafts([]);
  };

  const addStep = () => {
    setStepDrafts(prev => [
      ...prev,
      { ...emptyDraft, step_order: prev.length + 1 },
    ]);
  };

  const removeStep = (idx: number) => {
    setStepDrafts(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((s, i) => ({ ...s, step_order: i + 1 }));
    });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    setStepDrafts(prev => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, step_order: i + 1 }));
    });
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setStepDrafts(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    if (!templateForm.name.trim()) {
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
      if (editing) {
        // Update template
        const { error: tplErr } = await supabase
          .from('workflow_templates')
          .update({
            name: templateForm.name.trim(),
            description: templateForm.description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);
        if (tplErr) {
          showToast('Gagal memperbarui template: ' + tplErr.message, 'error');
          setSaving(false);
          return;
        }
        // Replace steps: delete then insert
        const { error: delErr } = await supabase
          .from('workflow_steps')
          .delete()
          .eq('workflow_template_id', editing.id);
        if (delErr) {
          showToast('Gagal menghapus langkah lama: ' + delErr.message, 'error');
          setSaving(false);
          return;
        }
        const inserts = validSteps.map((s, i) => ({
          workflow_template_id: editing.id,
          step_order: i + 1,
          role_id: s.role_id,
          step_label: s.step_label.trim(),
          is_info_only: s.is_info_only,
        }));
        const { error: insErr } = await supabase.from('workflow_steps').insert(inserts);
        if (insErr) {
          showToast('Gagal menyimpan langkah baru: ' + insErr.message, 'error');
          setSaving(false);
          return;
        }
        showToast('Template workflow berhasil diperbarui', 'success');
      } else {
        // Insert template
        const { data: tplData, error: tplErr } = await supabase
          .from('workflow_templates')
          .insert({
            name: templateForm.name.trim(),
            description: templateForm.description.trim() || null,
            is_active: true,
          })
          .select('id')
          .single();
        if (tplErr || !tplData) {
          showToast('Gagal menambahkan template: ' + (tplErr?.message ?? 'unknown'), 'error');
          setSaving(false);
          return;
        }
        const newId = (tplData as unknown as { id: string }).id;
        const inserts = validSteps.map((s, i) => ({
          workflow_template_id: newId,
          step_order: i + 1,
          role_id: s.role_id,
          step_label: s.step_label.trim(),
          is_info_only: s.is_info_only,
        }));
        const { error: insErr } = await supabase.from('workflow_steps').insert(inserts);
        if (insErr) {
          showToast('Gagal menyimpan langkah: ' + insErr.message, 'error');
          setSaving(false);
          return;
        }
        showToast('Template workflow berhasil dibuat', 'success');
      }
      closeModal();
      await fetchTemplates();
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: WorkflowTemplate) => {
    setActionLoading(t.id);
    const { error } = await supabase
      .from('workflow_templates')
      .update({ is_active: !t.is_active, updated_at: new Date().toISOString() })
      .eq('id', t.id);
    if (error) {
      showToast('Gagal mengubah status template', 'error');
      setActionLoading(null);
      return;
    }
    showToast(`Template ${!t.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    await fetchTemplates();
    setActionLoading(null);
  };

  const handleDelete = async (t: WorkflowTemplate) => {
    if (!confirm(`Hapus template "${t.name}"? Semua langkah juga akan dihapus.`)) return;
    setActionLoading(t.id);
    // Delete steps first
    await supabase.from('workflow_steps').delete().eq('workflow_template_id', t.id);
    const { error } = await supabase.from('workflow_templates').delete().eq('id', t.id);
    if (error) {
      showToast('Gagal menghapus template: ' + error.message, 'error');
      setActionLoading(null);
      return;
    }
    showToast('Template berhasil dihapus', 'success');
    await fetchTemplates();
    setActionLoading(null);
  };

  const filtered = templates.filter(t => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  });

  const roleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-7 h-7 text-cyan-600" />
            Approval Workflow
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan dan rantai langkahnya dalam sistem SMART SARPRAS
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={roles.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Buat Template
        </button>
      </div>

      {roles.length === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Belum ada role aktif. Tambahkan role terlebih dahulu di halaman Roles &amp; Permissions sebelum membuat workflow.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau deskripsi template..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Workflow className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada template workflow</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => (
            <div
              key={t.id}
              className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn(
                    'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0',
                    t.is_active
                      ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-700/40',
                  )}>
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-white">{t.name || '-'}</p>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        t.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400',
                      )}>
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(t)}
                    disabled={actionLoading === t.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    {t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={actionLoading === t.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>

              {/* Step chain */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                {(t.steps ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada langkah</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {(t.steps ?? []).map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <div className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border',
                          s.is_info_only
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800',
                        )}>
                          <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                            {s.step_order}
                          </span>
                          {s.is_info_only && <Info className="w-3 h-3" />}
                          <span>{s.step_label || '—'}</span>
                          <span className="text-slate-400 dark:text-slate-500">
                            · {s.role?.name ?? roleName(s.role_id) ?? '—'}
                          </span>
                        </div>
                        {i < (t.steps ?? []).length - 1 && (
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Workflow className="w-5 h-5 text-cyan-600" />
                {editing ? 'Edit Template Workflow' : 'Buat Template Workflow'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Template info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Template</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="contoh: Workflow Peminjaman Sarana"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                  <textarea
                    value={templateForm.description}
                    onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Deskripsi singkat workflow..."
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  />
                </div>
              </div>

              {/* Step builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-cyan-600" />
                    Langkah Workflow
                  </label>
                  <button
                    onClick={addStep}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Langkah
                  </button>
                </div>

                <div className="space-y-3">
                  {stepDrafts.map((s, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold">
                          {s.step_order}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveStep(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveStep(idx, 1)}
                            disabled={idx === stepDrafts.length - 1}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeStep(idx)}
                            disabled={stepDrafts.length <= 1}
                            className="p-1 rounded-lg text-red-400 hover:text-red-600 disabled:opacity-30"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={s.step_label}
                          onChange={e => updateStep(idx, { step_label: e.target.value })}
                          placeholder="Label langkah (contoh: Verifikasi PJ)"
                          className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <select
                          value={s.role_id}
                          onChange={e => updateStep(idx, { role_id: e.target.value })}
                          className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="">— Pilih Role —</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name}{r.level != null ? ` · L${r.level}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={s.is_info_only}
                          onClick={() => updateStep(idx, { is_info_only: !s.is_info_only })}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            s.is_info_only ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600',
                          )}
                        >
                          <span className={cn(
                            'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                            s.is_info_only ? 'translate-x-5' : 'translate-x-1',
                          )} />
                        </button>
                        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Info className="w-3 h-3" /> Info only (tidak butuh approval)
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Workflow className="w-4 h-4" />}
                {editing ? 'Simpan Perubahan' : 'Buat Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

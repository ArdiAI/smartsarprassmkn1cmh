import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Workflow, Plus, Trash2, X, Loader2, Search, ArrowRight, Info, GripVertical,
  ChevronUp, ChevronDown, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string | null;
  step_label: string | null;
  is_info_only: boolean | null;
  created_at: string | null;
  role?: { name: string } | null;
}

interface Role {
  id: string;
  name: string;
}

interface TemplateWithSteps extends WorkflowTemplate {
  steps?: WorkflowStep[];
}

interface DraftStep {
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

const emptyTemplateForm = {
  name: '',
  description: '',
  is_active: true,
};

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<WorkflowTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canManage = hasPermission('workflows', 'manage');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workflow_templates')
      .select(`
        id, name, description, is_active, created_at, updated_at,
        steps:workflow_steps(
          id, workflow_template_id, step_order, role_id, step_label, is_info_only, created_at,
          role:roles(name)
        )
      `)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat workflow templates', 'error');
    } else {
      // Sort steps by step_order client-side.
      const rows = (data as unknown as TemplateWithSteps[]) || [];
      rows.forEach(t => {
        if (t.steps) {
          t.steps.sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
        }
      });
      setTemplates(rows);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name')
      .eq('is_active', true)
      .order('level', { ascending: false });
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

  const openCreate = () => {
    setTemplateForm(emptyTemplateForm);
    setDraftSteps([{ role_id: '', step_label: '', is_info_only: false }]);
    setModalOpen(true);
  };

  const addDraftStep = () => {
    setDraftSteps([...draftSteps, { role_id: '', step_label: '', is_info_only: false }]);
  };

  const removeDraftStep = (index: number) => {
    setDraftSteps(draftSteps.filter((_, i) => i !== index));
  };

  const moveDraftStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= draftSteps.length) return;
    const next = [...draftSteps];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setDraftSteps(next);
  };

  const updateDraftStep = (index: number, field: keyof DraftStep, value: string | boolean) => {
    setDraftSteps(draftSteps.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => {
    if (!templateForm.name.trim()) {
      showToast('Nama template wajib diisi', 'error');
      return;
    }
    const validSteps = draftSteps.filter(s => s.role_id || s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Tambahkan minimal satu langkah', 'error');
      return;
    }
    for (const s of validSteps) {
      if (!s.role_id) {
        showToast('Setiap langkah harus memiliki role', 'error');
        return;
      }
    }

    setSaving(true);
    const templatePayload = {
      name: templateForm.name.trim(),
      description: templateForm.description.trim() || null,
      is_active: templateForm.is_active,
    };

    const { data: tplData, error: tplErr } = await supabase
      .from('workflow_templates')
      .insert(templatePayload)
      .select('id')
      .single();

    if (tplErr || !tplData) {
      showToast('Gagal membuat template: ' + (tplErr?.message ?? 'unknown error'), 'error');
      setSaving(false);
      return;
    }

    const templateId = (tplData as unknown as { id: string }).id;
    const stepRows = validSteps.map((s, i) => ({
      workflow_template_id: templateId,
      step_order: i + 1,
      role_id: s.role_id,
      step_label: s.step_label.trim() || null,
      is_info_only: s.is_info_only,
    }));

    const { error: stepsErr } = await supabase.from('workflow_steps').insert(stepRows);
    if (stepsErr) {
      showToast('Template dibuat, tapi gagal menambah langkah: ' + stepsErr.message, 'warning');
    } else {
      showToast('Template workflow dibuat', 'success');
    }

    setModalOpen(false);
    setSaving(false);
    await fetchTemplates();
  };

  const handleToggleActive = async (t: WorkflowTemplate) => {
    setTogglingId(t.id);
    const next = !(t.is_active ?? false);
    const { error } = await supabase
      .from('workflow_templates')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', t.id);
    if (error) {
      showToast('Gagal mengubah status template', 'error');
    } else {
      showToast(next ? 'Template diaktifkan' : 'Template dinonaktifkan', 'success');
      await fetchTemplates();
    }
    setTogglingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // Delete steps first (FK safety), then template.
    await supabase.from('workflow_steps').delete().eq('workflow_template_id', deleteTarget.id);
    const { error } = await supabase.from('workflow_templates').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('Gagal menghapus template: ' + error.message, 'error');
    } else {
      showToast('Template dihapus', 'success');
      setDeleteTarget(null);
      await fetchTemplates();
    }
    setDeleting(false);
  };

  const filtered = templates.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approval Workflow</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola template alur persetujuan dan rantai langkahnya
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Buat Template
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari template workflow..."
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada template workflow</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{t.name}</h3>
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-medium',
                        t.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      )}
                    >
                      {t.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t.description}</p>
                  )}

                  {/* Step chain */}
                  {t.steps && t.steps.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {t.steps.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2">
                          <div
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium border',
                              s.is_info_only
                                ? 'bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            )}
                          >
                            <span className="text-slate-400 mr-1">{i + 1}.</span>
                            {s.step_label || s.role?.name || 'Langkah'}
                            {s.is_info_only && <span className="ml-1 text-slate-400">(info)</span>}
                            {!s.is_info_only && s.role?.name && (
                              <span className="ml-1 text-slate-400">· {s.role.name}</span>
                            )}
                          </div>
                          {i < t.steps!.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 mt-2">Belum ada langkah</p>
                  )}
                </div>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(t)}
                      disabled={togglingId === t.id}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        t.is_active
                          ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-700'
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}
                      title={t.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {togglingId === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : t.is_active ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Hapus Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Buat Template Workflow</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="label">Nama Template <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="input"
                  placeholder="Contoh: Peminjaman Barang Standar"
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={templateForm.description}
                  onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })}
                  rows={2}
                  className="input"
                  placeholder="Deskripsi singkat workflow..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Langkah-langkah Approval</label>
                  <button
                    onClick={addDraftStep}
                    className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Tambah Langkah
                  </button>
                </div>

                <div className="space-y-3">
                  {draftSteps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => moveDraftStep(i, -1)}
                          disabled={i === 0}
                          className="p-0.5 text-slate-400 hover:text-blue-500 disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        <button
                          onClick={() => moveDraftStep(i, 1)}
                          disabled={i === draftSteps.length - 1}
                          className="p-0.5 text-slate-400 hover:text-blue-500 disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-400 w-6">{i + 1}.</span>
                          <select
                            value={s.role_id}
                            onChange={e => updateDraftStep(i, 'role_id', e.target.value)}
                            className="input flex-1"
                          >
                            <option value="">— Pilih Role —</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          {draftSteps.length > 1 && (
                            <button
                              onClick={() => removeDraftStep(i)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={s.step_label}
                          onChange={e => updateDraftStep(i, 'step_label', e.target.value)}
                          className="input"
                          placeholder="Label langkah (opsional, contoh: Review PJ)"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.is_info_only}
                            onChange={e => updateDraftStep(i, 'is_info_only', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-500 dark:text-slate-400">Hanya informasi (tidak perlu approval)</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    Langkah akan dieksekusi berurutan dari atas ke bawah. Role menentukan siapa yang dapat menyetujui pada langkah tersebut.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateForm.is_active}
                  onChange={e => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktifkan template segera</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Buat Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Template?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Template <span className="font-medium">{deleteTarget.name}</span> beserta semua langkahnya akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

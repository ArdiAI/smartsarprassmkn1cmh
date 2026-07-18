import { useEffect, useState } from 'react';
import { Plus, Trash2, GripVertical, ArrowRight, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
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
}

interface TemplateWithSteps extends WorkflowTemplate {
  steps: WorkflowStep[];
}

interface DraftStep {
  role_id: string;
  step_label: string;
  is_info_only: boolean;
}

export default function ApprovalWorkflowPage() {
  const { hasPermission } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([]);
  const [saving, setSaving] = useState(false);

  const canManage = hasPermission('workflows', 'manage');

  const load = async () => {
    setLoading(true);
    try {
      const { data: tplData, error: tplErr } = await supabase
        .from('workflow_templates')
        .select('id, name, description, is_active, created_at')
        .order('created_at', { ascending: false });
      if (tplErr) throw tplErr;

      const tpls = (tplData ?? []) as unknown as WorkflowTemplate[];
      const { data: stepData, error: stepErr } = await supabase
        .from('workflow_steps')
        .select('id, workflow_template_id, step_order, role_id, step_label, is_info_only')
        .order('step_order', { ascending: true });
      if (stepErr) throw stepErr;

      const steps = (stepData ?? []) as unknown as WorkflowStep[];
      const grouped: TemplateWithSteps[] = tpls.map((t) => ({
        ...t,
        steps: steps.filter((s) => s.workflow_template_id === t.id),
      }));
      setTemplates(grouped);
    } catch {
      showToast('Gagal memuat data workflow', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('level', { ascending: false });
      if (error) throw error;
      setRoles((data ?? []) as unknown as Role[]);
    } catch {
      showToast('Gagal memuat daftar role', 'error');
    }
  };

  useEffect(() => {
    load();
    loadRoles();
  }, []);

  const roleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? '—';

  const openCreate = () => {
    setName('');
    setDescription('');
    setDraftSteps([{ role_id: '', step_label: '', is_info_only: false }]);
    setShowModal(true);
  };

  const addDraftStep = () => {
    setDraftSteps([...draftSteps, { role_id: '', step_label: '', is_info_only: false }]);
  };

  const updateDraftStep = (idx: number, patch: Partial<DraftStep>) => {
    setDraftSteps(draftSteps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeDraftStep = (idx: number) => {
    setDraftSteps(draftSteps.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Nama template wajib diisi', 'warning');
      return;
    }
    const validSteps = draftSteps.filter((s) => s.role_id && s.step_label.trim());
    if (validSteps.length === 0) {
      showToast('Tambahkan minimal satu langkah yang valid', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { data: tpl, error: tplErr } = await supabase
        .from('workflow_templates')
        .insert({ name: trimmedName, description: description.trim(), is_active: true })
        .select('id')
        .single();
      if (tplErr) throw tplErr;
      const newTpl = tpl as unknown as { id: string };

      const rows = validSteps.map((s, i) => ({
        workflow_template_id: newTpl.id,
        step_order: i + 1,
        role_id: s.role_id,
        step_label: s.step_label.trim(),
        is_info_only: s.is_info_only,
      }));
      const { error: stepErr } = await supabase.from('workflow_steps').insert(rows);
      if (stepErr) throw stepErr;

      showToast('Workflow berhasil dibuat', 'success');
      setShowModal(false);
      await load();
    } catch {
      showToast('Gagal membuat workflow', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tpl: WorkflowTemplate) => {
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !tpl.is_active })
        .eq('id', tpl.id);
      if (error) throw error;
      showToast(tpl.is_active ? 'Workflow dinonaktifkan' : 'Workflow diaktifkan', 'success');
      await load();
    } catch {
      showToast('Gagal mengubah status', 'error');
    }
  };

  const handleDelete = async (tpl: WorkflowTemplate) => {
    if (!confirm(`Hapus workflow "${tpl.name}"? Semua langkah akan ikut terhapus.`)) return;
    try {
      const { error: stepErr } = await supabase
        .from('workflow_steps')
        .delete()
        .eq('workflow_template_id', tpl.id);
      if (stepErr) throw stepErr;
      const { error } = await supabase.from('workflow_templates').delete().eq('id', tpl.id);
      if (error) throw error;
      showToast('Workflow berhasil dihapus', 'success');
      await load();
    } catch {
      showToast('Gagal menghapus workflow', 'error');
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approval Workflow</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola template alur persetujuan dan rangkaian langkahnya.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Workflow
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-slate-400">Memuat…</p>
      ) : templates.length === 0 ? (
        <p className="text-center text-slate-400">Belum ada workflow.</p>
      ) : (
        <div className="space-y-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{tpl.name ?? '—'}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tpl.description ?? 'Tidak ada deskripsi.'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      tpl.is_active
                        ? 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }
                  >
                    {tpl.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  {canManage && (
                    <>
                      <button
                        onClick={() => toggleActive(tpl)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
                      >
                        {tpl.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        onClick={() => handleDelete(tpl)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </>
                  )}
                </div>
              </div>

              {tpl.steps.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada langkah.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {tpl.steps.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div
                        className={
                          s.is_info_only
                            ? 'flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm dark:border-sky-900/40 dark:bg-sky-900/20'
                            : 'flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-700/40'
                        }
                      >
                        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-400">#{s.step_order}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">{s.step_label ?? '—'}</span>
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                          {roleName(s.role_id)}
                        </span>
                        {s.is_info_only && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                            info
                          </span>
                        )}
                      </div>
                      {i < tpl.steps.length - 1 && <ArrowRight className="h-4 w-4 text-slate-300" />}
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Workflow</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Nama Template</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Mis. Persetujuan Peminjaman" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Deskripsi</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} placeholder="Deskripsi singkat" />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Langkah-langkah</span>
                  <button onClick={addDraftStep} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30">
                    <Plus className="h-3.5 w-3.5" /> Tambah Langkah
                  </button>
                </div>
                <div className="space-y-2">
                  {draftSteps.map((s, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/40">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Langkah #{idx + 1}</span>
                        {draftSteps.length > 1 && (
                          <button onClick={() => removeDraftStep(idx)} className="text-red-500 hover:text-red-700">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Role</span>
                          <select value={s.role_id} onChange={(e) => updateDraftStep(idx, { role_id: e.target.value })} className={inputCls}>
                            <option value="">— Pilih Role —</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Label Langkah</span>
                          <input value={s.step_label} onChange={(e) => updateDraftStep(idx, { step_label: e.target.value })} className={inputCls} placeholder="Mis. Review oleh Kepala" />
                        </label>
                      </div>
                      <label className="mt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={s.is_info_only}
                          onChange={(e) => updateDraftStep(idx, { is_info_only: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">Hanya informasi (tidak butuh persetujuan)</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Batal</button>
              <button onClick={handleCreate} disabled={saving} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import {
  Plus, Edit, Trash2, X, GitBranch, Check, AlertCircle,
  ArrowDown, ToggleLeft, ToggleRight, Info, GripVertical
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  steps?: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  workflow_template_id: string;
  step_order: number;
  role_id: string | null;
  step_label: string;
  is_info_only: boolean;
  role?: { id: string; name: string; level: number };
}

interface Role {
  id: string;
  name: string;
  level: number;
}

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [templateForm, setTemplateForm] = useState({ name: '', description: '' });
  const [stepForm, setStepForm] = useState({ step_order: 1, role_id: '', step_label: '', is_info_only: false });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [wfRes, rolesRes, stepsRes] = await Promise.all([
      supabase.from('workflow_templates').select('*').order('name'),
      supabase.from('roles').select('id, name, level').order('level', { ascending: false }),
      supabase.from('workflow_steps').select('*, roles(id, name, level)').order('step_order'),
    ]);

    const fetchedTemplates: WorkflowTemplate[] = (wfRes.data || []).map((t: any) => ({
      ...t,
      steps: (stepsRes.data || [])
        .filter((s: any) => s.workflow_template_id === t.id)
        .map((s: any) => ({ ...s, role: s.roles })),
    }));

    setTemplates(fetchedTemplates);
    setRoles(rolesRes.data || []);
    setLoading(false);

    if (selectedTemplate) {
      const updated = fetchedTemplates.find(t => t.id === selectedTemplate.id);
      if (updated) setSelectedTemplate(updated);
    }
  }

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateForm({ name: '', description: '' });
    setError('');
    setShowTemplateModal(true);
  }

  function openEditTemplate(t: WorkflowTemplate) {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, description: t.description });
    setError('');
    setShowTemplateModal(true);
  }

  function openAddStep() {
    const nextOrder = ((selectedTemplate?.steps || []).length) + 1;
    setEditingStep(null);
    setStepForm({ step_order: nextOrder, role_id: '', step_label: '', is_info_only: false });
    setError('');
    setShowStepModal(true);
  }

  function openEditStep(s: WorkflowStep) {
    setEditingStep(s);
    setStepForm({ step_order: s.step_order, role_id: s.role_id || '', step_label: s.step_label, is_info_only: s.is_info_only });
    setError('');
    setShowStepModal(true);
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingTemplate) {
        const { error: err } = await supabase.from('workflow_templates')
          .update({ name: templateForm.name, description: templateForm.description, updated_at: new Date().toISOString() })
          .eq('id', editingTemplate.id);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase.from('workflow_templates')
          .insert({ name: templateForm.name, description: templateForm.description });
        if (err) throw new Error(err.message);
      }
      setShowTemplateModal(false);
      fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleSaveStep(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;
    setSaving(true);
    setError('');
    const payload = {
      workflow_template_id: selectedTemplate.id,
      step_order: stepForm.step_order,
      role_id: stepForm.role_id || null,
      step_label: stepForm.step_label,
      is_info_only: stepForm.is_info_only,
    };
    try {
      if (editingStep) {
        const { error: err } = await supabase.from('workflow_steps').update(payload).eq('id', editingStep.id);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase.from('workflow_steps').insert(payload);
        if (err) throw new Error(err.message);
      }
      setShowStepModal(false);
      fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function deleteTemplate(id: string) {
    await supabase.from('workflow_templates').delete().eq('id', id);
    setDeleteTemplateId(null);
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
    fetchData();
  }

  async function deleteStep(id: string) {
    await supabase.from('workflow_steps').delete().eq('id', id);
    setDeleteStepId(null);
    fetchData();
  }

  async function toggleTemplate(t: WorkflowTemplate) {
    await supabase.from('workflow_templates').update({ is_active: !t.is_active }).eq('id', t.id);
    fetchData();
  }

  const getLevelColor = (level?: number) => {
    if (!level) return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    if (level >= 100) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    if (level >= 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (level >= 50) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workflow Approval</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola template alur persetujuan untuk fasilitas sekolah</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">Template Workflow</h2>
              <button onClick={openCreateTemplate}
                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm"><GitBranch className="w-8 h-8 mx-auto mb-2 text-slate-300" />Belum ada workflow</div>
              ) : templates.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t)}
                  className={cn('w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left',
                    selectedTemplate?.id === t.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 border border-transparent',
                    !t.is_active && 'opacity-50')}>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    selectedTemplate?.id === t.id ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700')}>
                    <GitBranch className={cn('w-4 h-4', selectedTemplate?.id === t.id ? 'text-white' : 'text-slate-500')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t.name}</div>
                    <div className="text-xs text-slate-500">{(t.steps || []).length} langkah</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); toggleTemplate(t); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                      {t.is_active ? <ToggleRight className="w-5 h-5 text-blue-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); openEditTemplate(t); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDeleteTemplateId(t.id); }} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Steps editor */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center h-64">
              <div className="text-center"><GitBranch className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" /><p className="text-slate-500">Pilih workflow untuk mengelola langkah-langkahnya</p></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">{selectedTemplate.name}</h2>
                  {selectedTemplate.description && <p className="text-xs text-slate-500 mt-0.5">{selectedTemplate.description}</p>}
                </div>
                <button onClick={openAddStep}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" /> Tambah Langkah
                </button>
              </div>

              <div className="p-5">
                {/* Visual chain */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center gap-1 flex-wrap text-xs">
                    <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-medium">Pengaju</span>
                    {(selectedTemplate.steps || []).map((step, i) => (
                      <div key={step.id} className="flex items-center gap-1">
                        <ArrowDown className="w-3 h-3 text-blue-400 rotate-[-90deg]" />
                        <span className={cn('px-2.5 py-1 rounded-full font-medium',
                          step.is_info_only
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 italic'
                            : 'bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300')}>
                          {step.role?.name || step.step_label}{step.is_info_only && ' *'}
                        </span>
                      </div>
                    ))}
                    {(selectedTemplate.steps || []).length > 0 && (
                      <>
                        <ArrowDown className="w-3 h-3 text-emerald-400 rotate-[-90deg]" />
                        <span className="px-2.5 py-1 bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">Disetujui</span>
                      </>
                    )}
                  </div>
                  {(selectedTemplate.steps || []).some(s => s.is_info_only) && (
                    <p className="text-xs text-slate-500 mt-2">* Hanya mengetahui, bukan pemberi persetujuan utama</p>
                  )}
                </div>

                {/* Steps list */}
                {(selectedTemplate.steps || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Belum ada langkah — tambahkan langkah persetujuan</div>
                ) : (
                  <div className="space-y-2">
                    {(selectedTemplate.steps || []).map((step, idx) => (
                      <div key={step.id}>
                        <div className={cn('flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
                          step.is_info_only
                            ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30'
                            : 'border-blue-200 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/10')}>
                          <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{step.step_order}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{step.step_label}</span>
                              {step.role && (
                                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getLevelColor(step.role.level))}>{step.role.name}</span>
                              )}
                              {step.is_info_only && (
                                <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                  <Info className="w-3 h-3" />Mengetahui
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => openEditStep(step)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors text-slate-500">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteStepId(step.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {idx < (selectedTemplate.steps || []).length - 1 && (
                          <div className="flex justify-center py-1"><ArrowDown className="w-4 h-4 text-blue-300" /></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingTemplate ? 'Edit Workflow' : 'Buat Workflow Baru'}</h2>
                <button onClick={() => setShowTemplateModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
                {error && <p className="text-sm text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Workflow</label>
                  <input value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Contoh: Workflow Sarpras" required
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                  <textarea value={templateForm.description} onChange={e => setTemplateForm(p => ({ ...p, description: e.target.value }))}
                    rows={2} placeholder="Digunakan untuk..." className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowTemplateModal(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Modal */}
      <AnimatePresence>
        {showStepModal && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingStep ? 'Edit Langkah' : 'Tambah Langkah'}</h2>
                <button onClick={() => setShowStepModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveStep} className="p-6 space-y-4">
                {error && <p className="text-sm text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">{error}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Urutan</label>
                    <input type="number" min={1} value={stepForm.step_order} onChange={e => setStepForm(p => ({ ...p, step_order: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role Approver</label>
                    <select value={stepForm.role_id} onChange={e => setStepForm(p => ({ ...p, role_id: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Tidak ditentukan</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Label Langkah</label>
                  <input value={stepForm.step_label} onChange={e => setStepForm(p => ({ ...p, step_label: e.target.value }))}
                    placeholder="Contoh: Persetujuan Pembina" required
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl cursor-pointer">
                  <div onClick={() => setStepForm(p => ({ ...p, is_info_only: !p.is_info_only }))}
                    className={cn('w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                      stepForm.is_info_only ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-600')}>
                    <div className={cn('absolute w-4 h-4 bg-white rounded-full top-1 transition-all shadow-sm',
                      stepForm.is_info_only ? 'left-6' : 'left-1')} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Hanya Mengetahui</div>
                    <div className="text-xs text-slate-500">Tidak wajib memberikan persetujuan</div>
                  </div>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowStepModal(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirms */}
      <AnimatePresence>
        {(deleteTemplateId || deleteStepId) && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-500" /></div>
              <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">{deleteTemplateId ? 'Hapus Workflow?' : 'Hapus Langkah?'}</h3>
              <p className="text-sm text-slate-500 text-center mb-6">{deleteTemplateId ? 'Semua langkah dalam workflow ini akan ikut dihapus.' : 'Langkah ini akan dihapus dari alur persetujuan.'}</p>
              <div className="flex gap-3">
                <button onClick={() => { setDeleteTemplateId(null); setDeleteStepId(null); }} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm">Batal</button>
                <button onClick={() => deleteTemplateId ? deleteTemplate(deleteTemplateId) : deleteStep(deleteStepId!)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm">Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

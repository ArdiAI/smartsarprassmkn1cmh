import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Pencil, Trash2, Workflow, X, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface Template { id: string; name: string; description: string; is_active: boolean; }
interface Step { id: string; workflow_template_id: string; step_order: number; role_id: string | null; step_label: string; is_info_only: boolean; }
interface Role { id: string; name: string; }

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [steps, setSteps] = useState<Record<string, Step[]>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [tplModal, setTplModal] = useState<{ tpl: Template | null; open: boolean }>({ tpl: null, open: false });
  const [tplForm, setTplForm] = useState({ name: '', description: '', is_active: true });
  const [stepModal, setStepModal] = useState<{ step: Step | null; open: boolean }>({ step: null, open: false });
  const [stepForm, setStepForm] = useState({ step_order: 1, role_id: '', step_label: '', is_info_only: false });

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const [{ data: tpls }, { data: sts }, { data: rls }] = await Promise.all([
      supabase.from('workflow_templates').select('*').order('name'),
      supabase.from('workflow_steps').select('*').order('step_order'),
      supabase.from('roles').select('id, name').order('level', { ascending: false }),
    ]);
    setTemplates(tpls || []);
    setRoles(rls || []);
    const stepMap: Record<string, Step[]> = {};
    (sts || []).forEach(s => {
      if (!stepMap[s.workflow_template_id]) stepMap[s.workflow_template_id] = [];
      stepMap[s.workflow_template_id].push(s);
    });
    setSteps(stepMap);
    if (tpls && tpls.length > 0 && !selectedTemplate) setSelectedTemplate(tpls[0].id);
    setLoading(false);
  }

  async function saveTemplate() {
    if (tplModal.tpl) {
      await supabase.from('workflow_templates').update(tplForm).eq('id', tplModal.tpl.id);
    } else {
      await supabase.from('workflow_templates').insert(tplForm);
    }
    setTplModal({ tpl: null, open: false });
    fetch();
  }

  async function delTemplate(id: string) {
    if (!confirm('Hapus template ini? Semua step akan ikut terhapus.')) return;
    await supabase.from('workflow_templates').delete().eq('id', id);
    fetch();
  }

  async function saveStep() {
    const data = { ...stepForm, workflow_template_id: selectedTemplate, role_id: stepForm.role_id || null };
    if (stepModal.step) {
      await supabase.from('workflow_steps').update(data).eq('id', stepModal.step.id);
    } else {
      await supabase.from('workflow_steps').insert(data);
    }
    setStepModal({ step: null, open: false });
    setStepForm({ step_order: 1, role_id: '', step_label: '', is_info_only: false });
    fetch();
  }

  async function delStep(id: string) {
    await supabase.from('workflow_steps').delete().eq('id', id);
    fetch();
  }

  async function moveStep(step: Step, dir: 'up' | 'down') {
    const templateSteps = steps[selectedTemplate!] || [];
    const idx = templateSteps.findIndex(s => s.id === step.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= templateSteps.length) return;
    const swapStep = templateSteps[swapIdx];
    await Promise.all([
      supabase.from('workflow_steps').update({ step_order: swapStep.step_order }).eq('id', step.id),
      supabase.from('workflow_steps').update({ step_order: step.step_order }).eq('id', swapStep.id),
    ]);
    fetch();
  }

  async function toggleActive(tpl: Template) {
    await supabase.from('workflow_templates').update({ is_active: !tpl.is_active }).eq('id', tpl.id);
    fetch();
  }

  if (loading) return <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />;

  const currentSteps = steps[selectedTemplate || ''] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approval Workflow</h1>
          <p className="text-slate-600 dark:text-slate-400">Konfigurasi alur persetujuan bertahap</p>
        </div>
        <button onClick={() => { setTplForm({ name: '', description: '', is_active: true }); setTplModal({ tpl: null, open: true }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah Template
        </button>
      </div>

      {/* Template tabs */}
      <div className="flex gap-2 flex-wrap">
        {templates.map(t => (
          <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors',
              selectedTemplate === t.id ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            )}>
            <Workflow className="w-4 h-4" /> {t.name}
            <span className={cn('w-2 h-2 rounded-full', t.is_active ? 'bg-green-500' : 'bg-slate-400')} />
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">{templates.find(t => t.id === selectedTemplate)?.name}</h2>
              <p className="text-xs text-slate-500">{templates.find(t => t.id === selectedTemplate)?.description || '-'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(templates.find(t => t.id === selectedTemplate)!)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
                  templates.find(t => t.id === selectedTemplate)?.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'
                )}>
                {templates.find(t => t.id === selectedTemplate)?.is_active ? 'Aktif' : 'Nonaktif'}
              </button>
              <button onClick={() => { const t = templates.find(t => t.id === selectedTemplate)!; setTplForm({ name: t.name, description: t.description, is_active: t.is_active }); setTplModal({ tpl: t, open: true }); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-500" /></button>
              <button onClick={() => delTemplate(selectedTemplate)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>

          {/* Visual chain */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500">Pengaju</span>
              {currentSteps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  <span className={cn('text-xs px-2 py-1 rounded-md',
                    s.is_info_only ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>
                    {s.is_info_only && '~'}{s.step_label}
                  </span>
                </div>
              ))}
              {currentSteps.length > 0 && <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
              <span className="text-xs px-2 py-1 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">Disetujui</span>
            </div>
          </div>

          {/* Steps list */}
          <div className="p-4 space-y-2">
            {currentSteps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                <div className="flex flex-col">
                  <button onClick={() => moveStep(s, 'up')} disabled={i === 0} className="p-0.5 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveStep(s, 'down')} disabled={i === currentSteps.length - 1} className="p-0.5 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                </div>
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">{s.step_order}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{s.step_label}</p>
                  <p className="text-xs text-slate-400">{roles.find(r => r.id === s.role_id)?.name || '-'}{s.is_info_only && ' (Info only)'}</p>
                </div>
                <button onClick={() => { setStepForm({ step_order: s.step_order, role_id: s.role_id || '', step_label: s.step_label, is_info_only: s.is_info_only }); setStepModal({ step: s, open: true }); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-500" /></button>
                <button onClick={() => delStep(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            ))}
            <button onClick={() => { setStepForm({ step_order: currentSteps.length + 1, role_id: '', step_label: '', is_info_only: false }); setStepModal({ step: null, open: true }); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 hover:border-blue-300 hover:text-blue-500">
              <Plus className="w-4 h-4" /> Tambah Step
            </button>
          </div>
        </div>
      )}

      {/* Template modal */}
      {tplModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setTplModal({ tpl: null, open: false })}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tplModal.tpl ? 'Edit Template' : 'Tambah Template'}</h2>
              <button onClick={() => setTplModal({ tpl: null, open: false })}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={tplForm.name} onChange={e => setTplForm({ ...tplForm, name: e.target.value })} placeholder="Nama Template" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
              <textarea value={tplForm.description} onChange={e => setTplForm({ ...tplForm, description: e.target.value })} placeholder="Deskripsi" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none" />
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={tplForm.is_active} onChange={e => setTplForm({ ...tplForm, is_active: e.target.checked })} /> Aktif
              </label>
              <button onClick={saveTemplate} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Step modal */}
      {stepModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setStepModal({ step: null, open: false })}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{stepModal.step ? 'Edit Step' : 'Tambah Step'}</h2>
              <button onClick={() => setStepModal({ step: null, open: false })}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Urutan Step</label>
                <input type="number" value={stepForm.step_order} onChange={e => setStepForm({ ...stepForm, step_order: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Label Step</label>
                <input value={stepForm.step_label} onChange={e => setStepForm({ ...stepForm, step_label: e.target.value })} placeholder="contoh: Persetujuan Pembina" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Role Approver</label>
                <select value={stepForm.role_id} onChange={e => setStepForm({ ...stepForm, role_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
                  <option value="">Pilih Role...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={stepForm.is_info_only} onChange={e => setStepForm({ ...stepForm, is_info_only: e.target.checked })} /> Info only (tidak perlu approval, hanya diketahui)
              </label>
              <button onClick={saveStep} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

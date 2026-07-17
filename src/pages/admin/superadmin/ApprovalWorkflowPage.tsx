import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Workflow, Plus, Trash2, X, ChevronRight, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function ApprovalWorkflowPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', steps: [{ step_order: 1, step_label: '', role_name: '', is_info_only: false }] });

  useEffect(() => { fetch(); }, []);
  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from('workflow_templates').select('*, workflow_steps(*)').order('created_at', { ascending: false });
    if (data) { data.forEach((t: any) => t.workflow_steps?.sort((a: any, b: any) => a.step_order - b.step_order)); setTemplates(data); }
    setLoading(false);
  }
  async function add() {
    const { data: t } = await supabase.from('workflow_templates').insert({ name: form.name, description: form.description, is_active: true }).select().single();
    if (t && form.steps.length > 0) { await supabase.from('workflow_steps').insert(form.steps.map(s => ({ template_id: t.id, step_order: s.step_order, step_label: s.step_label, role_name: s.role_name, is_info_only: s.is_info_only }))); }
    setForm({ name: '', description: '', steps: [{ step_order: 1, step_label: '', role_name: '', is_info_only: false }] }); setShowAdd(false); fetch();
  }
  async function toggle(id: string, active: boolean) { await supabase.from('workflow_templates').update({ is_active: !active }).eq('id', id); fetch(); }
  async function remove(id: string) { if (!confirm('Hapus template ini?')) return; await supabase.from('workflow_templates').delete().eq('id', id); fetch(); }
  function addStep() { setForm({ ...form, steps: [...form.steps, { step_order: form.steps.length + 1, step_label: '', role_name: '', is_info_only: false }] }); }
  function updStep(idx: number, field: string, val: any) { const s = [...form.steps]; (s[idx] as any)[field] = val; setForm({ ...form, steps: s }); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approval Workflow</h1><p className="text-slate-600 dark:text-slate-400">Kelola template alur persetujuan</p></div><button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"><Plus className="w-4 h-4" /> Tambah Template</button></div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />)}</div> : templates.length === 0 ? <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center"><Workflow className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">Belum ada template</p></div> : (
        <div className="space-y-3">{templates.map(t => <div key={t.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Workflow className="w-5 h-5 text-white" /></div><div><h3 className="font-semibold text-slate-900 dark:text-white">{t.name}</h3><p className="text-xs text-slate-400">{t.description}</p></div></div><div className="flex items-center gap-2"><button onClick={() => toggle(t.id, t.is_active)} className={cn('p-1.5 rounded-lg', t.is_active ? 'text-emerald-500' : 'text-slate-400')}>{t.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button><button onClick={() => remove(t.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button></div></div>{t.workflow_steps && t.workflow_steps.length > 0 && <div className="mt-3 flex items-center gap-1 flex-wrap">{t.workflow_steps.map((s: any, i: number) => <div key={s.id} className="flex items-center gap-1">{i > 0 && <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />}<span className={cn('text-xs px-2 py-1 rounded-lg', s.is_info_only ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400')}>{s.step_label} <span className="opacity-60">({s.role_name})</span></span></div>)}</div>}</div>)}</div>
      )}
      {showAdd && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}><div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Template</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div><div className="space-y-3"><div><label className="text-sm text-slate-600 dark:text-slate-400">Nama Template</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div><div><label className="text-sm text-slate-600 dark:text-slate-400">Deskripsi</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm mt-1" /></div><div><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Steps</label>{form.steps.map((s, i) => <div key={i} className="flex items-center gap-2 mt-2"><span className="text-sm text-slate-400 w-6">{i + 1}.</span><input value={s.step_label} onChange={e => updStep(i, 'step_label', e.target.value)} placeholder="Label" className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /><input value={s.role_name} onChange={e => updStep(i, 'role_name', e.target.value)} placeholder="Role" className="w-32 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" /><label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={s.is_info_only} onChange={e => updStep(i, 'is_info_only', e.target.checked)} /> Info</label></div>)}</div><button onClick={addStep} className="text-sm text-blue-500 hover:text-blue-600">+ Tambah Step</button></div><button onClick={add} className="w-full mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Simpan</button></div></div>}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { Plus, Edit, Trash2, X, GitBranch, Check, AlertCircle, Clock, ToggleLeft, ToggleRight, ArrowDown } from 'lucide-react';

interface ApprovalWorkflow {
  id: string;
  module: string;
  step_order: number;
  approver_role_id: string | null;
  auto_approve_minutes: number | null;
  is_active: boolean;
  notes: string;
  role?: { id: string; name: string; level: number };
}

interface Role {
  id: string;
  name: string;
  level: number;
}

const MODULE_OPTIONS = [
  { value: 'borrowings', label: 'Peminjaman Fasilitas/Inventaris' },
  { value: 'proposals', label: 'Pengajuan Proposal' },
  { value: 'reports', label: 'Laporan Kerusakan' },
  { value: 'kavling', label: 'Pemesanan Kavling' },
];

const MODULE_COLORS: Record<string, string> = {
  borrowings: 'blue', proposals: 'emerald', reports: 'amber', kavling: 'rose',
};

export default function ApprovalWorkflowPage() {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    module: 'borrowings', step_order: 1, approver_role_id: '',
    auto_approve_minutes: '', is_active: true, notes: '',
  });

  const grouped = MODULE_OPTIONS.reduce((acc, m) => {
    acc[m.value] = workflows.filter(w => w.module === m.value).sort((a, b) => a.step_order - b.step_order);
    return acc;
  }, {} as Record<string, ApprovalWorkflow[]>);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [wfRes, rolesRes] = await Promise.all([
      supabase.from('approval_workflows').select('*, roles(id, name, level)').order('module').order('step_order'),
      supabase.from('roles').select('id, name, level').order('level', { ascending: false }),
    ]);
    setWorkflows((wfRes.data || []).map((w: any) => ({ ...w, role: w.roles })));
    setRoles(rolesRes.data || []);
    setLoading(false);
  }

  function openCreate(module = 'borrowings') {
    const existingSteps = grouped[module]?.length || 0;
    setEditingWorkflow(null);
    setFormData({
      module, step_order: existingSteps + 1, approver_role_id: '',
      auto_approve_minutes: '', is_active: true, notes: '',
    });
    setError('');
    setShowModal(true);
  }

  function openEdit(wf: ApprovalWorkflow) {
    setEditingWorkflow(wf);
    setFormData({
      module: wf.module,
      step_order: wf.step_order,
      approver_role_id: wf.approver_role_id || '',
      auto_approve_minutes: wf.auto_approve_minutes?.toString() || '',
      is_active: wf.is_active,
      notes: wf.notes || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      module: formData.module,
      step_order: formData.step_order,
      approver_role_id: formData.approver_role_id || null,
      auto_approve_minutes: formData.auto_approve_minutes ? parseInt(formData.auto_approve_minutes) : null,
      is_active: formData.is_active,
      notes: formData.notes,
      updated_at: new Date().toISOString(),
    };
    try {
      const { error: err } = editingWorkflow
        ? await supabase.from('approval_workflows').update(payload).eq('id', editingWorkflow.id)
        : await supabase.from('approval_workflows').insert(payload);
      if (err) throw new Error(err.message);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('approval_workflows').delete().eq('id', id);
    setDeleteId(null);
    fetchData();
  }

  async function toggleActive(wf: ApprovalWorkflow) {
    await supabase.from('approval_workflows').update({ is_active: !wf.is_active }).eq('id', wf.id);
    fetchData();
  }

  const getLevelColor = (level?: number) => {
    if (!level) return 'bg-slate-100 text-slate-500';
    if (level >= 100) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    if (level >= 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (level >= 50) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workflow Approval</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Konfigurasi rantai persetujuan untuk setiap modul</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {MODULE_OPTIONS.map(mod => (
            <div key={mod.value} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{mod.label}</h3>
                    <p className="text-xs text-slate-500">{grouped[mod.value]?.length || 0} langkah persetujuan</p>
                  </div>
                </div>
                <button onClick={() => openCreate(mod.value)}
                  className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4">
                {(grouped[mod.value] || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    <GitBranch className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Belum ada langkah approval dikonfigurasi
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(grouped[mod.value] || []).map((wf, idx) => (
                      <div key={wf.id}>
                        <div className={cn(
                          'flex items-start gap-3 p-3 rounded-xl border-2 transition-all',
                          wf.is_active
                            ? 'border-blue-200 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-900/10'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 opacity-60'
                        )}>
                          <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {wf.step_order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {wf.role ? (
                                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getLevelColor(wf.role.level))}>
                                  {wf.role.name}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Tidak ada approver</span>
                              )}
                              {wf.auto_approve_minutes && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="w-3 h-3" /> Auto {Math.floor(wf.auto_approve_minutes / 60)}j
                                </span>
                              )}
                            </div>
                            {wf.notes && <p className="text-xs text-slate-500 line-clamp-1">{wf.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => toggleActive(wf)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors">
                              {wf.is_active
                                ? <ToggleRight className="w-5 h-5 text-blue-500" />
                                : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                            </button>
                            <button onClick={() => openEdit(wf)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors text-slate-500">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(wf.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {idx < (grouped[mod.value] || []).length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="w-4 h-4 text-slate-300" />
                          </div>
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
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingWorkflow ? 'Edit Langkah Approval' : 'Tambah Langkah Approval'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Modul</label>
                  <select value={formData.module} onChange={e => setFormData(p => ({ ...p, module: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {MODULE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Urutan Langkah</label>
                  <input type="number" min={1} value={formData.step_order}
                    onChange={e => setFormData(p => ({ ...p, step_order: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role Approver</label>
                  <select value={formData.approver_role_id} onChange={e => setFormData(p => ({ ...p, approver_role_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Tidak ada role tertentu</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name} (Lv.{r.level})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Auto-Approve setelah (menit) <span className="text-slate-400 font-normal">— kosongkan untuk non-auto</span>
                  </label>
                  <input type="number" min={1} value={formData.auto_approve_minutes}
                    onChange={e => setFormData(p => ({ ...p, auto_approve_minutes: e.target.value }))}
                    placeholder="Contoh: 2880 = 48 jam"
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Catatan</label>
                  <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    rows={2} placeholder="Deskripsi langkah approval ini..."
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}
                    className={cn('w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                      formData.is_active ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600')}>
                    <div className={cn('absolute w-4 h-4 bg-white rounded-full top-1 transition-all',
                      formData.is_active ? 'left-6' : 'left-1')} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Langkah Aktif</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">Hapus Langkah?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">Langkah approval ini akan dihapus dari alur persetujuan.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm">Batal</button>
                <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm">Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Building2, MapPin, Users, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

interface Facility {
  id: string; name: string; location: string; capacity: number; status: string;
  category: string; facility_type: string; workflow_template_id: string | null;
  image_url: string; workflow_templates?: { name: string } | null;
}
interface WorkflowTemplate { id: string; name: string; }
interface FormState {
  name: string; location: string; capacity: string; status: string;
  category: string; facility_type: string; workflow_template_id: string;
}
const emptyForm: FormState = { name: '', location: '', capacity: '0', status: 'aktif', category: 'umum', facility_type: 'ruangan', workflow_template_id: '' };
const statusColor: Record<string, string> = {
  aktif: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  tidak_aktif: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  maintenance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function FacilitiesAdminPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const [{ data: fac }, { data: tmpl }] = await Promise.all([
      supabase.from('facilities').select('*, workflow_templates(name)').order('name'),
      supabase.from('workflow_templates').select('id, name').order('name'),
    ]);
    setFacilities((fac as unknown as Facility[]) || []);
    setTemplates((tmpl as WorkflowTemplate[]) || []);
    setLoading(false);
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(fac: Facility) {
    setEditing(fac);
    setForm({
      name: fac.name, location: fac.location || '', capacity: String(fac.capacity || 0),
      status: fac.status || 'aktif', category: fac.category || 'umum',
      facility_type: fac.facility_type || 'ruangan', workflow_template_id: fac.workflow_template_id || '',
    });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      name: form.name, location: form.location, capacity: Number(form.capacity),
      status: form.status, category: form.category, facility_type: form.facility_type,
      workflow_template_id: form.workflow_template_id || null,
    };
    if (editing) {
      await supabase.from('facilities').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('facilities').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetch();
  }

  async function remove(id: string) {
    if (!confirm('Hapus fasilitas ini?')) return;
    await supabase.from('facilities').delete().eq('id', id);
    fetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="text-slate-600 dark:text-slate-400">Kelola data fasilitas sekolah</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada fasilitas</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map(fac => (
            <div key={fac.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor[fac.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400')}>{fac.status || 'aktif'}</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{fac.name}</h3>
              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {fac.location && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{fac.location}</p>}
                <p className="flex items-center gap-1"><Users className="w-3 h-3" />Kapasitas: {fac.capacity || 0}</p>
                <p className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">{fac.category || 'umum'}</span><span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">{fac.facility_type || 'ruangan'}</span></p>
                {fac.workflow_templates?.name && <p className="text-blue-500">Workflow: {fac.workflow_templates.name}</p>}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => openEdit(fac)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => remove(fac.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Fasilitas' : 'Tambah Fasilitas'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Nama</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Lokasi</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kapasitas</label>
                <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="aktif">Aktif</option><option value="tidak_aktif">Tidak Aktif</option><option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipe Fasilitas</label>
                <input type="text" value={form.facility_type} onChange={e => setForm(f => ({ ...f, facility_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Workflow Template</label>
                <select value={form.workflow_template_id} onChange={e => setForm(f => ({ ...f, workflow_template_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="">-</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={save} disabled={saving || !form.name} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

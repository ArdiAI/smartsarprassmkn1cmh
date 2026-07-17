import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { Plus, Pencil, Trash2, Building2, X, AlertTriangle, MapPin, Users } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  location: string;
  capacity: number;
  status: string;
  category: string;
  facility_type: string;
  workflow_template_id: string | null;
}
interface WorkflowTemplate { id: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  aktif: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  nonaktif: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const EMPTY: Omit<Facility, 'id'> = { name: '', location: '', capacity: 0, status: 'aktif', category: 'umum', facility_type: 'ruangan', workflow_template_id: null };

export default function FacilitiesAdminPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [fRes, tRes] = await Promise.all([
      supabase.from('facilities').select('*').order('created_at', { ascending: false }),
      supabase.from('workflow_templates').select('id, name').eq('is_active', true),
    ]);
    if (fRes.data) setFacilities(fRes.data as Facility[]);
    if (tRes.data) setTemplates(tRes.data as WorkflowTemplate[]);
    setLoading(false);
  }

  function openAdd() { setEditId(null); setForm(EMPTY); setError(''); setModalOpen(true); }
  function openEdit(f: Facility) { setEditId(f.id); setForm({ ...f }); setError(''); setModalOpen(true); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      if (!form.name.trim()) throw new Error('Nama wajib diisi');
      const payload = { ...form, capacity: Number(form.capacity) };
      if (editId) {
        const { error: e } = await supabase.from('facilities').update(payload).eq('id', editId);
        if (e) throw new Error(e.message);
      } else {
        const { error: e } = await supabase.from('facilities').insert(payload);
        if (e) throw new Error(e.message);
      }
      setModalOpen(false); fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus fasilitas ini?')) return;
    const { error } = await supabase.from('facilities').delete().eq('id', id);
    if (error) alert(error.message); else fetchData();
  }

  const templateName = (id: string | null) => templates.find(t => t.id === id)?.name || '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Fasilitas</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Tambah, ubah, dan hapus fasilitas</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Tambah Fasilitas
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />)}</div>
      ) : facilities.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada fasilitas</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map(f => (
            <div key={f.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white flex-shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', STATUS_COLORS[f.status] || 'bg-slate-100')}>{f.status}</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{f.name}</h3>
              <div className="space-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-1">
                <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {f.location || '-'}</p>
                <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Kapasitas: {f.capacity}</p>
                <p>Kategori: {f.category} · Tipe: {f.facility_type}</p>
                <p>Workflow: {templateName(f.workflow_template_id)}</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => openEdit(f)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 text-sm font-medium hover:bg-blue-200"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => handleDelete(f.id)} className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editId ? 'Edit Fasilitas' : 'Tambah Fasilitas'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Nama" value={form.name} onChange={v => setForm({ ...form, name: v })} />
              <Field label="Lokasi" value={form.location} onChange={v => setForm({ ...form, location: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kapasitas" type="number" value={String(form.capacity)} onChange={v => setForm({ ...form, capacity: Number(v) })} />
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                    <option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option><option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kategori" value={form.category} onChange={v => setForm({ ...form, category: v })} />
                <Field label="Tipe Fasilitas" value={form.facility_type} onChange={v => setForm({ ...form, facility_type: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Template Workflow</label>
                <select value={form.workflow_template_id || ''} onChange={e => setForm({ ...form, workflow_template_id: e.target.value || null })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
                  <option value="">-</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"><AlertTriangle className="w-4 h-4 text-red-500" /><p className="text-sm text-red-700 dark:text-red-400">{error}</p></div>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white" />
    </div>
  );
}

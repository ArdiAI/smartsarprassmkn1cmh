import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { Plus, Search, Edit, Trash2, X, Building2, MapPin, Users, Check, GitBranch } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  image_url: string;
  facility_type: string;
  category: string;
  department: string;
  status: string;
  workflow_template_id: string | null;
  workflow_templates?: { id: string; name: string } | null;
  created_at: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
}

const FACILITY_TYPES = ['ruangan', 'lab', 'workshop', 'aula', 'lapangan', 'gudang', 'bengkel', 'lainnya'];
const FACILITY_CATEGORIES = ['umum', 'jurusan', 'olahraga', 'seni', 'administrasi'];
const FACILITY_STATUSES = [
  { value: 'aktif', label: 'Aktif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'perbaikan', label: 'Perbaikan', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'tidak_aktif', label: 'Tidak Aktif', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

const initialForm = {
  name: '', description: '', location: '', capacity: 0, image_url: '',
  facility_type: 'ruangan', category: 'umum', department: '',
  status: 'aktif', workflow_template_id: '',
};

export default function FacilitiesAdminPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [facRes, wfRes] = await Promise.all([
      supabase.from('facilities').select('*, workflow_templates(id, name)').order('name'),
      supabase.from('workflow_templates').select('id, name').eq('is_active', true).order('name'),
    ]);
    setFacilities(facRes.data || []);
    setWorkflows(wfRes.data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditingFacility(null);
    setFormData(initialForm);
    setShowModal(true);
  }

  function openEdit(f: Facility) {
    setEditingFacility(f);
    setFormData({
      name: f.name, description: f.description || '', location: f.location || '',
      capacity: f.capacity || 0, image_url: f.image_url || '',
      facility_type: f.facility_type || 'ruangan', category: f.category || 'umum',
      department: f.department || '', status: f.status || 'aktif',
      workflow_template_id: f.workflow_template_id || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...formData,
      capacity: Number(formData.capacity),
      workflow_template_id: formData.workflow_template_id || null,
    };
    if (editingFacility) {
      await supabase.from('facilities').update(payload).eq('id', editingFacility.id);
    } else {
      await supabase.from('facilities').insert(payload);
    }
    setSaving(false);
    setShowModal(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    await supabase.from('facilities').delete().eq('id', id);
    setDeleteId(null);
    fetchData();
  }

  const filtered = facilities.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || f.facility_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getStatusInfo = (status: string) => FACILITY_STATUSES.find(s => s.value === status) || FACILITY_STATUSES[0];

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola fasilitas sekolah beserta workflow persetujuan</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium shadow-lg hover:shadow-blue-500/30 transition-all">
          <Plus className="w-4 h-4" /> Tambah Fasilitas
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari fasilitas..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Semua Jenis</option>
          {FACILITY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((f, i) => {
            const statusInfo = getStatusInfo(f.status);
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden group">
                <div className="relative">
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-blue-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium shadow-sm', statusInfo.color)}>{statusInfo.label}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button onClick={() => openEdit(f)} className="p-2.5 bg-white rounded-xl hover:bg-blue-50 text-blue-600 shadow-lg"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => setDeleteId(f.id)} className="p-2.5 bg-white rounded-xl hover:bg-red-50 text-red-500 shadow-lg"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                    <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full capitalize">{f.facility_type || 'ruangan'}</span>
                  </div>
                  {f.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{f.description}</p>}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {f.location && (
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3" />{f.location}
                      </span>
                    )}
                    {f.capacity > 0 && (
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Users className="w-3 h-3" />{f.capacity} orang
                      </span>
                    )}
                  </div>
                  {f.workflow_templates && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded-lg">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>{f.workflow_templates.name}</span>
                    </div>
                  )}
                  {f.department && (
                    <p className="mt-2 text-xs text-slate-400">Jurusan: {f.department}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingFacility ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {field('Nama Fasilitas', <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nama fasilitas" required className={inputCls} />)}

                {field('Deskripsi', <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Deskripsi singkat..." className={`${inputCls} resize-none`} />)}

                <div className="grid grid-cols-2 gap-4">
                  {field('Jenis', (
                    <select value={formData.facility_type} onChange={e => setFormData(p => ({ ...p, facility_type: e.target.value }))} className={inputCls}>
                      {FACILITY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  ))}
                  {field('Kategori', (
                    <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                      {FACILITY_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {field('Lokasi', <input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="Gedung A, Lantai 2..." className={inputCls} />)}
                  {field('Kapasitas', <input type="number" min={0} value={formData.capacity} onChange={e => setFormData(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))} className={inputCls} />)}
                </div>

                {field('Jurusan (isi jika milik jurusan)', <input value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} placeholder="TKJ / Mekatronika / TKR..." className={inputCls} />)}

                {field('Workflow Approval', (
                  <select value={formData.workflow_template_id} onChange={e => setFormData(p => ({ ...p, workflow_template_id: e.target.value }))} className={inputCls}>
                    <option value="">Gunakan workflow default</option>
                    {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                ))}

                {field('Status', (
                  <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className={inputCls}>
                    {FACILITY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                ))}

                {field('URL Foto', <input value={formData.image_url} onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." className={inputCls} />)}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">Hapus Fasilitas?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">Data fasilitas ini akan dihapus permanen.</p>
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

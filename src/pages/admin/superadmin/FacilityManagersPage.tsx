import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { Plus, Pencil, Trash2, Star, Loader2, X } from 'lucide-react';

interface FacilityManager {
  id: string;
  facility_id: string | null;
  admin_user_id: string | null;
  is_primary: boolean | null;
  notes: string | null;
  assigned_at: string;
}

interface Facility { id: string; name: string }
interface AdminUser { id: string; email: string; name: string | null }

const emptyForm = { facility_id: '', admin_user_id: '', is_primary: false, notes: '' };

export default function FacilityManagersPage() {
  const [managers, setManagers] = useState<FacilityManager[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FacilityManager | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: mgrData }, { data: facData }, { data: admData }] = await Promise.all([
      supabase.from('facility_managers').select('*').order('assigned_at', { ascending: false }),
      supabase.from('facilities').select('id, name').order('name', { ascending: true }),
      supabase.from('admin_users').select('id, email, name').eq('is_active', true).order('email', { ascending: true }),
    ]);
    setManagers((mgrData as unknown as FacilityManager[]) || []);
    setFacilities((facData as unknown as Facility[]) || []);
    setAdmins((admData as unknown as AdminUser[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const facilityName = (id: string | null) => facilities.find(f => f.id === id)?.name ?? '-';
  const adminName = (id: string | null) => {
    const a = admins.find(x => x.id === id);
    return a ? (a.name || a.email) : '-';
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (m: FacilityManager) => {
    setEditing(m);
    setForm({ facility_id: m.facility_id ?? '', admin_user_id: m.admin_user_id ?? '', is_primary: m.is_primary ?? false, notes: m.notes ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.facility_id || !form.admin_user_id) { showToast('Fasilitas dan admin wajib dipilih', 'error'); return; }
    setSaving(true);
    const payload = {
      facility_id: form.facility_id,
      admin_user_id: form.admin_user_id,
      is_primary: form.is_primary,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from('facility_managers').update(payload).eq('id', editing.id);
      if (error) { showToast('Gagal memperbarui: ' + error.message, 'error'); }
      else { showToast('PJ Fasilitas diperbarui', 'success'); setShowModal(false); fetchData(); }
    } else {
      const { error } = await supabase.from('facility_managers').insert(payload);
      if (error) { showToast('Gagal menambah: ' + error.message, 'error'); }
      else { showToast('PJ Fasilitas ditambahkan', 'success'); setShowModal(false); fetchData(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus PJ fasilitas ini?')) return;
    const { error } = await supabase.from('facility_managers').delete().eq('id', id);
    if (error) { showToast('Gagal menghapus', 'error'); }
    else { showToast('PJ Fasilitas dihapus', 'success'); fetchData(); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola penanggung jawab fasilitas</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" /> Tambah PJ
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : managers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Belum ada PJ fasilitas</div>
      ) : (
        <div className="space-y-3">
          {managers.map(m => (
            <div key={m.id} className="card p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900 dark:text-white">{facilityName(m.facility_id)}</p>
                  {m.is_primary && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600"><Star className="w-3 h-3" /> Utama</span>}
                </div>
                <p className="text-sm text-slate-500">{adminName(m.admin_user_id)}</p>
                {m.notes && <p className="text-xs text-slate-400 mt-1">{m.notes}</p>}
              </div>
              <button onClick={() => openEdit(m)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-500" /></button>
              <button onClick={() => handleDelete(m.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editing ? 'Edit PJ' : 'Tambah PJ'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Fasilitas</label>
                <select value={form.facility_id} onChange={e => setForm({ ...form, facility_id: e.target.value })} className="input">
                  <option value="">Pilih fasilitas...</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Admin</label>
                <select value={form.admin_user_id} onChange={e => setForm({ ...form, admin_user_id: e.target.value })} className="input">
                  <option value="">Pilih admin...</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_primary} onChange={e => setForm({ ...form, is_primary: e.target.checked })} className="w-4 h-4 rounded text-blue-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">PJ Utama</span>
                </label>
              </div>
              <div>
                <label className="label">Catatan</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input" rows={3} placeholder="Catatan tambahan" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

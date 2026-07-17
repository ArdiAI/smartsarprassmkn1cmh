import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Trash2, UserCheck, X } from 'lucide-react';

export default function FacilityManagersPage() {
  const [managers, setManagers] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ facility_id: '', admin_user_id: '', is_primary: false, notes: '' });

  useEffect(() => { fetch(); }, []);
  async function fetch() {
    setLoading(true);
    const [{ data: fm }, { data: f }, { data: au }] = await Promise.all([
      supabase.from('facility_managers').select('*, facilities(name), admin_users(name, email)').order('created_at', { ascending: false }),
      supabase.from('facilities').select('id, name').order('name'),
      supabase.from('admin_users').select('id, name, email').order('name'),
    ]);
    setManagers(fm || []); setFacilities(f || []); setAdminUsers(au || []); setLoading(false);
  }
  async function save() { await supabase.from('facility_managers').insert(form); setModal(false); setForm({ facility_id: '', admin_user_id: '', is_primary: false, notes: '' }); fetch(); }
  async function del(id: string) { await supabase.from('facility_managers').delete().eq('id', id); fetch(); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1><p className="text-slate-600 dark:text-slate-400">Assign PJ untuk setiap fasilitas</p></div><button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Assign PJ</button></div>
      {loading ? <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : managers.length === 0 ? <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center"><UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">Belum ada PJ</p></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{managers.map(m => (<div key={m.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"><div className="flex items-start justify-between mb-2"><div><p className="font-medium text-slate-900 dark:text-white">{m.facilities?.name || '-'}</p><p className="text-sm text-slate-500">{m.admin_users?.name || '-'}</p><p className="text-xs text-slate-400">{m.admin_users?.email || ''}</p></div>{m.is_primary && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Utama</span>}</div>{m.notes && <p className="text-xs text-slate-400 mt-2">{m.notes}</p>}<button onClick={() => del(m.id)} className="mt-3 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4 text-red-500" /></button></div>))}</div>
      )}
      {modal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}><div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Assign PJ</h2><button onClick={() => setModal(false)}><X className="w-5 h-5 text-slate-400" /></button></div><div className="space-y-3"><select value={form.facility_id} onChange={e => setForm({ ...form, facility_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"><option value="">Pilih Fasilitas...</option>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><select value={form.admin_user_id} onChange={e => setForm({ ...form, admin_user_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"><option value="">Pilih User...</option>{adminUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_primary} onChange={e => setForm({ ...form, is_primary: e.target.checked })} /> PJ Utama</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan..." rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none" /><button onClick={save} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Simpan</button></div></div></div>)}
    </div>
  );
}

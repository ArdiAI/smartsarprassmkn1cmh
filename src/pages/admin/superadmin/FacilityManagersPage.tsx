import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { Plus, Trash2, X, Building2, UserCheck, Star, Search, Info } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  location: string;
  image_url: string;
  managers?: FacilityManager[];
}

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string;
  assigned_at: string;
  admin_user?: AdminUser;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export default function FacilityManagersPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ admin_user_id: '', is_primary: false, notes: '' });
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [facilitiesRes, adminUsersRes, managersRes] = await Promise.all([
      supabase.from('facilities').select('*').order('name'),
      supabase.from('admin_users').select('id, name, email').order('name'),
      supabase.from('facility_managers').select('*, admin_users(id, name, email)'),
    ]);

    const fetchedFacilities: Facility[] = (facilitiesRes.data || []).map((f: any) => ({
      ...f,
      managers: (managersRes.data || []).filter((m: any) => m.facility_id === f.id).map((m: any) => ({
        ...m,
        admin_user: m.admin_users,
      })),
    }));

    setFacilities(fetchedFacilities);
    setAdminUsers(adminUsersRes.data || []);
    setLoading(false);

    if (selectedFacility) {
      const updated = fetchedFacilities.find(f => f.id === selectedFacility.id);
      if (updated) setSelectedFacility(updated);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFacility) return;
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.from('facility_managers').insert({
        facility_id: selectedFacility.id,
        admin_user_id: formData.admin_user_id,
        is_primary: formData.is_primary,
        notes: formData.notes,
      });
      if (err) throw new Error(err.message);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    await supabase.from('facility_managers').delete().eq('id', id);
    setDeleteId(null);
    fetchData();
  }

  async function togglePrimary(manager: FacilityManager) {
    await supabase.from('facility_managers').update({ is_primary: !manager.is_primary }).eq('id', manager.id);
    fetchData();
  }

  const filtered = facilities.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.location?.toLowerCase().includes(search.toLowerCase())
  );

  const existingManagerIds = (selectedFacility?.managers || []).map(m => m.admin_user_id);
  const availableAdmins = adminUsers.filter(u => !existingManagerIds.includes(u.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Penanggung Jawab Fasilitas</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Tugaskan penanggung jawab untuk setiap fasilitas</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari fasilitas..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((facility, i) => (
            <motion.div key={facility.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md',
                selectedFacility?.id === facility.id ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'
              )}
              onClick={() => setSelectedFacility(facility)}>
              {facility.image_url ? (
                <img src={facility.image_url} alt={facility.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-blue-300" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{facility.name}</h3>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    (facility.managers || []).length > 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}>
                    {(facility.managers || []).length} PJ
                  </span>
                </div>
                {facility.location && (
                  <p className="text-xs text-slate-500 mb-3">{facility.location}</p>
                )}
                {(facility.managers || []).length > 0 ? (
                  <div className="space-y-1.5">
                    {(facility.managers || []).slice(0, 2).map(m => (
                      <div key={m.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {m.admin_user?.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{m.admin_user?.name || m.admin_user?.email}</span>
                        {m.is_primary && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      </div>
                    ))}
                    {(facility.managers || []).length > 2 && (
                      <p className="text-xs text-slate-400">+{(facility.managers || []).length - 2} lainnya</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada penanggung jawab</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedFacility && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">{selectedFacility.name}</h2>
                <p className="text-xs text-slate-500">{selectedFacility.location}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setFormData({ admin_user_id: '', is_primary: false, notes: '' }); setError(''); setShowModal(true); }}
                  disabled={availableAdmins.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <Plus className="w-4 h-4" /> Assign PJ
                </button>
                <button onClick={() => setSelectedFacility(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {(selectedFacility.managers || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500">Belum ada penanggung jawab yang ditugaskan</p>
                {availableAdmins.length === 0 && (
                  <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                    <Info className="w-4 h-4" /> Semua admin sudah ditugaskan ke fasilitas ini
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(selectedFacility.managers || []).map(m => (
                  <div key={m.id} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {m.admin_user?.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                          {m.admin_user?.name || '-'}
                        </span>
                        {m.is_primary && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                            <Star className="w-3 h-3 fill-current" /> Utama
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{m.admin_user?.email}</p>
                      {m.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.notes}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => togglePrimary(m)}
                          className={cn('text-xs px-2 py-1 rounded-lg border transition-colors',
                            m.is_primary
                              ? 'border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100'
                              : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-amber-300 hover:text-amber-600')}>
                          {m.is_primary ? 'Hapus Utama' : 'Set Utama'}
                        </button>
                        <button onClick={() => setDeleteId(m.id)}
                          className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          Cabut
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assign Penanggung Jawab</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAssign} className="p-6 space-y-4">
                {error && <p className="text-sm text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">{error}</p>}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pilih Admin</label>
                  <select value={formData.admin_user_id} onChange={e => setFormData(p => ({ ...p, admin_user_id: e.target.value }))}
                    required className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih admin...</option>
                    {availableAdmins.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Catatan</label>
                  <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    rows={2} placeholder="Tugas atau catatan khusus..."
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <label className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={formData.is_primary} onChange={e => setFormData(p => ({ ...p, is_primary: e.target.checked }))}
                    className="w-4 h-4 rounded accent-amber-500" />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Penanggung Jawab Utama</div>
                    <div className="text-xs text-slate-500">PJ utama mendapat notifikasi prioritas</div>
                  </div>
                  <Star className="w-4 h-4 text-amber-400 ml-auto" />
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-60">
                    {saving ? 'Menyimpan...' : 'Assign'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove Confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2 text-slate-900 dark:text-white">Cabut Penugasan?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">Admin ini tidak akan lagi menjadi PJ fasilitas ini.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm">Batal</button>
                <button onClick={() => handleRemove(deleteId)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm">Cabut</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Building2,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Mail,
  Phone,
  Save,
  Star,
} from 'lucide-react';

// ---- Types ----

interface Facility {
  id: string;
  name: string;
  location: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string;
  assigned_at: string;
  facility?: Facility;
  admin_user?: AdminUser;
}

// ---- Component ----

export default function FacilityManagersPage() {
  const [managers, setManagers] = useState<FacilityManager[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingManager, setEditingManager] = useState<FacilityManager | null>(null);

  // Form state
  const [formFacilityId, setFormFacilityId] = useState('');
  const [formAdminUserId, setFormAdminUserId] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [managersRes, facilitiesRes, adminUsersRes] = await Promise.all([
        supabase
          .from('facility_managers')
          .select(`
            *,
            facility:facilities(id, name, location),
            admin_user:admin_users(id, email, name, role)
          `)
          .order('assigned_at', { ascending: false }),
        supabase.from('facilities').select('id, name, location').order('name', { ascending: true }),
        supabase.from('admin_users').select('id, email, name, role').eq('is_active', true).order('name', { ascending: true }),
      ]);

      if (managersRes.error) throw managersRes.error;
      if (facilitiesRes.error) throw facilitiesRes.error;
      if (adminUsersRes.error) throw adminUsersRes.error;

      setManagers((managersRes.data || []) as unknown as FacilityManager[]);
      setFacilities((facilitiesRes.data || []) as unknown as Facility[]);
      setAdminUsers((adminUsersRes.data || []) as unknown as AdminUser[]);
    } catch (err) {
      console.error('Error fetching facility managers:', err);
      showToast('Gagal memuat data penanggung jawab', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setEditingManager(null);
    setFormFacilityId('');
    setFormAdminUserId('');
    setFormIsPrimary(false);
    setFormNotes('');
    setShowModal(true);
  };

  const openEditModal = (manager: FacilityManager) => {
    setEditingManager(manager);
    setFormFacilityId(manager.facility_id);
    setFormAdminUserId(manager.admin_user_id);
    setFormIsPrimary(manager.is_primary);
    setFormNotes(manager.notes);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formFacilityId || !formAdminUserId) {
      showToast('Fasilitas dan penanggung jawab wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editingManager) {
        const { error } = await supabase
          .from('facility_managers')
          .update({
            facility_id: formFacilityId,
            admin_user_id: formAdminUserId,
            is_primary: formIsPrimary,
            notes: formNotes.trim(),
          })
          .eq('id', editingManager.id);

        if (error) throw error;
        showToast('Penanggung jawab berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase
          .from('facility_managers')
          .insert({
            facility_id: formFacilityId,
            admin_user_id: formAdminUserId,
            is_primary: formIsPrimary,
            notes: formNotes.trim(),
          });

        if (error) throw error;
        showToast('Penanggung jawab berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Error saving facility manager:', err);
      showToast('Gagal menyimpan penanggung jawab', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (manager: FacilityManager) => {
    const facilityName = manager.facility?.name || 'fasilitas ini';
    if (!confirm(`Hapus penanggung jawab untuk "${facilityName}"?`)) return;
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', manager.id);
      if (error) throw error;
      showToast('Penanggung jawab berhasil dihapus', 'success');
      fetchData();
    } catch (err) {
      console.error('Error deleting facility manager:', err);
      showToast('Gagal menghapus penanggung jawab', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" />
            Penanggung Jawab Fasilitas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola penanggung jawab untuk setiap fasilitas
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={facilities.length === 0 || adminUsers.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Tambah PJ
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : managers.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <UserCog className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada penanggung jawab</p>
          <p className="text-sm text-slate-400 mt-1">
            {facilities.length === 0
              ? 'Tambahkan fasilitas terlebih dahulu'
              : 'Tambahkan penanggung jawab untuk fasilitas'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {managers.map(manager => (
            <div
              key={manager.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">
                      {manager.facility?.name || 'Fasilitas tidak diketahui'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {manager.facility?.location || '-'}
                    </p>
                  </div>
                </div>
                {manager.is_primary && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
                    <Star className="w-3 h-3 fill-current" />
                    Utama
                  </span>
                )}
              </div>

              {/* Admin User Info */}
              <div className="space-y-2 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <div className="flex items-center gap-2 text-sm">
                  <UserCog className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {manager.admin_user?.name || manager.admin_user?.email || 'Tidak diketahui'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{manager.admin_user?.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-medium',
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  )}>
                    {manager.admin_user?.role || '-'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {manager.notes && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 italic line-clamp-2">
                  "{manager.notes}"
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-400">
                  Ditugaskan: {new Date(manager.assigned_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(manager)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(manager)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-blue-500" />
                {editingManager ? 'Edit Penanggung Jawab' : 'Tambah Penanggung Jawab'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Facility Dropdown */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Fasilitas</label>
                <select
                  value={formFacilityId}
                  onChange={e => setFormFacilityId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Pilih fasilitas...</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}{f.location ? ` — ${f.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Admin User Dropdown */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Penanggung Jawab (Admin)</label>
                <select
                  value={formAdminUserId}
                  onChange={e => setFormAdminUserId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Pilih admin...</option>
                  {adminUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Is Primary */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setFormIsPrimary(!formIsPrimary)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      formIsPrimary ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                    )}
                  >
                    <span className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      formIsPrimary ? 'translate-x-6' : 'translate-x-1'
                    )} />
                  </button>
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500" />
                      Penanggung Jawab Utama
                    </span>
                    <p className="text-xs text-slate-400">Tandai sebagai PJ utama untuk fasilitas ini</p>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Catatan (opsional)</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formFacilityId || !formAdminUserId}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingManager ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Users, Plus, Trash2, X, Loader2, Search, Info, Star, Building2, UserCog,
} from 'lucide-react';

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean | null;
  notes: string | null;
  assigned_at: string;
  facility?: { name: string | null } | null;
  admin_user?: { name: string | null; email: string | null } | null;
}

interface Facility {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
}

const emptyForm = {
  facility_id: '',
  admin_user_id: '',
  is_primary: false,
  notes: '',
};

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const [managers, setManagers] = useState<FacilityManager[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteManager, setDeleteManager] = useState<FacilityManager | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');
  // Note: no update permission for this module — only add/delete allowed.

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select(`
        id, facility_id, admin_user_id, is_primary, notes, assigned_at,
        facility:facilities(name),
        admin_user:admin_users(name, email)
      `)
      .order('assigned_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat PJ Fasilitas', 'error');
    } else {
      setManagers((data as unknown as FacilityManager[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [facRes, admRes] = await Promise.all([
      supabase.from('facilities').select('id, name').order('name'),
      supabase.from('admin_users').select('id, name, email').order('name'),
    ]);
    if (facRes.data) setFacilities((facRes.data as unknown as Facility[]) || []);
    if (admRes.data) setAdmins((admRes.data as unknown as AdminUser[]) || []);
  }, []);

  useEffect(() => {
    fetchManagers();
    fetchOptions();
  }, [fetchManagers, fetchOptions]);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.facility_id || !form.admin_user_id) {
      showToast('Fasilitas dan admin wajib dipilih', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      facility_id: form.facility_id,
      admin_user_id: form.admin_user_id,
      is_primary: form.is_primary,
      notes: form.notes.trim() || null,
    };
    const { error } = await supabase.from('facility_managers').insert(payload);
    if (error) {
      showToast('Gagal menambah PJ Fasilitas: ' + error.message, 'error');
    } else {
      showToast('PJ Fasilitas ditambahkan', 'success');
      setModalOpen(false);
      await fetchManagers();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteManager) return;
    setDeleting(true);
    const { error } = await supabase.from('facility_managers').delete().eq('id', deleteManager.id);
    if (error) {
      showToast('Gagal menghapus PJ Fasilitas', 'error');
    } else {
      showToast('PJ Fasilitas dihapus', 'success');
      setDeleteManager(null);
      await fetchManagers();
    }
    setDeleting(false);
  };

  const filtered = managers.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.facility?.name?.toLowerCase().includes(q) ||
      m.admin_user?.name?.toLowerCase().includes(q) ||
      m.admin_user?.email?.toLowerCase().includes(q) ||
      m.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola penanggung jawab fasilitas
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah PJ
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari fasilitas, nama, atau email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada PJ Fasilitas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {m.facility?.name ?? '(fasilitas tidak ditemukan)'}
                      </h3>
                      {m.is_primary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <Star className="w-3 h-3" /> Utama
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      <UserCog className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {m.admin_user?.name ?? '(tanpa nama)'}
                        {m.admin_user?.email ? ` · ${m.admin_user.email}` : ''}
                      </span>
                    </div>
                    {m.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{m.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400">
                    {new Date(m.assigned_at).toLocaleDateString('id-ID')}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => setDeleteManager(m)}
                      className={cn(
                        'p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah PJ Fasilitas</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Fasilitas <span className="text-red-500">*</span></label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm({ ...form, facility_id: e.target.value })}
                  className="input"
                >
                  <option value="">— Pilih Fasilitas —</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Admin <span className="text-red-500">*</span></label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm({ ...form, admin_user_id: e.target.value })}
                  className="input"
                >
                  <option value="">— Pilih Admin —</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? '(tanpa nama)'}{a.email ? ` · ${a.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_primary}
                    onChange={e => setForm({ ...form, is_primary: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                  />
                  Penanggung Jawab Utama
                </label>
              </div>
              <div>
                <label className="label">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="input"
                  placeholder="Catatan tambahan..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 btn-primary"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteManager(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus PJ Fasilitas?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Penugasan PJ untuk <span className="font-medium text-slate-900 dark:text-white">{deleteManager.facility?.name ?? 'fasilitas ini'}</span> akan dihapus.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteManager(null)} className="btn-secondary">Batal</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

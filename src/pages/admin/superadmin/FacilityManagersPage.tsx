import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Users, Plus, Trash2, X, Loader2, Search, Info, Building2, Star, Calendar,
} from 'lucide-react';

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean | null;
  notes: string | null;
  assigned_at: string | null;
  facility?: { name: string } | null;
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

  const [deleteTarget, setDeleteTarget] = useState<FacilityManager | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');

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
      showToast('Gagal memuat data PJ Fasilitas', 'error');
    } else {
      setManagers((data as unknown as FacilityManager[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [facRes, adminRes] = await Promise.all([
      supabase.from('facilities').select('id, name').order('name'),
      supabase.from('admin_users').select('id, name, email').order('name'),
    ]);
    if (facRes.error) {
      showToast('Gagal memuat daftar fasilitas', 'error');
    } else {
      setFacilities((facRes.data as unknown as Facility[]) || []);
    }
    if (adminRes.error) {
      showToast('Gagal memuat daftar admin', 'error');
    } else {
      setAdmins((adminRes.data as unknown as AdminUser[]) || []);
    }
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
      showToast('Fasilitas dan Admin wajib dipilih', 'error');
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
      setForm(emptyForm);
      await fetchManagers();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('facility_managers').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast('Gagal menghapus PJ Fasilitas: ' + error.message, 'error');
    } else {
      showToast('PJ Fasilitas dihapus', 'success');
      setDeleteTarget(null);
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
      m.admin_user?.email?.toLowerCase().includes(q)
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

      {/* Info banner about PJ Barang */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari PJ Fasilitas..."
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {m.admin_user?.name ?? '(tanpa nama)'}
                    </h3>
                    {m.is_primary && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Star className="w-3 h-3" /> PJ Utama
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {m.facility?.name ?? 'Fasilitas tidak dikenal'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">@</span>
                      {m.admin_user?.email ?? '-'}
                    </div>
                    {m.assigned_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        Ditugaskan {new Date(m.assigned_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  {m.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{m.notes}</p>
                  )}
                </div>
                {canDelete && (
                  <button
                    onClick={() => setDeleteTarget(m)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Hapus PJ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                      {a.name ?? a.email ?? '(tanpa nama)'}{a.email ? ` (${a.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={e => setForm({ ...form, is_primary: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">PJ Utama</span>
              </label>
              <div>
                <label className="label">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="input"
                  placeholder="Catatan tambahan (opsional)..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus PJ Fasilitas?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Penugasan PJ untuk fasilitas ini akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50'
                )}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

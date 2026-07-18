import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  UserCog, Plus, Trash2, Loader2, X, Info, Star, Building2, Shield,
} from 'lucide-react';

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string | null;
  assigned_at: string;
  // Joined fields
  facility_name?: string | null;
  admin_name?: string | null;
  admin_email?: string | null;
}

interface Facility {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
}

interface FacilityManagerForm {
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string;
}

const emptyForm: FacilityManagerForm = {
  facility_id: '',
  admin_user_id: '',
  is_primary: false,
  notes: '',
};

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');

  const [managers, setManagers] = useState<FacilityManager[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FacilityManagerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select(`
        id,
        facility_id,
        admin_user_id,
        is_primary,
        notes,
        assigned_at,
        facilities:facility_id ( name ),
        admin_users:admin_user_id ( name, email )
      `)
      .order('assigned_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data PJ Fasilitas', 'error');
      setLoading(false);
      return;
    }
    const rows = (data as unknown as Array<{
      id: string;
      facility_id: string;
      admin_user_id: string;
      is_primary: boolean;
      notes: string | null;
      assigned_at: string;
      facilities: { name: string } | null;
      admin_users: { name: string | null; email: string | null } | null;
    }>) || [];
    const mapped: FacilityManager[] = rows.map(r => ({
      id: r.id,
      facility_id: r.facility_id,
      admin_user_id: r.admin_user_id,
      is_primary: r.is_primary,
      notes: r.notes,
      assigned_at: r.assigned_at,
      facility_name: r.facilities?.name ?? null,
      admin_name: r.admin_users?.name ?? null,
      admin_email: r.admin_users?.email ?? null,
    }));
    setManagers(mapped);
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [facRes, admRes] = await Promise.all([
      supabase.from('facilities').select('id, name').order('name', { ascending: true }),
      supabase.from('admin_users').select('id, name, email').eq('is_active', true).order('name', { ascending: true }),
    ]);
    if (facRes.data) setFacilities(facRes.data as unknown as Facility[]);
    if (admRes.data) setAdmins(admRes.data as unknown as AdminUser[]);
  }, []);

  useEffect(() => {
    fetchManagers();
    fetchOptions();
  }, [fetchManagers, fetchOptions]);

  const handleSave = async () => {
    if (!canCreate) {
      showToast('Anda tidak memiliki izin untuk menambah PJ Fasilitas', 'error');
      return;
    }
    if (!form.facility_id || !form.admin_user_id) {
      showToast('Fasilitas dan admin wajib dipilih', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('facility_managers')
        .insert({
          facility_id: form.facility_id,
          admin_user_id: form.admin_user_id,
          is_primary: form.is_primary,
          notes: form.notes.trim() || null,
          assigned_at: new Date().toISOString(),
        });
      if (error) {
        showToast('Gagal menambah PJ Fasilitas: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      showToast('PJ Fasilitas berhasil ditambahkan', 'success');
      setShowModal(false);
      setForm(emptyForm);
      await fetchManagers();
    } catch (e) {
      showToast('Terjadi kesalahan saat menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (manager: FacilityManager) => {
    if (!canDelete) {
      showToast('Anda tidak memiliki izin untuk menghapus PJ Fasilitas', 'error');
      return;
    }
    if (!confirm('Hapus penugasan PJ Fasilitas ini?')) return;
    setDeletingId(manager.id);
    try {
      const { error } = await supabase
        .from('facility_managers')
        .delete()
        .eq('id', manager.id);
      if (error) {
        showToast('Gagal menghapus: ' + error.message, 'error');
        setDeletingId(null);
        return;
      }
      showToast('PJ Fasilitas berhasil dihapus', 'success');
      await fetchManagers();
    } catch (e) {
      showToast('Terjadi kesalahan saat menghapus', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola penugasan Penanggung Jawab Fasilitas
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </p>
      </div>

      <div className="flex justify-end">
        {canCreate && (
          <button
            onClick={() => {
              setForm(emptyForm);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah PJ Fasilitas
          </button>
        )}
      </div>

      {managers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <UserCog className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada PJ Fasilitas</p>
          <p className="text-sm text-slate-400 mt-1">Belum ada penugasan PJ Fasilitas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managers.map(manager => (
            <div
              key={manager.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {manager.facility_name ?? '—'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                      <Shield className="w-3 h-3" />
                      {manager.admin_name ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {manager.admin_email ?? '—'}
                    </p>
                  </div>
                </div>
                {manager.is_primary && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
                    <Star className="w-3 h-3" />
                    Utama
                  </span>
                )}
              </div>

              {manager.notes ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-2">
                  {manager.notes}
                </p>
              ) : null}

              <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Ditugaskan: {new Date(manager.assigned_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                {canDelete && (
                  <button
                    onClick={() => handleDelete(manager)}
                    disabled={deletingId === manager.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {deletingId === manager.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Tambah PJ Fasilitas
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fasilitas <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm({ ...form, facility_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">— Pilih Fasilitas —</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name ?? '—'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Admin / PJ <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm({ ...form, admin_user_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">— Pilih Admin —</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? '—'} ({a.email ?? '—'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Catatan
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan (opsional)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={e => setForm({ ...form, is_primary: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Tandai sebagai PJ Utama
                </span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

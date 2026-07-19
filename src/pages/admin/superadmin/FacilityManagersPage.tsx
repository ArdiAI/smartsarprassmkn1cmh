import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  UserCheck,
  Plus,
  Trash2,
  X,
  Loader2,
  Info,
  Star,
} from 'lucide-react';

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string | null;
  assigned_at: string;
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

interface FacilityWithManagers extends FacilityManager {
  facilities: { name: string } | null;
  admin_users: { name: string; email: string } | null;
}

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');

  const [managers, setManagers] = useState<FacilityWithManagers[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [facilityId, setFacilityId] = useState('');
  const [adminUserId, setAdminUserId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mgrRes, facRes, admRes] = await Promise.all([
        supabase
          .from('facility_managers')
          .select('id, facility_id, admin_user_id, is_primary, notes, assigned_at, facilities(name), admin_users(name, email)')
          .order('assigned_at', { ascending: false }),
        supabase.from('facilities').select('id, name').order('name', { ascending: true }),
        supabase.from('admin_users').select('id, name, email').eq('is_active', true).order('name', { ascending: true }),
      ]);

      if (mgrRes.error) throw mgrRes.error;
      if (facRes.error) throw facRes.error;
      if (admRes.error) throw admRes.error;

      setManagers((mgrRes.data ?? []) as unknown as FacilityWithManagers[]);
      setFacilities((facRes.data ?? []) as unknown as Facility[]);
      setAdmins((admRes.data ?? []) as unknown as AdminUser[]);
    } catch {
      showToast('Gagal memuat data PJ Fasilitas', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!facilityId || !adminUserId) {
      showToast('Fasilitas dan admin wajib dipilih', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('facility_managers').insert({
        facility_id: facilityId,
        admin_user_id: adminUserId,
        is_primary: isPrimary,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      showToast('PJ Fasilitas berhasil ditambahkan', 'success');
      setShowModal(false);
      setFacilityId('');
      setAdminUserId('');
      setIsPrimary(false);
      setNotes('');
      fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menambah PJ Fasilitas';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: FacilityWithManagers) => {
    const name = m.admin_users?.name ?? m.admin_user_id;
    if (!confirm(`Hapus penugasan PJ Fasilitas untuk "${name}"?`)) return;
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', m.id);
      if (error) throw error;
      showToast('PJ Fasilitas berhasil dihapus', 'success');
      fetchData();
    } catch {
      showToast('Gagal menghapus PJ Fasilitas', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola penanggung jawab fasilitas
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah PJ
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
        <p className="text-sm text-brand-800 dark:text-brand-300">
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : managers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <UserCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Belum ada PJ Fasilitas</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {managers.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/30">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {m.admin_users?.name ?? 'Admin tidak ditemukan'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {m.admin_users?.email ?? m.admin_user_id}
                    </p>
                  </div>
                </div>
                {m.is_primary && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Star className="h-3 w-3" />
                    Utama
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                <p>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Fasilitas:</span>{' '}
                  {m.facilities?.name ?? m.facility_id}
                </p>
                <p>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Ditugaskan:</span>{' '}
                  {new Date(m.assigned_at).toLocaleDateString('id-ID')}
                </p>
                {m.notes && (
                  <p>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Catatan:</span> {m.notes}
                  </p>
                )}
              </div>

              {canDelete && (
                <div className="mt-4">
                  <button
                    onClick={() => handleDelete(m)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tambah PJ Fasilitas</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fasilitas</label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Pilih fasilitas...</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Admin</label>
                <select
                  value={adminUserId}
                  onChange={(e) => setAdminUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Pilih admin...</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-primary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="is-primary" className="text-sm text-slate-700 dark:text-slate-300">
                  Tandai sebagai PJ Utama
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Catatan</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="Catatan (opsional)"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Plus, Trash2, Loader2, UserCog, Building2, Star, Info,
} from 'lucide-react';

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean | null;
  notes: string | null;
  assigned_at: string | null;
  facility?: { id: string; name: string } | null;
  admin_user?: { id: string; name: string | null; email: string | null } | null;
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

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');

  const [managers, setManagers] = useState<FacilityManager[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formFacilityId, setFormFacilityId] = useState('');
  const [formAdminUserId, setFormAdminUserId] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select(`
        id, facility_id, admin_user_id, is_primary, notes, assigned_at,
        facility:facilities(id, name),
        admin_user:admin_users(id, name, email)
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
      supabase.from('facilities').select('id, name').order('name', { ascending: true }),
      supabase.from('admin_users').select('id, name, email').order('name', { ascending: true }),
    ]);
    if (facRes.data) setFacilities((facRes.data as unknown as Facility[]) || []);
    if (adminRes.data) setAdmins((adminRes.data as unknown as AdminUser[]) || []);
  }, []);

  useEffect(() => {
    fetchManagers();
    fetchOptions();
  }, [fetchManagers, fetchOptions]);

  const handleAdd = async () => {
    if (!canCreate) {
      showToast('Anda tidak memiliki izin untuk menambah PJ Fasilitas', 'error');
      return;
    }
    if (!formFacilityId || !formAdminUserId) {
      showToast('Fasilitas dan admin wajib dipilih', 'warning');
      return;
    }
    setActionLoading('add');
    try {
      const { error } = await supabase.from('facility_managers').insert({
        facility_id: formFacilityId,
        admin_user_id: formAdminUserId,
        is_primary: formIsPrimary,
        notes: formNotes.trim() || null,
      });
      if (error) {
        showToast(`Gagal menambah PJ Fasilitas: ${error.message}`, 'error');
      } else {
        showToast('PJ Fasilitas berhasil ditambahkan', 'success');
        setShowModal(false);
        setFormFacilityId('');
        setFormAdminUserId('');
        setFormIsPrimary(false);
        setFormNotes('');
        await fetchManagers();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (manager: FacilityManager) => {
    if (!canDelete) {
      showToast('Anda tidak memiliki izin untuk menghapus PJ Fasilitas', 'error');
      return;
    }
    if (!confirm('Hapus penugasan PJ Fasilitas ini?')) return;
    setActionLoading(`del-${manager.id}`);
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', manager.id);
      if (error) {
        showToast(`Gagal menghapus: ${error.message}`, 'error');
      } else {
        showToast('PJ Fasilitas berhasil dihapus', 'success');
        await fetchManagers();
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-blue-500" /> PJ Fasilitas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola penanggung jawab fasilitas
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah PJ
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </p>
      </div>

      {managers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <UserCog className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada PJ Fasilitas</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {managers.map(m => (
            <div key={m.id} className="card p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {m.facility?.name ?? 'Fasilitas tidak dikenal'}
                  </h3>
                </div>
                {m.is_primary && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Star className="w-3 h-3" /> Utama
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {m.admin_user?.name ?? '(tanpa nama)'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {m.admin_user?.email ?? '-'}
                </p>
              </div>

              {m.notes && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                  {m.notes}
                </p>
              )}

              {m.assigned_at && (
                <p className="text-xs text-slate-400 mt-2">
                  Ditugaskan: {new Date(m.assigned_at).toLocaleDateString('id-ID')}
                </p>
              )}

              {canDelete && (
                <div className="flex items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => handleDelete(m)}
                    disabled={actionLoading === `del-${m.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `del-${m.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Tambah PJ Fasilitas</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Fasilitas <span className="text-red-500">*</span>
                </label>
                <select
                  value={formFacilityId}
                  onChange={e => setFormFacilityId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih fasilitas</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Admin / PJ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formAdminUserId}
                  onChange={e => setFormAdminUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih admin</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? '(tanpa nama)'}{a.email ? ` — ${a.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPrimary}
                  onChange={e => setFormIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">PJ Utama</span>
              </label>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan (opsional)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={actionLoading === 'add'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

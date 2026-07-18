import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Plus, Trash2, Loader2, UserCog, Building2, Info, X, Check, Star,
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
  name: string | null;
  email: string;
}

interface JoinedRow extends FacilityManager {
  facilities?: { name: string } | null;
  admin_users?: { name: string | null; email: string } | null;
}

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');

  const [managers, setManagers] = useState<JoinedRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formFacilityId, setFormFacilityId] = useState('');
  const [formAdminId, setFormAdminId] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select(
        'id, facility_id, admin_user_id, is_primary, notes, assigned_at, facilities(name), admin_users(name, email)'
      )
      .order('assigned_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data PJ Fasilitas', 'error');
      setLoading(false);
      return;
    }
    setManagers((data as unknown as JoinedRow[]) || []);

    const { data: facs } = await supabase
      .from('facilities')
      .select('id, name')
      .order('name', { ascending: true });
    setFacilities((facs as unknown as Facility[]) || []);

    const { data: adm } = await supabase
      .from('admin_users')
      .select('id, name, email')
      .eq('is_active', true)
      .order('name', { ascending: true });
    setAdmins((adm as unknown as AdminUser[]) || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setFormFacilityId('');
    setFormAdminId('');
    setFormIsPrimary(false);
    setFormNotes('');
    setShowModal(true);
  };

  const handleAdd = async () => {
    if (!formFacilityId || !formAdminId) {
      showToast('Fasilitas dan admin wajib dipilih', 'warning');
      return;
    }
    setActionLoading('add');
    try {
      const { error } = await supabase.from('facility_managers').insert({
        facility_id: formFacilityId,
        admin_user_id: formAdminId,
        is_primary: formIsPrimary,
        notes: formNotes.trim() || null,
      });
      if (error) {
        showToast('Gagal menambah PJ Fasilitas: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast('PJ Fasilitas berhasil ditambahkan', 'success');
      setShowModal(false);
      await fetchData();
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (m: JoinedRow) => {
    if (!confirm('Hapus penugasan PJ Fasilitas ini?')) return;
    setActionLoading(`delete-${m.id}`);
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', m.id);
      if (error) {
        showToast('Gagal menghapus: ' + error.message, 'error');
        setActionLoading(null);
        return;
      }
      showToast('PJ Fasilitas berhasil dihapus', 'success');
      await fetchData();
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
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tugaskan PJ
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
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
        <div className="grid gap-4">
          {managers.map(m => (
            <div key={m.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {m.facilities?.name ?? 'Fasilitas tidak dikenal'}
                      </h3>
                      {m.is_primary && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <Star className="w-3 h-3" /> Utama
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {m.admin_users?.name ?? 'Tanpa Nama'} · {m.admin_users?.email ?? '-'}
                    </p>
                    {m.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.notes}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                        Ditugaskan {new Date(m.assigned_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(m)}
                    disabled={actionLoading === `delete-${m.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `delete-${m.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tugaskan PJ Fasilitas</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="label">Fasilitas <span className="text-red-500">*</span></label>
              <select
                value={formFacilityId}
                onChange={e => setFormFacilityId(e.target.value)}
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
                value={formAdminId}
                onChange={e => setFormAdminId(e.target.value)}
                className="input"
              >
                <option value="">— Pilih Admin —</option>
                {admins.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name ?? 'Tanpa Nama'} ({a.email})
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsPrimary}
                onChange={e => setFormIsPrimary(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Tandai sebagai PJ utama</span>
            </label>
            <div>
              <label className="label">Catatan</label>
              <textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={3}
                placeholder="Catatan opsional"
                className="input"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={actionLoading === 'add'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

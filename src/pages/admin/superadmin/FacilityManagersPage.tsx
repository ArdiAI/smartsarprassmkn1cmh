import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Info, Star } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string | null;
  assigned_at: string | null;
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

interface FacilityManagerRow extends FacilityManager {
  facility?: { name: string } | null;
  admin_user?: { name: string; email: string } | null;
}

interface ManagerForm {
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string;
}

const emptyForm: ManagerForm = { facility_id: '', admin_user_id: '', is_primary: false, notes: '' };

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const [managers, setManagers] = useState<FacilityManagerRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ManagerForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mgrRes, facRes, admRes] = await Promise.all([
        supabase
          .from('facility_managers')
          .select('id, facility_id, admin_user_id, is_primary, notes, assigned_at, facility:facilities(name), admin_user:admin_users(name, email)')
          .order('assigned_at', { ascending: false }),
        supabase.from('facilities').select('id, name').order('name', { ascending: true }),
        supabase.from('admin_users').select('id, name, email').eq('is_active', true).order('name', { ascending: true }),
      ]);
      if (mgrRes.error) throw mgrRes.error;
      if (facRes.error) throw facRes.error;
      if (admRes.error) throw admRes.error;
      setManagers((mgrRes.data ?? []) as unknown as FacilityManagerRow[]);
      setFacilities((facRes.data ?? []) as unknown as Facility[]);
      setAdmins((admRes.data ?? []) as unknown as AdminUser[]);
    } catch (err) {
      showToast('Gagal memuat data PJ Fasilitas: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.facility_id || !form.admin_user_id) {
      showToast('Fasilitas dan admin wajib dipilih', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        facility_id: form.facility_id,
        admin_user_id: form.admin_user_id,
        is_primary: form.is_primary,
        notes: form.notes.trim() || null,
      };
      const { error } = await supabase.from('facility_managers').insert(payload);
      if (error) throw error;
      showToast('PJ Fasilitas berhasil ditambahkan', 'success');
      setShowModal(false);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      showToast('Gagal menambah PJ Fasilitas: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: FacilityManagerRow) => {
    const facName = m.facility?.name ?? 'fasilitas ini';
    const admName = m.admin_user?.name ?? m.admin_user?.email ?? 'admin ini';
    if (!confirm(`Hapus penugasan "${admName}" dari "${facName}"?`)) return;
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', m.id);
      if (error) throw error;
      showToast('PJ Fasilitas berhasil dihapus', 'success');
      await loadData();
    } catch (err) {
      showToast('Gagal menghapus: ' + (err as Error).message, 'error');
    }
  };

  const facilityName = (id: string): string => facilities.find((f) => f.id === id)?.name ?? 'Fasilitas tidak dikenal';
  const adminName = (id: string): string => {
    const a = admins.find((x) => x.id === id);
    return a ? `${a.name ?? a.email}` : 'Admin tidak dikenal';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola penanggung jawab fasilitas</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tugas PJ
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-900/20">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-400" />
        <p className="text-sm text-brand-800 dark:text-brand-200">
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </p>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Memuat...</div>
        ) : managers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada PJ Fasilitas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fasilitas</th>
                  <th className="px-4 py-3 font-semibold">PJ (Admin)</th>
                  <th className="px-4 py-3 font-semibold">Utama</th>
                  <th className="px-4 py-3 font-semibold">Catatan</th>
                  <th className="px-4 py-3 font-semibold">Ditugaskan</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {managers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {m.facility?.name ?? facilityName(m.facility_id)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {m.admin_user?.name ?? adminName(m.admin_user_id)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {m.admin_user?.email ?? '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {m.is_primary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <Star className="h-3 w-3 fill-current" /> Utama
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {m.notes ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {m.assigned_at ? new Date(m.assigned_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canDelete ? (
                        <button
                          onClick={() => handleDelete(m)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Tugaskan PJ Fasilitas</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fasilitas <span className="text-red-500">*</span></label>
                <select
                  value={form.facility_id}
                  onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Pilih fasilitas...</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Admin (PJ) <span className="text-red-500">*</span></label>
                <select
                  value={form.admin_user_id}
                  onChange={(e) => setForm({ ...form, admin_user_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Pilih admin...</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>{a.name ?? a.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan (opsional)"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Tandai sebagai PJ utama
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

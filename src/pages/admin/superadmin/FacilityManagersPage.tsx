import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, X, Info, Star } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../utils/cn';

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

interface FacilityManagerRow extends FacilityManager {
  facility?: { name: string } | null;
  admin_user?: { name: string; email: string } | null;
}

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<FacilityManagerRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ facility_id: '', admin_user_id: '', is_primary: false, notes: '' });
  const [saving, setSaving] = useState(false);

  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fmRes, facRes, admRes] = await Promise.all([
        supabase
          .from('facility_managers')
          .select('*, facility:facilities(name), admin_user:admin_users(name, email)')
          .order('assigned_at', { ascending: false }),
        supabase.from('facilities').select('id, name').order('name'),
        supabase.from('admin_users').select('id, name, email').eq('is_active', true).order('name'),
      ]);
      if (fmRes.error) throw fmRes.error;
      if (facRes.error) throw facRes.error;
      if (admRes.error) throw admRes.error;
      setRows((fmRes.data ?? []) as unknown as FacilityManagerRow[]);
      setFacilities((facRes.data ?? []) as unknown as Facility[]);
      setAdmins((admRes.data ?? []) as unknown as AdminUser[]);
    } catch (e) {
      showToast('Gagal memuat data PJ Fasilitas', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const closeModal = () => {
    setShowModal(false);
    setForm({ facility_id: '', admin_user_id: '', is_primary: false, notes: '' });
  };

  const handleAdd = async () => {
    if (!form.facility_id || !form.admin_user_id) {
      showToast('Fasilitas dan admin wajib dipilih', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('facility_managers').insert({
        facility_id: form.facility_id,
        admin_user_id: form.admin_user_id,
        is_primary: form.is_primary,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      showToast('PJ Fasilitas ditambahkan', 'success');
      closeModal();
      await loadData();
    } catch (e) {
      showToast('Gagal menambah: ' + (e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: FacilityManagerRow) => {
    if (!confirm('Hapus penugasan PJ Fasilitas ini?')) return;
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', r.id);
      if (error) throw error;
      showToast('PJ Fasilitas dihapus', 'success');
      await loadData();
    } catch (e) {
      showToast('Gagal menghapus: ' + (e as Error).message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola penanggung jawab fasilitas</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah PJ
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-800/40 dark:bg-brand-900/20 dark:text-brand-200">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Belum ada PJ Fasilitas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fasilitas</th>
                  <th className="px-4 py-3 font-semibold">PJ</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Utama</th>
                  <th className="px-4 py-3 font-semibold">Catatan</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      {r.facility?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.admin_user?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.admin_user?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.is_primary && (
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(r)}
                          className="inline-flex items-center gap-1 rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah PJ Fasilitas</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Fasilitas *</label>
                <select
                  value={form.facility_id}
                  onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">— pilih fasilitas —</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name ?? ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Admin (PJ) *</label>
                <select
                  value={form.admin_user_id}
                  onChange={(e) => setForm({ ...form, admin_user_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">— pilih admin —</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? ''} ({a.email ?? ''})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Tandai sebagai PJ Utama
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

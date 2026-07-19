import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Info, X, Star } from 'lucide-react';
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

interface ManagerForm {
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string;
}

const emptyForm: ManagerForm = { facility_id: '', admin_user_id: '', is_primary: false, notes: '' };

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');

  const [managers, setManagers] = useState<FacilityManagerRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ManagerForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadFacilities = useCallback(async () => {
    const { data, error } = await supabase
      .from('facilities')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) {
      showToast('Gagal memuat daftar fasilitas', 'error');
      return;
    }
    setFacilities((data ?? []) as unknown as Facility[]);
  }, []);

  const loadAdminUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, name, email')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) {
      showToast('Gagal memuat daftar admin', 'error');
      return;
    }
    setAdminUsers((data ?? []) as unknown as AdminUser[]);
  }, []);

  const loadManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select(
        'id, facility_id, admin_user_id, is_primary, notes, assigned_at, facility:facilities(name), admin_user:admin_users(name, email)',
      )
      .order('assigned_at', { ascending: false });
    setLoading(false);
    if (error) {
      showToast('Gagal memuat daftar PJ Fasilitas', 'error');
      return;
    }
    setManagers((data ?? []) as unknown as FacilityManagerRow[]);
  }, []);

  useEffect(() => {
    loadManagers();
    loadFacilities();
    loadAdminUsers();
  }, [loadManagers, loadFacilities, loadAdminUsers]);

  const handleAdd = async () => {
    if (!form.facility_id) {
      showToast('Fasilitas wajib dipilih', 'warning');
      return;
    }
    if (!form.admin_user_id) {
      showToast('Admin wajib dipilih', 'warning');
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
      showToast('PJ Fasilitas berhasil ditambahkan', 'success');
      await loadManagers();
      setShowModal(false);
      setForm(emptyForm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan PJ Fasilitas';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: FacilityManagerRow) => {
    if (!confirm('Hapus penugasan PJ Fasilitas ini?')) return;
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', m.id);
      if (error) throw error;
      showToast('PJ Fasilitas berhasil dihapus', 'success');
      await loadManagers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus PJ Fasilitas';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola penanggung jawab fasilitas.
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Tambah PJ
          </button>
        )}
      </div>

      {/* Info banner for PJ Barang */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600 dark:text-brand-300" />
        <p className="text-sm text-brand-800 dark:text-brand-200">
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang
          yang bersangkutan.
        </p>
      </div>

      <div className="card">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat...</p>
        ) : managers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Belum ada PJ Fasilitas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="pb-3 pr-4 font-semibold">Fasilitas</th>
                  <th className="pb-3 pr-4 font-semibold">Penanggung Jawab</th>
                  <th className="pb-3 pr-4 font-semibold">Email</th>
                  <th className="pb-3 pr-4 font-semibold">Utama</th>
                  <th className="pb-3 pr-4 font-semibold">Catatan</th>
                  <th className="pb-3 pr-4 font-semibold">Ditugaskan</th>
                  <th className="pb-3 pr-4 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100">
                      {m.facility?.name ?? '-'}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      {m.admin_user?.name ?? '-'}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                      {m.admin_user?.email ?? '-'}
                    </td>
                    <td className="py-3 pr-4">
                      {m.is_primary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <Star className="h-3 w-3" />
                          Utama
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                      {m.notes ?? '-'}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                      {m.assigned_at ? new Date(m.assigned_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(m)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          aria-label="Hapus PJ"
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

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah PJ Fasilitas</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(emptyForm);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Fasilitas</label>
                <select
                  value={form.facility_id}
                  onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
                  className="input"
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
                <label className="label">Penanggung Jawab (Admin)</label>
                <select
                  value={form.admin_user_id}
                  onChange={(e) => setForm({ ...form, admin_user_id: e.target.value })}
                  className="input"
                >
                  <option value="">Pilih admin...</option>
                  {adminUsers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? '-'} ({a.email ?? '-'})
                    </option>
                  ))}
                </select>
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
              <div>
                <label className="label">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(emptyForm);
                }}
                className="btn-secondary"
              >
                Batal
              </button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

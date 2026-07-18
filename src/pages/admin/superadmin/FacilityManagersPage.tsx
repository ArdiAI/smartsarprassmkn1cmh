import { useEffect, useState } from 'react';
import { Plus, Trash2, Info, Star } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string;
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

interface Row extends FacilityManager {
  facility_name?: string;
  admin_name?: string;
  admin_email?: string;
}

const emptyForm = {
  facility_id: '',
  admin_user_id: '',
  is_primary: false,
  notes: '',
};

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('facility_managers')
        .select(
          'id, facility_id, admin_user_id, is_primary, notes, assigned_at, facilities(name), admin_users(name, email)',
        )
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      const mapped: Row[] = (data ?? []).map((r: any) => ({
        id: r.id,
        facility_id: r.facility_id,
        admin_user_id: r.admin_user_id,
        is_primary: r.is_primary,
        notes: r.notes ?? '',
        assigned_at: r.assigned_at,
        facility_name: r.facilities?.name ?? '—',
        admin_name: r.admin_users?.name ?? '—',
        admin_email: r.admin_users?.email ?? '—',
      }));
      setRows(mapped);
    } catch {
      showToast('Gagal memuat data PJ Fasilitas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [facRes, admRes] = await Promise.all([
        supabase.from('facilities').select('id, name').order('name', { ascending: true }),
        supabase.from('admin_users').select('id, name, email').eq('is_active', true).order('name', { ascending: true }),
      ]);
      if (facRes.error) throw facRes.error;
      if (admRes.error) throw admRes.error;
      setFacilities((facRes.data ?? []) as unknown as Facility[]);
      setAdmins((admRes.data ?? []) as unknown as AdminUser[]);
    } catch {
      showToast('Gagal memuat opsi dropdown', 'error');
    }
  };

  useEffect(() => {
    load();
    loadOptions();
  }, []);

  const openCreate = () => {
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
      const { error } = await supabase.from('facility_managers').insert({
        facility_id: form.facility_id,
        admin_user_id: form.admin_user_id,
        is_primary: form.is_primary,
        notes: form.notes.trim(),
      });
      if (error) throw error;
      showToast('PJ Fasilitas berhasil ditambahkan', 'success');
      setShowModal(false);
      await load();
    } catch {
      showToast('Gagal menambahkan PJ Fasilitas', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Row) => {
    if (!confirm('Hapus penugasan PJ Fasilitas ini?')) return;
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', row.id);
      if (error) throw error;
      showToast('Penugasan berhasil dihapus', 'success');
      await load();
    } catch {
      showToast('Gagal menghapus penugasan', 'error');
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola penanggung jawab fasilitas.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Tambah PJ
          </button>
        )}
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Fasilitas</th>
              <th className="px-4 py-3">PJ (Admin)</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Utama</th>
              <th className="px-4 py-3">Catatan</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Memuat…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Tidak ada data.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{r.facility_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.admin_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.admin_email ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.is_primary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Star className="h-3 w-3" /> Utama
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.notes || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(r)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah PJ Fasilitas</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Fasilitas</span>
                <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: e.target.value })} className={inputCls}>
                  <option value="">— Pilih Fasilitas —</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Admin (PJ)</span>
                <select value={form.admin_user_id} onChange={(e) => setForm({ ...form, admin_user_id: e.target.value })} className={inputCls}>
                  <option value="">— Pilih Admin —</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Catatan</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className={inputCls}
                  placeholder="Catatan (opsional)"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Tandai sebagai PJ Utama</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Batal</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

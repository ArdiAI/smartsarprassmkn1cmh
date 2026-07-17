import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  X,
  UserCog,
} from 'lucide-react';

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean | null;
  notes: string | null;
  assigned_at: string | null;
}

interface Facility {
  id: string;
  name: string | null;
}

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
}

interface ManagerRow extends FacilityManager {
  facility_name: string;
  admin_name: string;
  admin_email: string;
}

interface ManagerForm {
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string;
}

const emptyForm: ManagerForm = {
  facility_id: '',
  admin_user_id: '',
  is_primary: false,
  notes: '',
};

export default function FacilityManagersPage() {
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FacilityManager | null>(null);
  const [form, setForm] = useState<ManagerForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [mgrRes, facRes, admRes] = await Promise.all([
      supabase.from('facility_managers').select('*').order('assigned_at', { ascending: false }),
      supabase.from('facilities').select('id, name').order('name', { ascending: true }),
      supabase.from('admin_users').select('id, email, name').order('name', { ascending: true }),
    ]);

    if (mgrRes.error) {
      showToast('Gagal memuat facility managers: ' + mgrRes.error.message, 'error');
      setLoading(false);
      return;
    }
    if (facRes.error) {
      showToast('Gagal memuat facilities: ' + facRes.error.message, 'error');
    }
    if (admRes.error) {
      showToast('Gagal memuat admin users: ' + admRes.error.message, 'error');
    }

    const mgrList = (mgrRes.data ?? []) as unknown as FacilityManager[];
    const facList = (facRes.data ?? []) as unknown as Facility[];
    const admList = (admRes.data ?? []) as unknown as AdminUser[];

    setFacilities(facList);
    setAdmins(admList);

    const facMap = new Map(facList.map(f => [f.id, f.name ?? '-']));
    const admMap = new Map(admList.map(a => [a.id, { name: a.name ?? '-', email: a.email ?? '-' }]));

    const rows: ManagerRow[] = mgrList.map(m => ({
      ...m,
      facility_name: facMap.get(m.facility_id) ?? '-',
      admin_name: admMap.get(m.admin_user_id)?.name ?? '-',
      admin_email: admMap.get(m.admin_user_id)?.email ?? '-',
    }));
    setManagers(rows);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (m: ManagerRow) => {
    setEditing(m);
    setForm({
      facility_id: m.facility_id,
      admin_user_id: m.admin_user_id,
      is_primary: m.is_primary ?? false,
      notes: m.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.facility_id) {
      showToast('Fasilitas wajib dipilih', 'warning');
      return;
    }
    if (!form.admin_user_id) {
      showToast('Admin wajib dipilih', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      facility_id: form.facility_id,
      admin_user_id: form.admin_user_id,
      is_primary: form.is_primary,
      notes: form.notes.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from('facility_managers').update(payload).eq('id', editing.id);
      if (error) {
        showToast('Gagal memperbarui: ' + error.message, 'error');
      } else {
        showToast('Manager berhasil diperbarui', 'success');
        setShowModal(false);
        fetchAll();
      }
    } else {
      const { error } = await supabase.from('facility_managers').insert(payload);
      if (error) {
        showToast('Gagal menambah manager: ' + error.message, 'error');
      } else {
        showToast('Manager berhasil ditambahkan', 'success');
        setShowModal(false);
        fetchAll();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus penunjukan manager ini?')) return;
    const { error } = await supabase.from('facility_managers').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
    } else {
      showToast('Manager berhasil dihapus', 'success');
      fetchAll();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" />
            Facility Managers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola penunjukan manager untuk setiap fasilitas
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Manager
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : managers.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Belum ada manager ditunjuk
        </div>
      ) : (
        <div className="grid gap-4">
          {managers.map(m => (
            <div
              key={m.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                      m.is_primary
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    {m.is_primary ? (
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    ) : (
                      <UserCog className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-white">{m.facility_name}</p>
                      {m.is_primary && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                      {m.admin_name} · <span className="text-slate-500 dark:text-slate-400">{m.admin_email}</span>
                    </p>
                    {m.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.notes}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Ditunjuk: {m.assigned_at ? new Date(m.assigned_at).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(m)}
                    className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Manager' : 'Tambah Manager'}
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Fasilitas
                </label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm({ ...form, facility_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih Fasilitas</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name ?? '-'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin
                </label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm({ ...form, admin_user_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih Admin</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? '-'} ({a.email ?? '-'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Catatan
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan (opsional)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={e => setForm({ ...form, is_primary: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Manager Utama</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  UserCog,
  Star,
  Mail,
} from 'lucide-react';

// ---- Types matching the schema ----
// facility_managers has NO name/email/phone — must join admin_users & facilities
interface FacilityManager {
  id: string;
  facility_id: string | null;
  admin_user_id: string | null;
  is_primary: boolean | null;
  notes: string | null;
  assigned_at: string | null;
  facilities: { name: string } | null;
  admin_users: { name: string | null; email: string | null } | null;
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
  const [managers, setManagers] = useState<FacilityManager[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FacilityManager | null>(null);
  const [form, setForm] = useState<ManagerForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select(
        'id, facility_id, admin_user_id, is_primary, notes, assigned_at, facilities(name), admin_users(name, email)'
      )
      .order('assigned_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat facility managers: ' + error.message, 'error');
    } else {
      setManagers((data ?? []) as unknown as FacilityManager[]);
    }
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [facRes, adminRes] = await Promise.all([
      supabase.from('facilities').select('id, name').order('name', { ascending: true }),
      supabase
        .from('admin_users')
        .select('id, name, email')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ]);
    if (facRes.data) setFacilities(facRes.data as unknown as Facility[]);
    if (adminRes.data) setAdmins(adminRes.data as unknown as AdminUser[]);
  }, []);

  useEffect(() => {
    fetchManagers();
    fetchOptions();
  }, [fetchManagers, fetchOptions]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (m: FacilityManager) => {
    setEditing(m);
    setForm({
      facility_id: m.facility_id ?? '',
      admin_user_id: m.admin_user_id ?? '',
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
    const payload = {
      facility_id: form.facility_id,
      admin_user_id: form.admin_user_id,
      is_primary: form.is_primary,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    let error: { message: string } | null = null;
    if (editing) {
      const res = await supabase
        .from('facility_managers')
        .update(payload)
        .eq('id', editing.id);
      error = res.error;
    } else {
      const res = await supabase.from('facility_managers').insert(payload);
      error = res.error;
    }
    setSaving(false);

    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
      return;
    }
    showToast(editing ? 'Manager diperbarui' : 'Manager ditambahkan', 'success');
    setShowModal(false);
    fetchManagers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus penugasan manager ini?')) return;
    const { error } = await supabase.from('facility_managers').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Manager dihapus', 'success');
    fetchManagers();
  };

  const facilityName = (m: FacilityManager) => m.facilities?.name ?? 'Fasilitas tidak diketahui';
  const adminName = (m: FacilityManager) => m.admin_users?.name ?? 'Tanpa Nama';
  const adminEmail = (m: FacilityManager) => m.admin_users?.email ?? '-';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" />
            Manajemen Facility Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tugaskan admin untuk mengelola fasilitas tertentu
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 justify-center">
          <Plus className="w-4 h-4" />
          Tugaskan Manager
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : managers.length === 0 ? (
        <div className="card py-16 text-center text-slate-500 dark:text-slate-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Belum ada manager ditugaskan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {managers.map(m => (
            <div key={m.id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {facilityName(m)}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {m.assigned_at
                        ? new Date(m.assigned_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </p>
                  </div>
                </div>
                {m.is_primary && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex-shrink-0">
                    <Star className="w-3 h-3" />
                    Utama
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <UserCog className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{adminName(m)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{adminEmail(m)}</span>
              </div>

              {m.notes && (
                <p className="text-sm text-slate-600 dark:text-slate-400 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                  {m.notes}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  onClick={() => openEdit(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editing ? 'Edit Manager' : 'Tugaskan Manager'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Fasilitas</label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm({ ...form, facility_id: e.target.value })}
                  className="input"
                >
                  <option value="">Pilih fasilitas</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Admin</label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm({ ...form, admin_user_id: e.target.value })}
                  className="input"
                >
                  <option value="">Pilih admin</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? a.email ?? a.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Catatan (opsional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan tambahan..."
                  rows={3}
                  className="input resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={e => setForm({ ...form, is_primary: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Jadikan manager utama
                </span>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>{editing ? 'Simpan' : 'Tugaskan'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

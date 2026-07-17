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
  XCircle,
  Star,
  User,
  Mail,
  StickyNote,
} from 'lucide-react';

// ---- Types ----
interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string | null;
  assigned_at: string | null;
  admin_user?: AdminUser | null;
  facility?: Facility | null;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
}

interface Facility {
  id: string;
  name: string;
}

interface ManagerForm {
  admin_user_id: string;
  facility_id: string;
  is_primary: boolean;
  notes: string;
}

const emptyForm: ManagerForm = {
  admin_user_id: '',
  facility_id: '',
  is_primary: false,
  notes: '',
};

// ---- Component ----
export default function FacilityManagersPage() {
  const [managers, setManagers] = useState<FacilityManager[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FacilityManager | null>(null);
  const [form, setForm] = useState<ManagerForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mgrRes, usersRes, facRes] = await Promise.all([
        supabase
          .from('facility_managers')
          .select(
            'id, facility_id, admin_user_id, is_primary, notes, assigned_at, admin_user:admin_users(id, email, name), facility:facilities(id, name)'
          )
          .order('assigned_at', { ascending: false }),
        supabase
          .from('admin_users')
          .select('id, email, name')
          .eq('is_active', true)
          .order('email', { ascending: true }),
        supabase.from('facilities').select('id, name').order('name'),
      ]);

      if (mgrRes.error) throw mgrRes.error;
      if (usersRes.error) throw usersRes.error;
      if (facRes.error) throw facRes.error;

      setManagers((mgrRes.data ?? []) as unknown as FacilityManager[]);
      setAdminUsers((usersRes.data ?? []) as unknown as AdminUser[]);
      setFacilities((facRes.data ?? []) as unknown as Facility[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (m: FacilityManager) => {
    setEditing(m);
    setForm({
      admin_user_id: m.admin_user_id,
      facility_id: m.facility_id,
      is_primary: m.is_primary,
      notes: m.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.admin_user_id) {
      showToast('Pilih admin terlebih dahulu', 'warning');
      return;
    }
    if (!form.facility_id) {
      showToast('Pilih fasilitas terlebih dahulu', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        admin_user_id: form.admin_user_id,
        facility_id: form.facility_id,
        is_primary: form.is_primary,
        notes: form.notes.trim(),
      };
      if (editing) {
        const { error } = await supabase
          .from('facility_managers')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        showToast('Penanggung jawab diperbarui', 'success');
      } else {
        const { error } = await supabase.from('facility_managers').insert(payload);
        if (error) throw error;
        showToast('Penanggung jawab ditambahkan', 'success');
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: FacilityManager) => {
    const label = m.admin_user?.email ?? m.admin_user_id;
    if (!confirm(`Hapus penanggung jawab "${label}"?`)) return;
    try {
      const { error } = await supabase
        .from('facility_managers')
        .delete()
        .eq('id', m.id);
      if (error) throw error;
      showToast('Penanggung jawab dihapus', 'success');
      setManagers(prev => prev.filter(x => x.id !== m.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" />
            Penanggung Jawab Fasilitas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola penanggung jawab untuk setiap fasilitas
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah PJ
        </button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : managers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            Belum ada penanggung jawab
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {managers.map(m => (
              <div
                key={m.id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {m.admin_user?.name || m.admin_user?.email || '—'}
                      </p>
                      {m.is_primary && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3" />
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      {m.admin_user?.email ?? '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-300">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {m.facility?.name ?? '—'}
                  </div>
                  {m.notes && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-[12rem] truncate">
                      <StickyNote className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{m.notes}</span>
                    </div>
                  )}
                  <button
                    onClick={() => openEdit(m)}
                    className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Penanggung Jawab' : 'Tambah Penanggung Jawab'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.admin_user_id}
                  onChange={e =>
                    setForm({ ...form, admin_user_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">— Pilih Admin —</option>
                  {adminUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Fasilitas <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.facility_id}
                  onChange={e =>
                    setForm({ ...form, facility_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">— Pilih Fasilitas —</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
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
                  rows={3}
                  placeholder="Catatan tambahan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, is_primary: !form.is_primary })
                  }
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.is_primary ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      form.is_primary ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  Penanggung jawab utama
                </span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

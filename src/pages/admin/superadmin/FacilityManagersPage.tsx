import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Building2, UserCog, Plus, Pencil, Trash2, Loader2, X, Star,
  RefreshCw, Search, Mail,
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
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingManager, setEditingManager] = useState<FacilityManager | null>(null);
  const [form, setForm] = useState<ManagerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select('*, facility:facilities(id,name), admin_user:admin_users(id,name,email)')
      .order('assigned_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data penanggung jawab', 'error');
    } else {
      setManagers((data as unknown as FacilityManager[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [facRes, adminRes] = await Promise.all([
      supabase.from('facilities').select('id,name').order('name', { ascending: true }),
      supabase.from('admin_users').select('id,name,email').eq('is_active', true).order('name', { ascending: true }),
    ]);
    if (facRes.data) setFacilities(facRes.data as unknown as Facility[]);
    if (adminRes.data) setAdminUsers(adminRes.data as unknown as AdminUser[]);
  }, []);

  useEffect(() => {
    fetchManagers();
    fetchOptions();
  }, [fetchManagers, fetchOptions]);

  const filteredManagers = managers.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.facility?.name ?? '').toLowerCase().includes(q) ||
      (m.admin_user?.name ?? '').toLowerCase().includes(q) ||
      (m.admin_user?.email ?? '').toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    setEditingManager(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (m: FacilityManager) => {
    setEditingManager(m);
    setForm({
      facility_id: m.facility_id ?? '',
      admin_user_id: m.admin_user_id ?? '',
      is_primary: m.is_primary ?? false,
      notes: m.notes ?? '',
    });
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

      if (editingManager) {
        const { error } = await supabase
          .from('facility_managers')
          .update(payload)
          .eq('id', editingManager.id);
        if (error) {
          showToast('Gagal memperbarui: ' + error.message, 'error');
        } else {
          showToast('Penanggung jawab diperbarui', 'success');
          setShowModal(false);
          fetchManagers();
        }
      } else {
        const { error } = await supabase.from('facility_managers').insert(payload);
        if (error) {
          showToast('Gagal menambah: ' + error.message, 'error');
        } else {
          showToast('Penanggung jawab ditambahkan', 'success');
          setShowModal(false);
          fetchManagers();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: FacilityManager) => {
    if (!confirm('Hapus penanggung jawab ini?')) return;
    setDeletingId(m.id);
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', m.id);
      if (error) {
        showToast('Gagal menghapus', 'error');
      } else {
        showToast('Penanggung jawab dihapus', 'success');
        fetchManagers();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog className="w-7 h-7 text-blue-500" />
            Penanggung Jawab Fasilitas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola penugasan admin ke fasilitas
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Penugasan
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari fasilitas atau admin..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
          />
        </div>
        <button
          onClick={fetchManagers}
          className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredManagers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <UserCog className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada penugasan</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredManagers.map(m => (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {m.facility?.name ?? 'Fasilitas tidak dikenal'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {m.admin_user?.name ?? 'Tanpa Nama'}
                    </p>
                  </div>
                </div>
                {m.is_primary && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
                    <Star className="w-3 h-3" />
                    Utama
                  </span>
                )}
              </div>

              {m.admin_user?.email && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{m.admin_user.email}</span>
                </div>
              )}

              {m.notes && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{m.notes}</p>
              )}

              <p className="text-xs text-slate-400 mt-2">
                Ditugaskan: {m.assigned_at ? new Date(m.assigned_at).toLocaleDateString('id-ID') : '-'}
              </p>

              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openEditModal(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  disabled={deletingId === m.id}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  {deletingId === m.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingManager ? 'Edit Penugasan' : 'Tambah Penugasan'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Fasilitas <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm({ ...form, facility_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                >
                  <option value="">Pilih fasilitas</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Admin <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm({ ...form, admin_user_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                >
                  <option value="">Pilih admin</option>
                  {adminUsers.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? 'Tanpa Nama'}{a.email ? ` (${a.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={e => setForm({ ...form, is_primary: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  Penanggung jawab utama
                </span>
              </label>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Catatan
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Catatan tambahan..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />}
                {editingManager ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

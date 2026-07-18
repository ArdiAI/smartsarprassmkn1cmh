import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Building2, Plus, Search, Pencil, Trash2, X, Loader2, UserCog, Star, Mail, Calendar,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Facility {
  id: string;
  name: string;
  location: string | null;
}

interface FacilityManager {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string | null;
  assigned_at: string;
  facility?: Facility | null;
  admin_user?: AdminUser | null;
}

interface FormState {
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string;
}

const emptyForm: FormState = { facility_id: '', admin_user_id: '', is_primary: false, notes: '' };

export default function FacilityManagersPage() {
  const [managers, setManagers] = useState<FacilityManager[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FacilityManager | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFacilities = useCallback(async () => {
    const { data } = await supabase
      .from('facilities')
      .select('id, name, location')
      .order('name', { ascending: true });
    if (data) setFacilities(data as unknown as Facility[]);
  }, []);

  const fetchAdmins = useCallback(async () => {
    const { data } = await supabase
      .from('admin_users')
      .select('id, email, name, role')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (data) setAdmins(data as unknown as AdminUser[]);
  }, []);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select(`
        id, facility_id, admin_user_id, is_primary, notes, assigned_at,
        facility:facilities(id, name, location),
        admin_user:admin_users(id, email, name, role)
      `)
      .order('assigned_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data penanggung jawab', 'error');
      setLoading(false);
      return;
    }
    setManagers((data as unknown as FacilityManager[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchManagers();
    fetchFacilities();
    fetchAdmins();
  }, [fetchManagers, fetchFacilities, fetchAdmins]);

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
      is_primary: m.is_primary,
      notes: m.notes ?? '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
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
      if (editing) {
        const { error } = await supabase.from('facility_managers').update(payload).eq('id', editing.id);
        if (error) {
          showToast('Gagal memperbarui penanggung jawab: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        showToast('Penanggung jawab berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('facility_managers').insert(payload);
        if (error) {
          showToast('Gagal menambahkan penanggung jawab: ' + error.message, 'error');
          setSaving(false);
          return;
        }
        showToast('Penanggung jawab berhasil ditambahkan', 'success');
      }
      closeModal();
      await fetchManagers();
    } catch (e) {
      showToast('Terjadi kesalahan', 'error');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: FacilityManager) => {
    const facName = m.facility?.name ?? 'fasilitas ini';
    const admName = m.admin_user?.name ?? 'admin ini';
    if (!confirm(`Hapus penugasan ${admName} dari ${facName}?`)) return;
    setActionLoading(m.id);
    const { error } = await supabase.from('facility_managers').delete().eq('id', m.id);
    if (error) {
      showToast('Gagal menghapus penugasan', 'error');
      setActionLoading(null);
      return;
    }
    showToast('Penugasan berhasil dihapus', 'success');
    await fetchManagers();
    setActionLoading(null);
  };

  const filtered = managers.filter(m => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      m.facility?.name?.toLowerCase().includes(q) ||
      m.admin_user?.name?.toLowerCase().includes(q) ||
      m.admin_user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog className="w-7 h-7 text-cyan-600" />
            Penanggung Jawab Fasilitas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola penugasan admin sebagai PJ fasilitas dalam sistem SMART SARPRAS
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={facilities.length === 0 || admins.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Tambah Penugasan
        </button>
      </div>

      {facilities.length === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Belum ada fasilitas terdaftar. Tambahkan fasilitas terlebih dahulu sebelum menugaskan PJ.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari fasilitas, nama, atau email admin..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center">
          <UserCog className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada penugasan ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(m => (
            <div
              key={m.id}
              className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {m.facility?.name ?? '— fasilitas tidak dikenal —'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {m.facility?.location || 'Tanpa lokasi'}
                    </p>
                  </div>
                </div>
                {m.is_primary && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
                    <Star className="w-3 h-3 fill-current" /> Utama
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-900 dark:text-white font-medium truncate">
                    {m.admin_user?.name ?? '— admin tidak dikenal —'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 truncate text-xs">
                    {m.admin_user?.email ?? '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {m.assigned_at ? new Date(m.assigned_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    }) : '-'}
                  </span>
                </div>
              </div>

              {m.notes && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2.5">
                  {m.notes}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openEdit(m)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  disabled={actionLoading === m.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  {actionLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-cyan-600" />
                {editing ? 'Edit Penugasan' : 'Tambah Penugasan PJ'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Fasilitas</label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm(f => ({ ...f, facility_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">— Pilih Fasilitas —</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}{f.location ? ` · ${f.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Admin / PJ</label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm(f => ({ ...f, admin_user_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">— Pilih Admin —</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.email} ({a.role})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_primary}
                  onClick={() => setForm(f => ({ ...f, is_primary: !f.is_primary }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.is_primary ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600',
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    form.is_primary ? 'translate-x-6' : 'translate-x-1',
                  )} />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500" /> PJ Utama untuk fasilitas ini
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Catatan tambahan (opsional)..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />}
                {editing ? 'Simpan Perubahan' : 'Tambah Penugasan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

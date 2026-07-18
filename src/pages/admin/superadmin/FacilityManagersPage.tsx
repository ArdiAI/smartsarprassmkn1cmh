import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  Building2, Plus, Pencil, Trash2, Loader2, RefreshCw, X, Star, User, Mail, Calendar,
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
  name: string;
}

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
}

interface ManagerRow extends FacilityManager {
  facility?: { name: string } | null;
  admin_user?: { name: string | null; email: string | null } | null;
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
  const [editing, setEditing] = useState<ManagerRow | null>(null);
  const [form, setForm] = useState<ManagerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select(`
        *,
        facility:facilities(name),
        admin_user:admin_users(name, email)
      `)
      .order('assigned_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data penanggung jawab', 'error');
    } else {
      setManagers((data as unknown as ManagerRow[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [facRes, adminRes] = await Promise.all([
      supabase.from('facilities').select('id, name').order('name', { ascending: true }),
      supabase.from('admin_users').select('id, name, email').eq('is_active', true).order('name', { ascending: true }),
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

  const openEdit = (m: ManagerRow) => {
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
        const { error } = await supabase
          .from('facility_managers')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        showToast('Penanggung jawab diperbarui', 'success');
      } else {
        const { error } = await supabase
          .from('facility_managers')
          .insert(payload);
        if (error) throw error;
        showToast('Penanggung jawab ditambahkan', 'success');
      }
      setShowModal(false);
      fetchManagers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan data';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: ManagerRow) => {
    if (!confirm('Hapus penanggung jawab ini?')) return;
    setDeletingId(m.id);
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', m.id);
      if (error) throw error;
      setManagers(prev => prev.filter(x => x.id !== m.id));
      showToast('Penanggung jawab dihapus', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus data';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const facilityName = (m: ManagerRow) => m.facility?.name ?? 'Fasilitas tidak dikenal';
  const adminName = (m: ManagerRow) => m.admin_user?.name ?? 'Tanpa Nama';
  const adminEmail = (m: ManagerRow) => m.admin_user?.email ?? '-';

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" />
            Penanggung Jawab Fasilitas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola penugasan admin ke fasilitas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchManagers}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Muat ulang"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Penugasan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : managers.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada penanggung jawab fasilitas</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {managers.map(m => (
            <div
              key={m.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {facilityName(m)}
                    </p>
                    {m.is_primary && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Star className="w-3 h-3" /> Utama
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {adminName(m)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {adminEmail(m)}
                    </span>
                  </div>
                  {m.notes && (
                    <p className="text-xs text-slate-400 mt-1 italic">"{m.notes}"</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                {m.assigned_at ? new Date(m.assigned_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(m)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  disabled={deletingId === m.id}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                  title="Hapus"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Penugasan' : 'Tambah Penugasan'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Fasilitas <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm(f => ({ ...f, facility_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih fasilitas</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm(f => ({ ...f, admin_user_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih admin</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? a.email ?? 'Tanpa Nama'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Catatan tambahan (opsional)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500" /> Penanggung jawab utama
                </span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h--4" />}
                {editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

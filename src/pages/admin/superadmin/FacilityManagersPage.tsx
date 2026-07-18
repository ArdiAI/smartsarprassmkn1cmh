import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import {
  Users, Plus, Trash2, Loader2, X, CheckCircle2, Info, Star, Building2, UserCog,
} from 'lucide-react';

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
  location: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
}

interface FacilityManagerRow extends FacilityManager {
  facility_name: string;
  facility_location: string;
  admin_name: string;
  admin_email: string;
  admin_role: string;
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
  // Note: no update permission for this module — edit is hidden, only add/delete allowed.

  const [managers, setManagers] = useState<FacilityManagerRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ManagerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facility_managers')
      .select(`
        id, facility_id, admin_user_id, is_primary, notes, assigned_at,
        facility:facilities(id, name, location),
        admin:admin_users(id, email, name, role)
      `)
      .order('assigned_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat data PJ Fasilitas', 'error');
      setLoading(false);
      return;
    }
    const rows: FacilityManagerRow[] = ((data as unknown as any[]) || []).map(item => ({
      id: item.id,
      facility_id: item.facility_id,
      admin_user_id: item.admin_user_id,
      is_primary: item.is_primary,
      notes: item.notes ?? '',
      assigned_at: item.assigned_at,
      facility_name: item.facility?.name ?? '(fasilitas tidak ditemukan)',
      facility_location: item.facility?.location ?? '',
      admin_name: item.admin?.name ?? '(tanpa nama)',
      admin_email: item.admin?.email ?? '',
      admin_role: item.admin?.role ?? '',
    }));
    setManagers(rows);
    setLoading(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    const [facRes, adminRes] = await Promise.all([
      supabase.from('facilities').select('id, name, location').order('name', { ascending: true }),
      supabase.from('admin_users').select('id, email, name, role').eq('is_active', true).order('name', { ascending: true }),
    ]);
    if (facRes.data) setFacilities(facRes.data as unknown as Facility[]);
    if (adminRes.data) setAdmins(adminRes.data as unknown as AdminUser[]);
  }, []);

  useEffect(() => {
    fetchManagers();
    fetchOptions();
  }, [fetchManagers, fetchOptions]);

  const handleAdd = async () => {
    if (!form.facility_id || !form.admin_user_id) {
      showToast('Fasilitas dan admin wajib dipilih', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('facility_managers')
        .insert({
          facility_id: form.facility_id,
          admin_user_id: form.admin_user_id,
          is_primary: form.is_primary,
          notes: form.notes.trim() || null,
        })
        .select('id, facility_id, admin_user_id, is_primary, notes, assigned_at')
        .single();
      if (error) {
        showToast(`Gagal menambah PJ: ${error.message}`, 'error');
        setSaving(false);
        return;
      }
      const newRow = data as unknown as FacilityManager;
      const facility = facilities.find(f => f.id === form.facility_id);
      const admin = admins.find(a => a.id === form.admin_user_id);
      const enriched: FacilityManagerRow = {
        ...newRow,
        notes: newRow.notes ?? '',
        facility_name: facility?.name ?? '',
        facility_location: facility?.location ?? '',
        admin_name: admin?.name ?? '',
        admin_email: admin?.email ?? '',
        admin_role: admin?.role ?? '',
      };
      setManagers(prev => [enriched, ...prev]);
      showToast('PJ Fasilitas berhasil ditambahkan', 'success');
      setShowModal(false);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: FacilityManagerRow) => {
    if (!confirm(`Hapus penugasan PJ untuk "${m.admin_name}" pada ${m.facility_name}?`)) return;
    setDeletingId(m.id);
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', m.id);
      if (error) {
        showToast('Gagal menghapus PJ', 'error');
        setDeletingId(null);
        return;
      }
      setManagers(prev => prev.filter(x => x.id !== m.id));
      showToast('PJ Fasilitas berhasil dihapus', 'success');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            PJ Fasilitas
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola penanggung jawab fasilitas</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setForm(emptyForm);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Tugaskan PJ
          </button>
        )}
      </div>

      {/* Info banner about PJ Barang */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm">
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : managers.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada PJ Fasilitas ditugaskan</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {managers.map(m => (
            <div
              key={m.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate flex items-center gap-2">
                    {m.facility_name}
                    {m.is_primary && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300">
                        <Star className="w-3 h-3" /> Utama
                      </span>
                    )}
                  </p>
                  {m.facility_location && (
                    <p className="text-xs text-slate-500 truncate">{m.facility_location}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <UserCog className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{m.admin_name}</p>
                  <p className="text-xs text-slate-500 truncate">{m.admin_email}</p>
                </div>
              </div>

              {m.notes && (
                <p className="text-xs text-slate-400 italic flex-1 min-w-0 truncate">"{m.notes}"</p>
              )}

              {canDelete && (
                <button
                  onClick={() => handleDelete(m)}
                  disabled={deletingId === m.id}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0"
                  title="Hapus Penugasan"
                >
                  {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tugaskan PJ Fasilitas</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fasilitas *</label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm(prev => ({ ...prev, facility_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Pilih Fasilitas —</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}{f.location ? ` — ${f.location}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Admin / PJ *</label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm(prev => ({ ...prev, admin_user_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Pilih Admin —</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>{a.name || a.email}{a.role ? ` (${a.role})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Catatan opsional"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={e => setForm(prev => ({ ...prev, is_primary: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> Tandai sebagai PJ Utama
                </span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Tugaskan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

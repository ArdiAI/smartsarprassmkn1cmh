import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../utils/cn';
import { showToast } from '../../../components/Toast';
import {
  Building2,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Star,
  CheckCircle2,
} from 'lucide-react';

// ---- Types matching DB schema ----
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
  location: string | null;
}

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
}

interface FacilityManagerRow extends FacilityManager {
  facility_name: string;
  facility_location: string;
  admin_name: string;
  admin_email: string;
}

type ManagerForm = {
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string;
};

const EMPTY_FORM: ManagerForm = {
  facility_id: '',
  admin_user_id: '',
  is_primary: false,
  notes: '',
};

export default function FacilityManagersPage() {
  const [managers, setManagers] = useState<FacilityManagerRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FacilityManagerRow | null>(null);
  const [form, setForm] = useState<ManagerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mgrRes, facRes, adminRes] = await Promise.all([
        supabase.from('facility_managers').select('*'),
        supabase.from('facilities').select('id, name, location').order('name', { ascending: true }),
        supabase
          .from('admin_users')
          .select('id, email, name')
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ]);

      if (mgrRes.error) throw mgrRes.error;
      if (facRes.error) throw facRes.error;
      if (adminRes.error) throw adminRes.error;

      const mgrs = (mgrRes.data ?? []) as unknown as FacilityManager[];
      const facs = (facRes.data ?? []) as unknown as Facility[];
      const admns = (adminRes.data ?? []) as unknown as AdminUser[];

      const facMap = new Map(facs.map(f => [f.id, f]));
      const adminMap = new Map(admns.map(a => [a.id, a]));

      const rows: FacilityManagerRow[] = mgrs.map(m => {
        const f = facMap.get(m.facility_id);
        const a = adminMap.get(m.admin_user_id);
        return {
          ...m,
          facility_name: f?.name ?? 'Unknown Facility',
          facility_location: f?.location ?? '',
          admin_name: a?.name ?? 'Unknown Admin',
          admin_email: a?.email ?? '',
        };
      });

      rows.sort((x, y) => x.facility_name.localeCompare(y.facility_name));

      setManagers(rows);
      setFacilities(facs);
      setAdmins(admns);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (row: FacilityManagerRow) => {
    setEditing(row);
    setForm({
      facility_id: row.facility_id,
      admin_user_id: row.admin_user_id,
      is_primary: row.is_primary === true,
      notes: row.notes ?? '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.facility_id) {
      showToast('Please select a facility', 'warning');
      return;
    }
    if (!form.admin_user_id) {
      showToast('Please select an admin user', 'warning');
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
        showToast('Assignment updated', 'success');
      } else {
        const { error } = await supabase.from('facility_managers').insert(payload);
        if (error) throw error;
        showToast('Manager assigned', 'success');
      }
      closeModal();
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save assignment';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: FacilityManagerRow) => {
    if (!confirm(`Remove ${row.admin_name} from ${row.facility_name}?`)) return;
    setDeletingId(row.id);
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', row.id);
      if (error) throw error;
      showToast('Assignment removed', 'success');
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove assignment';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-blue-500" />
            Facility Managers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign admin users to manage facilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Assign Manager
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : managers.length === 0 ? (
          <div className="text-center py-16">
            <UserCog className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No facility managers assigned</p>
            <p className="text-sm text-slate-400 mt-1">Assign an admin to a facility to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {managers.map(row => (
              <div
                key={row.id}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                {/* Facility */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {row.facility_name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {row.facility_location || 'No location'}
                    </p>
                  </div>
                </div>

                {/* Manager */}
                <div className="flex items-center gap-3 md:w-64 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                    <UserCog className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {row.admin_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {row.admin_email || '—'}
                    </p>
                  </div>
                </div>

                {/* Primary badge */}
                <div className="md:w-24 flex justify-start md:justify-center">
                  {row.is_primary ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                      <Star className="w-3 h-3 fill-current" />
                      Primary
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Secondary</span>
                  )}
                </div>

                {/* Notes */}
                {row.notes && (
                  <div className="md:flex-1 hidden md:block min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate italic">
                      "{row.notes}"
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(row)}
                    className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(row)}
                    disabled={deletingId === row.id}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Remove"
                  >
                    {deletingId === row.id ? (
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 dark:border-slate-700 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Assignment' : 'Assign Manager'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Facility *
                </label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm(f => ({ ...f, facility_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">— Select facility —</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.location ? ` — ${f.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin User *
                </label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm(f => ({ ...f, admin_user_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">— Select admin —</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? 'Unnamed'}
                      {a.email ? ` (${a.email})` : ''}
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
                    'relative w-11 h-6 rounded-full transition-colors',
                    form.is_primary ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      form.is_primary && 'translate-x-5'
                    )}
                  />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  Primary manager
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes about this assignment..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editing ? 'Save Changes' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

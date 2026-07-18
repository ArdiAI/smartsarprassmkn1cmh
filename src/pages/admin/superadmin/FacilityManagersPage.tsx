import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { showToast } from '../../../components/Toast';
import { cn } from '../../../utils/cn';
import {
  UserCog, Plus, Trash2, Loader2, Search, X, Save, Info, Building2, ShieldCheck,
} from 'lucide-react';

interface FacilityRow {
  id: string;
  name: string;
  location: string | null;
}

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface FacilityManagerRow {
  id: string;
  facility_id: string;
  admin_user_id: string;
  is_primary: boolean;
  notes: string | null;
  assigned_at: string;
  facilities: { id: string; name: string; location: string | null } | null;
  admin_users: { id: string; email: string; name: string } | null;
}

export default function FacilityManagersPage() {
  const { hasPermission } = useAuth();
  const [managers, setManagers] = useState<FacilityManagerRow[]>([]);
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    facility_id: '',
    admin_user_id: '',
    is_primary: false,
    notes: '',
  });

  const canCreate = hasPermission('facility_managers', 'create');
  const canDelete = hasPermission('facility_managers', 'delete');
  // No update permission for this module — only add/delete allowed.

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: mgrData }, { data: facData }, { data: admData }] = await Promise.all([
      supabase
        .from('facility_managers')
        .select('id, facility_id, admin_user_id, is_primary, notes, assigned_at, facilities(id, name, location), admin_users(id, email, name)')
        .order('assigned_at', { ascending: false }),
      supabase.from('facilities').select('id, name, location').order('name', { ascending: true }),
      supabase.from('admin_users').select('id, email, name, role').eq('is_active', true).order('name', { ascending: true }),
    ]);

    setManagers((mgrData as unknown as FacilityManagerRow[]) || []);
    setFacilities((facData as unknown as FacilityRow[]) || []);
    setAdminUsers((admData as unknown as AdminUserRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredManagers = managers.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.facilities?.name?.toLowerCase().includes(q) ||
      m.admin_users?.name?.toLowerCase().includes(q) ||
      m.admin_users?.email?.toLowerCase().includes(q) ||
      m.notes?.toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setForm({ facility_id: '', admin_user_id: '', is_primary: false, notes: '' });
  };

  const handleSave = async () => {
    if (!canCreate) return;
    if (!form.facility_id || !form.admin_user_id) {
      showToast('Fasilitas dan PJ wajib dipilih', 'error');
      return;
    }
    setSaving(true);
    try {
      // If is_primary, clear other primaries for this facility first
      if (form.is_primary) {
        await supabase
          .from('facility_managers')
          .update({ is_primary: false })
          .eq('facility_id', form.facility_id);
      }
      const { error } = await supabase.from('facility_managers').insert({
        facility_id: form.facility_id,
        admin_user_id: form.admin_user_id,
        is_primary: form.is_primary,
        notes: form.notes.trim() || null,
        assigned_at: new Date().toISOString(),
      });
      if (error) throw error;
      showToast('PJ Fasilitas berhasil ditambahkan', 'success');
      setShowModal(false);
      resetForm();
      await fetchData();
    } catch (e: any) {
      showToast(`Gagal menambah PJ: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: FacilityManagerRow) => {
    if (!canDelete) return;
    const facName = m.facilities?.name ?? 'fasilitas ini';
    const admName = m.admin_users?.name ?? m.admin_users?.email ?? 'PJ ini';
    if (!confirm(`Hapus penugasan PJ "${admName}" dari fasilitas "${facName}"?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('facility_managers').delete().eq('id', m.id);
      if (error) throw error;
      setManagers(prev => prev.filter(x => x.id !== m.id));
      showToast('Penugasan PJ berhasil dihapus', 'success');
    } catch (e: any) {
      showToast(`Gagal menghapus: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PJ Fasilitas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola Penanggung Jawab Fasilitas — tambah & hapus penugasan
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah PJ
          </button>
        )}
      </div>

      {/* Info banner: PJ Barang is managed elsewhere */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Untuk menugaskan PJ Barang Inventaris, buka halaman Inventaris dan pilih PJ pada barang yang bersangkutan.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari fasilitas, nama PJ, atau email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Fasilitas</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">PJ (Penanggung Jawab)</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Utama?</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Catatan</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Ditugaskan</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredManagers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <UserCog className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Belum ada penugasan PJ Fasilitas
                  </td>
                </tr>
              ) : (
                filteredManagers.map(m => (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{m.facilities?.name ?? '—'}</p>
                          <p className="text-xs text-slate-500">{m.facilities?.location ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{m.admin_users?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{m.admin_users?.email ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      {m.is_primary ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          <ShieldCheck className="w-3 h-3" /> Utama
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs">
                      <span className="line-clamp-2">{m.notes ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {m.assigned_at ? new Date(m.assigned_at).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(m)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah PJ Fasilitas</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fasilitas *</label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm(f => ({ ...f, facility_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih fasilitas...</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}{f.location ? ` — ${f.location}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Penanggung Jawab *</label>
                <select
                  value={form.admin_user_id}
                  onChange={e => setForm(f => ({ ...f, admin_user_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih admin...</option>
                  {adminUsers.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Jadikan PJ Utama untuk fasilitas ini</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Catatan tambahan (opsional)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50',
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

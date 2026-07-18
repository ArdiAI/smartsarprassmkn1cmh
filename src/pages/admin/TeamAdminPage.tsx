import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  Users, Plus, Pencil, Trash2, Loader2, X, Mail, Phone,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  role: string;
  photo_url: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  name: '',
  position: '',
  role: '',
  photo_url: '',
  description: '',
  email: '',
  phone: '',
  order: '0',
  is_active: 'true',
};

export default function TeamAdminPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('team', 'create');
  const canUpdate = hasPermission('team', 'update');
  const canDelete = hasPermission('team', 'delete');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('order', { ascending: true });
    if (error) {
      showToast('Gagal memuat data tim', 'error');
      setLoading(false);
      return;
    }
    setMembers((data as unknown as TeamMember[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, order: String(members.length) });
    setModalOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setForm({
      name: m.name ?? '',
      position: m.position ?? '',
      role: m.role ?? '',
      photo_url: m.photo_url ?? '',
      description: m.description ?? '',
      email: m.email ?? '',
      phone: m.phone ?? '',
      order: String(m.order ?? 0),
      is_active: String(m.is_active),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      showToast('Nama wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      position: form.position || null,
      role: form.role || null,
      photo_url: form.photo_url || null,
      description: form.description || null,
      email: form.email || null,
      phone: form.phone || null,
      order: Number(form.order) || 0,
      is_active: form.is_active === 'true',
    };
    try {
      if (editing) {
        const { error } = await supabase.from('team_members').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('Anggota tim diperbarui', 'success');
      } else {
        const { error } = await supabase.from('team_members').insert(payload);
        if (error) throw error;
        showToast('Anggota tim ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchMembers();
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan anggota tim', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: TeamMember) => {
    if (!confirm(`Hapus "${m.name}"?`)) return;
    const { error } = await supabase.from('team_members').delete().eq('id', m.id);
    if (error) {
      showToast('Gagal menghapus anggota tim', 'error');
      return;
    }
    showToast('Anggota tim dihapus', 'success');
    await fetchMembers();
  };

  const handleToggleActive = async (m: TeamMember) => {
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: !m.is_active })
      .eq('id', m.id);
    if (error) {
      showToast('Gagal mengubah status', 'error');
      return;
    }
    showToast(m.is_active ? 'Anggota dinonaktifkan' : 'Anggota diaktifkan', 'success');
    await fetchMembers();
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tim</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola anggota tim SMART SARPRAS</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada anggota tim</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <div key={m.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-xl">{(m.name ?? 'A').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{m.name}</h3>
                      <p className="text-sm text-blue-500 truncate">{m.position ?? '-'}</p>
                      {m.role && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.role}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {canUpdate && (
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {m.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">{m.description}</p>
              )}

              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                {m.email && (
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {m.email}</span>
                )}
                {m.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {m.phone}</span>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <span className="text-xs text-slate-400">Urutan: {m.order}</span>
                {canUpdate && (
                  <button
                    onClick={() => handleToggleActive(m)}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                      m.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    )}
                  >
                    {m.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Anggota Tim' : 'Tambah Anggota Tim'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Nama *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Jabatan</label>
                  <input
                    value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Role</label>
                <input
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">URL Foto</label>
                <input
                  value={form.photo_url}
                  onChange={e => setForm({ ...form, photo_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Telepon</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Urutan</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={e => setForm({ ...form, order: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Status</label>
                  <select
                    value={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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

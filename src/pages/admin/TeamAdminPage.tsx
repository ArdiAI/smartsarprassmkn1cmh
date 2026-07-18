import { useEffect, useState } from 'react';
import {
  Users, Plus, Pencil, Trash2, X, Mail, Phone, AlertCircle, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';

interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  role: string | null;
  photo_url: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
}

interface FormData {
  name: string;
  position: string;
  role: string;
  photo_url: string;
  description: string;
  email: string;
  phone: string;
  order: string;
  is_active: boolean;
}

const emptyForm: FormData = {
  name: '',
  position: '',
  role: '',
  photo_url: '',
  description: '',
  email: '',
  phone: '',
  order: '0',
  is_active: true,
};

export default function TeamAdminPage() {
  const { hasPermission } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canCreate = hasPermission('team', 'create');
  const canUpdate = hasPermission('team', 'update');
  const canDelete = hasPermission('team', 'delete');

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('order', { ascending: true });
      if (error) throw error;
      setMembers((data as unknown as TeamMember[]) ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Gagal memuat data tim', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, order: String(members.length) });
    setModalOpen(true);
  }

  function openEdit(member: TeamMember) {
    setEditingId(member.id);
    setForm({
      name: member.name ?? '',
      position: member.position ?? '',
      role: member.role ?? '',
      photo_url: member.photo_url ?? '',
      description: member.description ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      order: String(member.order ?? 0),
      is_active: member.is_active ?? true,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Nama wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        position: form.position.trim() || null,
        role: form.role.trim() || null,
        photo_url: form.photo_url.trim() || null,
        description: form.description.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        order: form.order ? Number(form.order) : 0,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('team_members').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Anggota tim berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('team_members').insert(payload);
        if (error) throw error;
        showToast('Anggota tim berhasil ditambahkan', 'success');
      }
      setModalOpen(false);
      await fetchMembers();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Gagal menyimpan anggota tim', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('Anggota tim berhasil dihapus', 'success');
      setDeleteId(null);
      await fetchMembers();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Gagal menghapus anggota tim', 'error');
    }
  }

  async function toggleActive(member: TeamMember) {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);
      if (error) throw error;
      showToast(`Anggota ${!member.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      await fetchMembers();
    } catch (err) {
      console.error('Toggle error:', err);
      showToast('Gagal mengubah status anggota', 'error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tim</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola anggota tim</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="w-4 h-4" /> Tambah Anggota
          </button>
        )}
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Tidak ada anggota tim</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className={cn(
                'bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-5 flex flex-col',
                member.is_active
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-slate-200 dark:border-slate-700 opacity-60'
              )}
            >
              {/* Avatar */}
              <div className="flex items-start gap-3 mb-3">
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">{member.name}</h3>
                  {member.position && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 truncate">{member.position}</p>
                  )}
                  {member.role && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{member.role}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              {member.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{member.description}</p>
              )}

              {/* Contact */}
              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                {member.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> <span className="truncate">{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {member.phone}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-400 dark:text-slate-500">Urutan: {member.order}</span>
                <div className="flex items-center gap-1">
                  {canUpdate && (
                    <>
                      <button
                        onClick={() => toggleActive(member)}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title={member.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {member.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => openEdit(member)}
                        className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(member.id)}
                      className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Anggota' : 'Tambah Anggota'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nama anggota"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jabatan</label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Kepala Sarpras"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Peran</label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Peran"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL Foto</label>
                <input
                  type="text"
                  value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Deskripsi singkat"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Telepon</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="08xx..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Urutan</label>
                <input
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hapus Anggota?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Users, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

interface TeamMemberRow {
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
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      showToast('Gagal memuat data tim', 'error');
    } else {
      setMembers((data as unknown as TeamMemberRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setForm({ ...emptyForm, order: String(members.length) });
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (member: TeamMemberRow) => {
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
    setEditingId(member.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Nama wajib diisi', 'warning');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      position: form.position.trim() || null,
      role: form.role.trim() || null,
      photo_url: form.photo_url.trim() || null,
      description: form.description.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      order: parseInt(form.order) || 0,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from('team_members').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui anggota tim', 'error');
      } else {
        showToast('Anggota tim diperbarui', 'success');
        setModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('team_members').insert(payload);
      if (error) {
        showToast('Gagal menambahkan anggota tim', 'error');
      } else {
        showToast('Anggota tim ditambahkan', 'success');
        setModalOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus anggota tim ini?')) return;
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus anggota tim', 'error');
    } else {
      showToast('Anggota tim dihapus', 'success');
      fetchData();
    }
  };

  const handleToggleActive = async (member: TeamMemberRow) => {
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);
    if (error) {
      showToast('Gagal mengubah status', 'error');
    } else {
      showToast(`Anggota ${!member.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tim</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data anggota tim
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Tambah Anggota
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-slate-400 dark:text-slate-500">Belum ada anggota tim</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map(member => (
            <div
              key={member.id}
              className={cn(
                'bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden',
                member.is_active
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-slate-200 dark:border-slate-700 opacity-60'
              )}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.name}
                      className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {member.name}
                    </h3>
                    {member.position && (
                      <p className="text-xs text-blue-600 dark:text-cyan-400 truncate">{member.position}</p>
                    )}
                    {member.role && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{member.role}</p>
                    )}
                  </div>
                </div>

                {member.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-3">
                    {member.description}
                  </p>
                )}

                <div className="mt-3 space-y-1 text-xs text-slate-400 dark:text-slate-500">
                  {member.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 dark:text-slate-500">
                  <span>Urutan: {member.order}</span>
                  <span className={cn(
                    'ml-auto px-2 py-0.5 rounded-lg text-xs font-medium',
                    member.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}>
                    {member.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => openEdit(member)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(member)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    {member.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {member.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editingId ? 'Edit Anggota' : 'Tambah Anggota'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nama *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Posisi</label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Role</label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Urutan (order)</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={e => setForm({ ...form, order: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">URL Foto</label>
                <input
                  type="text"
                  value={form.photo_url}
                  onChange={e => setForm({ ...form, photo_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Telepon</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">Aktif</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

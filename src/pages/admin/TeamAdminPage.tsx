import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, X, Mail, Phone, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  role: string;
  photo_url: string;
  description: string;
  email: string;
  phone: string;
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
  order: 0,
  is_active: true,
};

export default function TeamAdminPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase.from('team_members').select('*').order('order', { ascending: true });
    setMembers((data as unknown as TeamMember[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openAdd = () => {
    setForm({ ...emptyForm, order: members.length });
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setForm({
      name: member.name ?? '',
      position: member.position ?? '',
      role: member.role ?? '',
      photo_url: member.photo_url ?? '',
      description: member.description ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      order: member.order ?? 0,
      is_active: member.is_active ?? true,
    });
    setEditingId(member.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.position.trim()) {
      showToast('Nama dan jabatan wajib diisi', 'warning');
      return;
    }
    const payload = {
      name: form.name,
      position: form.position,
      role: form.role,
      photo_url: form.photo_url || null,
      description: form.description || null,
      email: form.email || null,
      phone: form.phone || null,
      order: Number(form.order),
      is_active: form.is_active,
    };
    if (editingId) {
      const { error } = await supabase.from('team_members').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui anggota tim', 'error');
        return;
      }
      showToast('Anggota tim diperbarui', 'success');
    } else {
      const { error } = await supabase.from('team_members').insert(payload);
      if (error) {
        showToast('Gagal menambah anggota tim', 'error');
        return;
      }
      showToast('Anggota tim ditambahkan', 'success');
    }
    setModalOpen(false);
    await fetchMembers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus anggota tim ini?')) return;
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus anggota tim', 'error');
      return;
    }
    showToast('Anggota tim dihapus', 'success');
    await fetchMembers();
  };

  const toggleActive = async (member: TeamMember) => {
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);
    if (error) {
      showToast('Gagal mengubah status', 'error');
      return;
    }
    showToast(`Anggota ${member.is_active ? 'dinonaktifkan' : 'diaktifkan'}`, 'success');
    await fetchMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Tim</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola anggota tim</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Anggota
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada anggota tim</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {members.map((member) => (
            <div
              key={member.id}
              className={cn(
                'bg-white dark:bg-slate-800 rounded-2xl border p-5 transition-shadow hover:shadow-lg',
                member.is_active
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-slate-200 dark:border-slate-700 opacity-60'
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white">{(member.name ?? '?').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white truncate">{member.name ?? ''}</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{member.position ?? ''}</p>
                  {member.role && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{member.role}</p>
                  )}
                </div>
              </div>

              {member.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">{member.description}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                {member.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3.5 h-3.5" /> <span className="truncate">{member.email}</span>
                  </span>
                )}
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {member.phone}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => toggleActive(member)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium transition-colors',
                    member.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {member.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {member.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(member)}
                    className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editingId ? 'Edit Anggota' : 'Tambah Anggota'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Nama *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Jabatan *</label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Peran</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">URL Foto</label>
                <input
                  type="text"
                  value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Telepon</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Urutan</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">Status</label>
                  <select
                    value={form.is_active ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

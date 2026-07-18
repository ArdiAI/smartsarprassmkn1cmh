import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  Users, Plus, Pencil, Trash2, X, Loader2, Mail, Phone, ToggleLeft, ToggleRight,
} from 'lucide-react';

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
  const canCreate = hasPermission('team', 'create');
  const canUpdate = hasPermission('team', 'update');
  const canDelete = hasPermission('team', 'delete');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditing(member);
    setForm({
      name: member.name ?? '',
      position: member.position ?? '',
      role: member.role ?? '',
      photo_url: member.photo_url ?? '',
      description: member.description ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      order: member.order != null ? String(member.order) : '0',
      is_active: member.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      order: form.order ? Number(form.order) : 0,
      is_active: form.is_active,
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
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan anggota tim', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);
      if (error) throw error;
      showToast(member.is_active ? 'Anggota dinonaktifkan' : 'Anggota diaktifkan', 'success');
      await fetchMembers();
    } catch (e) {
      console.error(e);
      showToast('Gagal mengubah status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
      showToast('Anggota tim dihapus', 'success');
      setDeleteId(null);
      await fetchMembers();
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus anggota tim', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tim</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola anggota tim</p>
        </div>
        {canCreate && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada anggota tim</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => (
            <div key={member.id} className={cn('card p-5', !member.is_active && 'opacity-60')}>
              <div className="flex items-start gap-4">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-blue-500">
                      {member.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{member.name}</h3>
                  {member.position && (
                    <p className="text-sm text-blue-600 dark:text-blue-400">{member.position}</p>
                  )}
                  {member.role && (
                    <p className="text-xs text-slate-400 mt-0.5">{member.role}</p>
                  )}
                </div>
              </div>
              {member.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">{member.description}</p>
              )}
              <div className="flex flex-col gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-3">
                {member.email && (
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {member.email}
                  </span>
                )}
                {member.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {member.phone}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                {canUpdate && (
                  <>
                    <button
                      onClick={() => openEdit(member)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm font-medium transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(member)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-medium transition-colors"
                      title={member.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {member.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                      {member.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    onClick={() => setDeleteId(member.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-sm font-medium transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Anggota Tim' : 'Tambah Anggota Tim'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nama</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Jabatan</label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Peran (Role)</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">URL Foto</label>
                <input
                  type="url"
                  value={form.photo_url}
                  onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Telepon</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Urutan (Order)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.order}
                    onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={form.is_active ? 'true' : 'false'}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}
                    className="input"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hapus Anggota Tim?</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Tindakan ini tidak dapat dibatalkan. Yakin ingin menghapus anggota ini?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
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

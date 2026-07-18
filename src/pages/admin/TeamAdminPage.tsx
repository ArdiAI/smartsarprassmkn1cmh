import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import {
  Plus, Pencil, Trash2, Search, Loader2, Users, X, Mail, Phone,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  role: string;
  photo_url: string | null;
  description: string | null;
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
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('team_members').select('*').order('order', { ascending: true });
    if (error) {
      showToast('Gagal memuat data tim', 'error');
    } else {
      setMembers((data as unknown as TeamMember[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.position?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditingId(m.id);
    setForm({
      name: m.name ?? '',
      position: m.position ?? '',
      role: m.role ?? '',
      photo_url: m.photo_url ?? '',
      description: m.description ?? '',
      email: m.email ?? '',
      phone: m.phone ?? '',
      order: String(m.order ?? 0),
      is_active: m.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      showToast('Nama wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      position: form.position,
      role: form.role,
      photo_url: form.photo_url || null,
      description: form.description || null,
      email: form.email,
      phone: form.phone,
      order: Number(form.order) || 0,
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from('team_members').update(payload).eq('id', editingId);
      if (error) showToast('Gagal memperbarui anggota tim', 'error');
      else showToast('Anggota tim diperbarui', 'success');
    } else {
      const { error } = await supabase.from('team_members').insert(payload);
      if (error) showToast('Gagal menambah anggota tim', 'error');
      else showToast('Anggota tim ditambahkan', 'success');
    }
    setSaving(false);
    setModalOpen(false);
    fetchMembers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus anggota tim ini?')) return;
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) showToast('Gagal menghapus anggota tim', 'error');
    else showToast('Anggota tim dihapus', 'success');
    fetchMembers();
  };

  const toggleActive = async (m: TeamMember) => {
    const { error } = await supabase.from('team_members').update({ is_active: !m.is_active }).eq('id', m.id);
    if (error) showToast('Gagal mengubah status', 'error');
    else showToast('Status diperbarui', 'success');
    fetchMembers();
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, posisi, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada anggota tim</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m) => (
              <div key={m.id} className="rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden bg-slate-50 dark:bg-slate-700/20">
                <div className="p-4 flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-xl">{(m.name || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{m.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{m.position}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canUpdate && (
                          <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {m.role && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                        {m.role}
                      </span>
                    )}
                  </div>
                </div>
                {m.description && (
                  <p className="px-4 pb-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{m.description}</p>
                )}
                <div className="px-4 pb-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {m.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {m.email}</div>}
                  {m.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {m.phone}</div>}
                </div>
                <div className="px-4 pb-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Urutan: {m.order}</span>
                  {canUpdate && (
                    <button
                      onClick={() => toggleActive(m)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        m.is_active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {m.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingId ? 'Edit Anggota Tim' : 'Tambah Anggota Tim'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nama</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="label">Posisi</label>
                  <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Posisi/jabatan" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role" />
                </div>
                <div>
                  <label className="label">Urutan (order)</label>
                  <input type="number" className="input" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div>
                  <label className="label">Telepon</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xx" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">URL Foto</label>
                  <input className="input" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Aktif</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

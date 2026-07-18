import { useEffect, useState, useCallback, type FormEvent } from 'react';
import {
  Plus, Search, Pencil, Trash2, Loader2, X, Mail, Phone, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  role: string | null;
  photo_url: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  order: number | null;
  is_active: boolean | null;
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
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('team_members').select('*').order('order', { ascending: true });
    if (error) {
      showToast('Gagal memuat tim', 'error');
      setMembers([]);
    } else {
      setMembers((data ?? []) as unknown as TeamMember[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };

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
      order: m.order?.toString() ?? '0',
      is_active: m.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleDelete = async (m: TeamMember) => {
    if (!confirm(`Hapus anggota "${m.name}"?`)) return;
    const { error } = await supabase.from('team_members').delete().eq('id', m.id);
    if (error) { showToast('Gagal menghapus: ' + error.message, 'error'); return; }
    showToast('Anggota tim dihapus', 'success');
    fetchMembers();
  };

  const toggleActive = async (m: TeamMember) => {
    const { error } = await supabase.from('team_members').update({ is_active: !m.is_active }).eq('id', m.id);
    if (error) { showToast('Gagal mengubah status', 'error'); return; }
    showToast('Status diperbarui', 'success');
    fetchMembers();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Nama wajib diisi', 'error');

    const payload = {
      name: form.name.trim(),
      position: form.position.trim() || null,
      role: form.role.trim() || null,
      photo_url: form.photo_url.trim() || null,
      description: form.description.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      order: form.order ? parseInt(form.order, 10) : 0,
      is_active: form.is_active,
    };

    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('team_members').update(payload).eq('id', editing.id);
      if (error) { showToast('Gagal update: ' + error.message, 'error'); setSaving(false); return; }
      showToast('Anggota tim diperbarui', 'success');
    } else {
      const { error } = await supabase.from('team_members').insert(payload);
      if (error) { showToast('Gagal menambah: ' + error.message, 'error'); setSaving(false); return; }
      showToast('Anggota tim ditambahkan', 'success');
    }
    setSaving(false);
    setModalOpen(false);
    fetchMembers();
  };

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.position?.toLowerCase().includes(q) ?? false) || (m.role?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kelola Tim</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daftar anggota tim sarana dan prasarana.</p>
        </div>
        {hasPermission('team', 'create') && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" /> Tambah Anggota
          </button>
        )}
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Cari nama, jabatan, atau peran..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="Tidak ada anggota" description="Belum ada anggota tim yang ditambahkan." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <div key={m.id} className="card flex flex-col">
              <div className="flex items-start gap-3">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-600 dark:bg-brand-900/40">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-800 dark:text-slate-100">{m.name}</h3>
                  {m.position && <p className="text-sm text-slate-500 dark:text-slate-400">{m.position}</p>}
                  {m.role && <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{m.role}</span>}
                </div>
              </div>
              {m.description && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{m.description}</p>}
              <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                {m.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> {m.email}</div>}
                {m.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {m.phone}</div>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-400">Urutan: {m.order ?? 0}</span>
                <button onClick={() => toggleActive(m)} className={`inline-flex items-center gap-1 text-xs font-semibold ${m.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {m.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  {m.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {hasPermission('team', 'update') && (
                  <button onClick={() => openEdit(m)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                {hasPermission('team', 'delete') && (
                  <button onClick={() => handleDelete(m)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Anggota' : 'Tambah Anggota'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nama <span className="text-red-500">*</span></label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Jabatan</label>
                  <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </div>
                <div>
                  <label className="label">Peran</label>
                  <input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                </div>
                <div>
                  <label className="label">Urutan (Order)</label>
                  <input type="number" min={0} className="input" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Telepon</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">URL Foto</label>
                  <input className="input" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Deskripsi</label>
                  <textarea className="input min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktif</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

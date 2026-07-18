import { useEffect, useState, useMemo, type FormEvent } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Mail,
  Phone,
  ToggleLeft,
  ToggleRight,
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
  order: number;
  is_active: boolean;
  created_at: string;
}

interface TeamForm {
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

const emptyForm: TeamForm = {
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
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<TeamForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const canCreate = hasPermission('team', 'create');
  const canUpdate = hasPermission('team', 'update');
  const canDelete = hasPermission('team', 'delete');

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('team_members').select('*').order('order', { ascending: true });
      if (error) {
        showToast('Gagal memuat tim', 'error');
        return;
      }
      setMembers((data as unknown as TeamMember[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, order: String(members.length) });
    setModalOpen(true);
  }

  function openEdit(m: TeamMember) {
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
      is_active: m.is_active ?? true,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Nama wajib diisi', 'warning');
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
        order: parseInt(form.order, 10) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('team_members').update(payload).eq('id', editing.id);
        if (error) {
          showToast('Gagal memperbarui anggota', 'error');
          return;
        }
        showToast('Anggota diperbarui', 'success');
      } else {
        const { error } = await supabase.from('team_members').insert(payload);
        if (error) {
          showToast('Gagal menambah anggota', 'error');
          return;
        }
        showToast('Anggota ditambahkan', 'success');
      }
      closeModal();
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: TeamMember) {
    if (!confirm(`Hapus "${m.name}"?`)) return;
    setDeleting(m.id);
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', m.id);
      if (error) {
        showToast('Gagal menghapus anggota', 'error');
        return;
      }
      showToast('Anggota dihapus', 'success');
      fetchData();
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(m: TeamMember) {
    setToggling(m.id);
    try {
      const { error } = await supabase.from('team_members').update({ is_active: !m.is_active }).eq('id', m.id);
      if (error) {
        showToast('Gagal mengubah status', 'error');
        return;
      }
      showToast(m.is_active ? 'Anggota dinonaktifkan' : 'Anggota diaktifkan', 'success');
      fetchData();
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tim</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola anggota tim sekolah.</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Anggota
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : members.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada anggota" description="Belum ada data anggota tim." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <div key={m.id} className="card flex flex-col">
              <div className="flex items-start gap-3">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name} className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-100 text-lg font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{m.name}</h3>
                  {m.position && <p className="text-sm text-slate-500 dark:text-slate-400">{m.position}</p>}
                  {m.role && <p className="text-xs text-brand-600 dark:text-brand-400">{m.role}</p>}
                </div>
                {canUpdate && (
                  <button
                    onClick={() => toggleActive(m)}
                    disabled={toggling === m.id}
                    title={m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {toggling === m.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    ) : m.is_active ? (
                      <ToggleRight className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-slate-400" />
                    )}
                  </button>
                )}
              </div>
              {m.description && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{m.description}</p>}
              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {m.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {m.email}</p>}
                {m.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {m.phone}</p>}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {canUpdate && (
                  <button onClick={() => openEdit(m)} className="btn-secondary flex-1 px-3 py-2 text-xs">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(m)} disabled={deleting === m.id} className="btn-danger px-3 py-2 text-xs">
                    {deleting === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Anggota' : 'Tambah Anggota'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama <span className="text-red-500">*</span></label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jabatan</label>
                  <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </div>
                <div>
                  <label className="label">Peran</label>
                  <input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">URL Foto</label>
                <input className="input" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Telepon</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Urutan</label>
                  <input type="number" min={0} className="input" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={String(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users,
  Mail,
  Phone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import EmptyState from '../../components/EmptyState';

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

interface FormState {
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

const emptyForm: FormState = {
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
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('order', { ascending: true });
    if (error) {
      showToast('Gagal memuat tim', 'error');
    } else {
      setMembers((data as unknown as TeamMember[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, order: String(members.length) });
    setShowModal(true);
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
      is_active: m.is_active,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.position.trim()) {
      showToast('Nama dan posisi wajib diisi', 'error');
      return;
    }
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      position: form.position.trim(),
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
        showToast('Gagal memperbarui: ' + error.message, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Anggota tim diperbarui', 'success');
    } else {
      const { error } = await supabase.from('team_members').insert(payload);
      if (error) {
        showToast('Gagal menambah: ' + error.message, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Anggota tim ditambahkan', 'success');
    }
    setSubmitting(false);
    closeModal();
    fetchMembers();
  }

  async function handleDelete(m: TeamMember) {
    if (!confirm(`Hapus "${m.name}"?`)) return;
    setDeleting(m.id);
    const { error } = await supabase.from('team_members').delete().eq('id', m.id);
    setDeleting(null);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Anggota tim dihapus', 'success');
    fetchMembers();
  }

  async function handleToggleActive(m: TeamMember) {
    setToggling(m.id);
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: !m.is_active })
      .eq('id', m.id);
    setToggling(null);
    if (error) {
      showToast('Gagal mengubah status', 'error');
      return;
    }
    showToast(m.is_active ? 'Anggota dinonaktifkan' : 'Anggota diaktifkan', 'success');
    fetchMembers();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tim</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola anggota tim sekolah.
          </p>
        </div>
        {hasPermission('team', 'create') && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Anggota
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-slate-400" />}
          title="Tidak ada anggota"
          description="Belum ada anggota tim yang terdaftar."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <div key={m.id} className="card flex flex-col">
              <div className="flex items-start gap-3">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                    <span className="text-lg font-bold text-brand-600">
                      {m.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{m.name}</h3>
                  <p className="text-sm text-brand-600 dark:text-brand-400">{m.position}</p>
                  {m.role && (
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {m.role}
                    </span>
                  )}
                </div>
              </div>

              {m.description && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{m.description}</p>
              )}

              <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {m.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {m.email}
                  </div>
                )}
                {m.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {m.phone}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  m.is_active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                )}>
                  {m.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <span className="text-xs text-slate-400">Urutan: {m.order}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {hasPermission('team', 'update') && (
                  <>
                    <button
                      onClick={() => openEdit(m)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(m)}
                      disabled={toggling === m.id}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {toggling === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </>
                )}
                {hasPermission('team', 'delete') && (
                  <button
                    onClick={() => handleDelete(m)}
                    disabled={deleting === m.id}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {deleting === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Anggota' : 'Tambah Anggota'}
              </h2>
              <button onClick={closeModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama <span className="text-red-500">*</span></label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Posisi <span className="text-red-500">*</span></label>
                <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <div>
                <label className="label">Role</label>
                <input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
              <div>
                <label className="label">URL Foto</label>
                <input className="input" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                  <select
                    className="input"
                    value={form.is_active ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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

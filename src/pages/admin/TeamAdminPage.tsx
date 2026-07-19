import { useEffect, useState, useCallback } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import { cn } from '../../utils/cn';

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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('order', { ascending: true });
    if (error) {
      showToast('Gagal memuat tim', 'error');
      setMembers([]);
    } else {
      setMembers((data as unknown as TeamMember[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
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
      is_active: m.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Nama wajib diisi', 'error');
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
      order: Number(form.order) || 0,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from('team_members').update(payload).eq('id', editing.id)
      : await supabase.from('team_members').insert(payload);
    setSaving(false);
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error');
      return;
    }
    showToast(editing ? 'Anggota diperbarui' : 'Anggota ditambahkan', 'success');
    setModalOpen(false);
    await fetchMembers();
  };

  const handleDelete = async (m: TeamMember) => {
    if (!confirm(`Hapus "${m.name}"?`)) return;
    const { error } = await supabase.from('team_members').delete().eq('id', m.id);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error');
      return;
    }
    showToast('Anggota dihapus', 'info');
    await fetchMembers();
  };

  const toggleActive = async (m: TeamMember) => {
    setToggling(m.id);
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: !m.is_active })
      .eq('id', m.id);
    setToggling(null);
    if (error) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
      return;
    }
    showToast('Status diperbarui', 'success');
    await fetchMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tim</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola anggota tim sekolah.
          </p>
        </div>
        {hasPermission('team', 'create') && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah Anggota
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : members.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada anggota" description="Belum ada data anggota tim." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <div key={m.id} className={cn('card flex flex-col', !m.is_active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{m.name}</h3>
                  {m.position && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{m.position}</p>
                  )}
                  {m.role && (
                    <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                      {m.role}
                    </span>
                  )}
                </div>
              </div>

              {m.description && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{m.description}</p>
              )}

              <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {m.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {m.email}
                  </div>
                )}
                {m.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {m.phone}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {hasPermission('team', 'update') && (
                  <>
                    <button onClick={() => openEdit(m)} className="btn-secondary flex-1">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(m)}
                      disabled={toggling === m.id}
                      className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {toggling === m.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : m.is_active ? (
                        <ToggleRight className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                  </>
                )}
                {hasPermission('team', 'delete') && (
                  <button
                    onClick={() => handleDelete(m)}
                    className="inline-flex items-center justify-center rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Edit Anggota' : 'Tambah Anggota'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
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
                  <label className="label">Role</label>
                  <input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                </div>
                <div>
                  <label className="label">Urutan</label>
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
                  <input className="input" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Deskripsi</label>
                  <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktif</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? 'Simpan Perubahan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

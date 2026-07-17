import { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, X, Loader2, Users, Mail, Phone, AlertCircle, ArrowUp, ArrowDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { showToast } from '../../components/Toast';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface FormData {
  name: string;
  position: string;
  email: string;
  phone: string;
  photo_url: string;
  description: string;
  display_order: string;
  is_active: boolean;
}

const emptyForm: FormData = {
  name: '', position: '', email: '', phone: '', photo_url: '',
  description: '', display_order: '0', is_active: true,
};

export default function TeamAdminPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, position, email, phone, photo_url, description, display_order, is_active')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setMembers((data as unknown as TeamMember[]) || []);
    } catch {
      showToast('Gagal memuat tim', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setForm({
      name: m.name,
      position: m.position,
      email: m.email || '',
      phone: m.phone || '',
      photo_url: m.photo_url || '',
      description: m.description || '',
      display_order: String(m.display_order),
      is_active: m.is_active,
    });
    setEditingId(m.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.position) {
      showToast('Nama dan jabatan wajib diisi', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        position: form.position,
        email: form.email || null,
        phone: form.phone || null,
        photo_url: form.photo_url || null,
        description: form.description || null,
        display_order: parseInt(form.display_order) || 0,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('team_members').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Anggota tim diperbarui', 'success');
      } else {
        const { error } = await supabase.from('team_members').insert(payload);
        if (error) throw error;
        showToast('Anggota tim ditambahkan', 'success');
      }
      setModalOpen(false);
      fetchMembers();
    } catch {
      showToast('Gagal menyimpan anggota tim', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: TeamMember) => {
    if (!confirm(`Hapus "${m.name}"?`)) return;
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', m.id);
      if (error) throw error;
      showToast('Anggota tim dihapus', 'success');
      fetchMembers();
    } catch {
      showToast('Gagal menghapus anggota', 'error');
    }
  };

  const toggleActive = async (m: TeamMember) => {
    try {
      const { error } = await supabase.from('team_members').update({ is_active: !m.is_active }).eq('id', m.id);
      if (error) throw error;
      showToast(m.is_active ? 'Anggota dinonaktifkan' : 'Anggota diaktifkan', 'success');
      fetchMembers();
    } catch {
      showToast('Gagal mengubah status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tim</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola anggota tim</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Anggota
        </button>
      </div>

      {members.length === 0 ? (
        <div className="card p-10 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada anggota tim</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className="card p-5 group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 overflow-hidden">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    m.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{m.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{m.position}</p>
                  <span className={cn(
                    'inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium',
                    m.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}>
                    {m.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              {m.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{m.description}</p>
              )}

              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                {m.email && (
                  <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {m.email}</p>
                )}
                {m.phone && (
                  <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {m.phone}</p>
                )}
                <p className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Urutan: {m.display_order}</p>
              </div>

              <div className="flex items-center gap-1 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openEdit(m)}
                  className="p-2 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleActive(m)}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  className="ml-auto p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Anggota' : 'Tambah Anggota'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nama *</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Jabatan *</label>
                  <input className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Telepon</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">URL Foto</label>
                <input className="input" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Urutan Tampil</label>
                  <input type="number" className="input" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    className="input"
                    value={form.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

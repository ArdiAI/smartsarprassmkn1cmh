import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import {
  Calendar, Plus, Pencil, Trash2, X, Loader2, MapPin, User, Clock, Search,
} from 'lucide-react';

interface Agenda {
  id: string;
  title: string;
  category: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  organizer: string | null;
  penyelenggara: string | null;
  organisasi_jurusan: string | null;
  penanggung_jawab: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
}

const emptyForm = {
  title: '',
  category: 'sekolah',
  event_date: new Date().toISOString().slice(0, 10),
  start_time: '08:00',
  end_time: '16:00',
  location: '',
  penyelenggara: '',
  organisasi_jurusan: '',
  penanggung_jawab: '',
  description: '',
  status: 'terjadwal',
};

const statusOptions = ['draft', 'terjadwal', 'berlangsung', 'selesai', 'dibatalkan'];
const categoryOptions = ['rapat', 'kunjungan', 'lomba', 'ekstrakurikuler', 'sekolah', 'lainnya'];

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300',
  terjadwal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  berlangsung: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  selesai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  dibatalkan: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function AgendaAdminPage() {
  const { hasPermission } = useAuth();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canCreate = hasPermission('agendas', 'create');
  const canUpdate = hasPermission('agendas', 'update');
  const canDelete = hasPermission('agendas', 'delete');

  const fetchAgendas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agendas')
      .select('*')
      .order('event_date', { ascending: false });
    if (error) {
      showToast('Gagal memuat agenda', 'error');
    } else {
      setAgendas((data as unknown as Agenda[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgendas();
  }, [fetchAgendas]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (a: Agenda) => {
    setForm({
      title: a.title || '',
      category: a.category || 'sekolah',
      event_date: a.event_date || new Date().toISOString().slice(0, 10),
      start_time: a.start_time?.slice(0, 5) || '08:00',
      end_time: a.end_time?.slice(0, 5) || '16:00',
      location: a.location || '',
      penyelenggara: a.penyelenggara || a.organizer || '',
      organisasi_jurusan: a.organisasi_jurusan || '',
      penanggung_jawab: a.penanggung_jawab || '',
      description: a.description || '',
      status: a.status || 'terjadwal',
    });
    setEditingId(a.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.event_date) {
      showToast('Nama kegiatan dan tanggal wajib diisi', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      category: form.category,
      event_date: form.event_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      penyelenggara: form.penyelenggara || null,
      organizer: form.penyelenggara || null,
      organisasi_jurusan: form.organisasi_jurusan || null,
      penanggung_jawab: form.penanggung_jawab || null,
      description: form.description || null,
      status: form.status,
    };

    if (editingId) {
      const { error } = await supabase.from('agendas').update(payload).eq('id', editingId);
      if (error) {
        showToast('Gagal memperbarui agenda', 'error');
      } else {
        showToast('Agenda diperbarui', 'success');
        setModalOpen(false);
        await fetchAgendas();
      }
    } else {
      const { error } = await supabase.from('agendas').insert(payload);
      if (error) {
        showToast('Gagal menambah agenda', 'error');
      } else {
        showToast('Agenda ditambahkan', 'success');
        setModalOpen(false);
        await fetchAgendas();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('agendas').delete().eq('id', deleteId);
    if (error) {
      showToast('Gagal menghapus agenda', 'error');
    } else {
      showToast('Agenda dihapus', 'success');
      setDeleteId(null);
      await fetchAgendas();
    }
  };

  const filtered = agendas.filter(a => {
    if (statusFilter !== 'all' && (a.status || 'draft') !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.penyelenggara?.toLowerCase().includes(q) ||
        a.penanggung_jawab?.toLowerCase().includes(q) ||
        a.organisasi_jurusan?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agenda</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kegiatan yang tidak melibatkan peminjaman barang/fasilitas
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Agenda
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari agenda..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Status</option>
          {statusOptions.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada agenda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status || 'draft'] || statusColors.draft}`}>
                      {a.status || 'draft'}
                    </span>
                    {a.category && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {a.category}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(a.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {(a.start_time || a.end_time) && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {a.start_time?.slice(0, 5)} - {a.end_time?.slice(0, 5)}
                      </div>
                    )}
                    {a.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {a.location}
                      </div>
                    )}
                    {a.organisasi_jurusan && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {a.organisasi_jurusan}
                      </div>
                    )}
                    {a.penanggung_jawab && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        PJ: {a.penanggung_jawab}
                      </div>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{a.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {canUpdate && (
                    <button
                      onClick={() => openEdit(a)}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(a.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Agenda' : 'Tambah Agenda'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nama Kegiatan</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="Contoh: Rapat Koordinasi" />
              </div>
              <div>
                <label className="label">Organisasi/Jurusan</label>
                <input type="text" value={form.organisasi_jurusan} onChange={e => setForm({ ...form, organisasi_jurusan: e.target.value })} className="input" placeholder="Contoh: Jurusan RPL" />
              </div>
              <div>
                <label className="label">Penanggung Jawab</label>
                <input type="text" value={form.penanggung_jawab} onChange={e => setForm({ ...form, penanggung_jawab: e.target.value })} className="input" placeholder="Contoh: Budi Santoso" />
              </div>
              <div>
                <label className="label">Lokasi</label>
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input" placeholder="Contoh: Aula Sekolah" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Tanggal</label>
                  <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Waktu Mulai</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Waktu Selesai</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Kategori</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input">
                    {categoryOptions.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input">
                    {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input" placeholder="Deskripsi kegiatan..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Hapus Agenda?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Agenda yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

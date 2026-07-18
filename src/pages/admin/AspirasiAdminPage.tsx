import { useEffect, useState, useMemo } from 'react';
import {
  Loader2,
  Search,
  X,
  MessageSquare,
  Send,
  Mail,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

interface Aspirasi {
  id: string;
  nama: string | null;
  kelas_unit: string | null;
  email: string | null;
  kategori: string | null;
  judul: string | null;
  isi: string | null;
  status: string | null;
  tanggapan: string | null;
  created_at: string;
  updated_at: string | null;
}

const statusStyles: Record<string, string> = {
  baru: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  diproses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  selesai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const statusOptions = [
  { value: 'baru', label: 'Baru' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'selesai', label: 'Selesai' },
];

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyModal, setReplyModal] = useState<Aspirasi | null>(null);
  const [tanggapan, setTanggapan] = useState('');
  const [statusSelect, setStatusSelect] = useState('baru');
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const canUpdate = hasPermission('aspirasi', 'update');

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
      if (error) {
        showToast('Gagal memuat aspirasi', 'error');
        return;
      }
      setItems((data as unknown as Aspirasi[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (statusFilter !== 'all' && (a.status ?? 'baru') !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(a.nama ?? '').toLowerCase().includes(q) &&
          !(a.judul ?? '').toLowerCase().includes(q) &&
          !(a.isi ?? '').toLowerCase().includes(q) &&
          !(a.kategori ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  function openReply(a: Aspirasi) {
    setReplyModal(a);
    setTanggapan(a.tanggapan ?? '');
    setStatusSelect(a.status ?? 'baru');
  }

  function closeReply() {
    setReplyModal(null);
    setTanggapan('');
    setStatusSelect('baru');
  }

  async function handleStatusChange(a: Aspirasi, newStatus: string) {
    setStatusUpdating(a.id);
    try {
      const { error } = await supabase.from('aspirasi').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', a.id);
      if (error) {
        showToast('Gagal mengubah status', 'error');
        return;
      }
      showToast('Status diperbarui', 'success');
      fetchData();
    } finally {
      setStatusUpdating(null);
    }
  }

  async function handleSaveReply() {
    if (!replyModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({
          tanggapan: tanggapan.trim() || null,
          status: statusSelect,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyModal.id);
      if (error) {
        showToast('Gagal menyimpan tanggapan', 'error');
        return;
      }
      showToast('Tanggapan disimpan', 'success');
      closeReply();
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Aspirasi</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola dan tanggapi aspirasi dari warga sekolah.
        </p>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Cari nama, judul, kategori..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input lg:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada aspirasi" description="Belum ada aspirasi yang masuk." icon={<MessageSquare className="h-8 w-8 text-slate-400" />} />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{a.judul ?? 'Tanpa Judul'}</h3>
                    {a.kategori && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {a.kategori}
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[a.status ?? 'baru'] ?? statusStyles.baru}`}>
                      {statusOptions.find((s) => s.value === (a.status ?? 'baru'))?.label ?? a.status ?? 'Baru'}
                    </span>
                  </div>
                  {a.isi && <p className="text-sm text-slate-600 dark:text-slate-400">{a.isi}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {a.nama && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {a.nama}</span>}
                    {a.kelas_unit && <span>{a.kelas_unit}</span>}
                    {a.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {a.email}</span>}
                    <span>{new Date(a.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                  {a.tanggapan && (
                    <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
                      <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">Tanggapan:</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{a.tanggapan}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  {canUpdate && (
                    <select
                      value={a.status ?? 'baru'}
                      onChange={(e) => handleStatusChange(a, e.target.value)}
                      disabled={statusUpdating === a.id}
                      className="input px-2 py-1.5 text-xs sm:w-32"
                    >
                      {statusOptions.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  )}
                  {canUpdate && (
                    <button onClick={() => openReply(a)} className="btn-primary px-3 py-2 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Tanggapi
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeReply}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tanggapi Aspirasi</h2>
              <button onClick={closeReply} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{replyModal.judul ?? 'Tanpa Judul'}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{replyModal.isi ?? '-'}</p>
              <p className="mt-2 text-xs text-slate-400">Dari: {replyModal.nama ?? '-'} • {replyModal.kelas_unit ?? '-'}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <select className="input" value={statusSelect} onChange={(e) => setStatusSelect(e.target.value)}>
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tanggapan</label>
                <textarea rows={4} className="input" value={tanggapan} onChange={(e) => setTanggapan(e.target.value)} placeholder="Tulis tanggapan..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={closeReply} className="btn-secondary">Batal</button>
                <button onClick={handleSaveReply} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

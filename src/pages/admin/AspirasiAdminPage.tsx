import { useEffect, useState, useCallback } from 'react';
import {
  Search, Loader2, Mail, User, MessageSquare, Send, X, Clock,
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

const STATUS_OPTIONS = ['new', 'in_review', 'responded', 'closed'];

const statusBadge = (s: string | null) => {
  switch (s) {
    case 'new': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'in_review': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'responded': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'closed': return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
  }
};

const statusLabel = (s: string | null) => {
  switch (s) {
    case 'new': return 'Baru';
    case 'in_review': return 'Ditinjau';
    case 'responded': return 'Ditanggapi';
    case 'closed': return 'Ditutup';
    default: return s ?? '-';
  }
};

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('aspirasi', 'update');
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
      setItems([]);
    } else {
      setItems((data ?? []) as unknown as Aspirasi[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateStatus = async (a: Aspirasi, newStatus: string) => {
    const { error } = await supabase.from('aspirasi').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', a.id);
    if (error) { showToast('Gagal mengubah status: ' + error.message, 'error'); return; }
    showToast('Status diperbarui', 'success');
    fetchItems();
  };

  const openReply = (a: Aspirasi) => {
    setReplyingId(a.id);
    setReplyText(a.tanggapan ?? '');
  };

  const handleReply = async (a: Aspirasi) => {
    if (!replyText.trim()) return showToast('Tanggapan tidak boleh kosong', 'error');
    setSaving(true);
    const { error } = await supabase.from('aspirasi').update({
      tanggapan: replyText.trim(),
      status: 'responded',
      updated_at: new Date().toISOString(),
    }).eq('id', a.id);
    setSaving(false);
    if (error) { showToast('Gagal mengirim tanggapan: ' + error.message, 'error'); return; }
    showToast('Tanggapan dikirim', 'success');
    setReplyingId(null);
    setReplyText('');
    fetchItems();
  };

  const filtered = items.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(a.nama?.toLowerCase().includes(q) ?? false) && !(a.judul?.toLowerCase().includes(q) ?? false) && !(a.isi?.toLowerCase().includes(q) ?? false) && !(a.kategori?.toLowerCase().includes(q) ?? false)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kelola Aspirasi</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tanggapi dan kelola aspirasi dari warga sekolah.</p>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Cari nama, judul, kategori, atau isi..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState title="Tidak ada aspirasi" description="Belum ada aspirasi yang masuk." icon={<MessageSquare className="h-8 w-8 text-slate-400" />} /></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{a.judul ?? 'Aspirasi'}</h3>
                    {a.kategori && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{a.kategori}</span>}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(a.status)}`}>{statusLabel(a.status)}</span>
                  </div>

                  {a.isi && <p className="text-sm text-slate-600 dark:text-slate-400">{a.isi}</p>}

                  <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
                    {a.nama && <div className="flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" /> {a.nama}</div>}
                    {a.kelas_unit && <span className="text-slate-500">Unit: {a.kelas_unit}</span>}
                    {a.email && <div className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" /> {a.email}</div>}
                    <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" /> {new Date(a.created_at).toLocaleString('id-ID')}</div>
                  </div>

                  {a.tanggapan && (
                    <div className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-900/20">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">Tanggapan: </span>
                      <span className="text-slate-700 dark:text-slate-300">{a.tanggapan}</span>
                    </div>
                  )}

                  {replyingId === a.id && (
                    <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                      <label className="label">Tulis Tanggapan</label>
                      <textarea className="input min-h-[80px]" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Masukkan tanggapan..." />
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => handleReply(a)} disabled={saving} className="btn-primary">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {saving ? 'Mengirim...' : 'Kirim Tanggapan'}
                        </button>
                        <button onClick={() => { setReplyingId(null); setReplyText(''); }} className="btn-secondary">
                          <X className="h-4 w-4" /> Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {canUpdate && replyingId !== a.id && (
                  <div className="flex flex-col gap-2 lg:w-48">
                    <select
                      className="input"
                      value={a.status ?? 'new'}
                      onChange={(e) => updateStatus(a, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                    <button onClick={() => openReply(a)} className="btn-secondary">
                      <MessageSquare className="h-4 w-4" /> {a.tanggapan ? 'Edit Tanggapan' : 'Tanggapi'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

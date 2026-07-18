import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  MessageSquare, Loader2, Search, X, Send, Mail, Building2,
} from 'lucide-react';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string | null;
  email: string | null;
  kategori: string | null;
  judul: string;
  isi: string;
  status: string;
  tanggapan: string | null;
  created_at: string;
  updated_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  baru: { label: 'Baru', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  diproses: { label: 'Diproses', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  selesai: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('aspirasi', 'update');

  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aspirasi | null>(null);
  const [tanggapan, setTanggapan] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAspirasi = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Gagal memuat aspirasi', 'error');
      setLoading(false);
      return;
    }
    setAspirasi((data as unknown as Aspirasi[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAspirasi();
  }, [fetchAspirasi]);

  const filtered = aspirasi.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.nama?.toLowerCase().includes(q) ||
        a.judul?.toLowerCase().includes(q) ||
        a.isi?.toLowerCase().includes(q) ||
        a.kategori?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openReply = (a: Aspirasi) => {
    setEditing(a);
    setTanggapan(a.tanggapan ?? '');
    setModalOpen(true);
  };

  const handleStatusChange = async (a: Aspirasi, status: string) => {
    const { error } = await supabase.from('aspirasi').update({ status, updated_at: new Date().toISOString() }).eq('id', a.id);
    if (error) {
      showToast('Gagal memperbarui status', 'error');
      return;
    }
    showToast('Status diperbarui', 'success');
    await fetchAspirasi();
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('aspirasi')
      .update({ tanggapan, status: 'selesai', updated_at: new Date().toISOString() })
      .eq('id', editing.id);
    if (error) {
      showToast('Gagal mengirim tanggapan', 'error');
      setSaving(false);
      return;
    }
    showToast('Tanggapan terkirim', 'success');
    setModalOpen(false);
    setEditing(null);
    setSaving(false);
    await fetchAspirasi();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aspirasi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan saran dari pengguna</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, judul, isi, atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="baru">Baru</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const sc = statusConfig[a.status] || statusConfig.baru;
            return (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{a.judul}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                      {a.kategori && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {a.kategori}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {a.nama} · {a.kelas_unit ?? '-'} · {new Date(a.created_at).toLocaleDateString('id-ID')}
                    </p>
                    {a.email && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {a.email}
                      </p>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-3">{a.isi}</p>
                    {a.tanggapan && (
                      <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border-l-2 border-blue-400">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Tanggapan:</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{a.tanggapan}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canUpdate && (
                      <>
                        <select
                          value={a.status}
                          onChange={(e) => handleStatusChange(a, e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="baru">Baru</option>
                          <option value="diproses">Diproses</option>
                          <option value="selesai">Selesai</option>
                        </select>
                        <button
                          onClick={() => openReply(a)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" /> Tanggapi
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReply} className="p-5 space-y-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700/30 p-4">
                <p className="font-medium text-slate-900 dark:text-white">{editing.judul}</p>
                <p className="text-sm text-slate-500 mt-1">{editing.nama} · {editing.kelas_unit ?? '-'}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{editing.isi}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Tanggapan</label>
                <textarea
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                  rows={4}
                  placeholder="Tulis tanggapan..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

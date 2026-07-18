import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';
import {
  MessageSquare, Loader2, Search, X, Mail, User, Tag,
} from 'lucide-react';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string;
  email: string;
  kategori: string;
  judul: string;
  isi: string;
  status: string;
  tanggapan: string | null;
  created_at: string;
  updated_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusOptions = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'in_progress', label: 'Diproses' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
];

export default function AspirasiAdminPage() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('aspirasi', 'update');

  const [aspirasi, setAspirasi] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyOpen, setReplyOpen] = useState(false);
  const [active, setActive] = useState<Aspirasi | null>(null);
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
    setAspirasi((data as unknown as Aspirasi[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAspirasi();
  }, [fetchAspirasi]);

  const filtered = aspirasi.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.nama?.toLowerCase().includes(q) ||
        a.judul?.toLowerCase().includes(q) ||
        a.kategori?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStatusChange = async (a: Aspirasi, newStatus: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', a.id);
      if (error) throw error;
      showToast('Status aspirasi diperbarui', 'success');
      await fetchAspirasi();
    } catch (e: any) {
      showToast(e.message || 'Gagal memperbarui status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openReply = (a: Aspirasi) => {
    setActive(a);
    setTanggapan(a.tanggapan ?? '');
    setReplyOpen(true);
  };

  const handleSaveReply = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('aspirasi')
        .update({ tanggapan, updated_at: new Date().toISOString() })
        .eq('id', active.id);
      if (error) throw error;
      showToast('Tanggapan disimpan', 'success');
      setReplyOpen(false);
      await fetchAspirasi();
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan tanggapan', 'error');
    } finally {
      setSaving(false);
    }
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
        <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola aspirasi dan masukan dari warga sekolah</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, judul, atau kategori..."
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
          <option value="pending">Menunggu</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
          <option value="rejected">Ditolak</option>
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
        <div className="space-y-4">
          {filtered.map(a => {
            const sc = statusConfig[a.status] || statusConfig.pending;
            return (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{a.judul}</h3>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>{sc.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {a.nama}</span>
                      <span>{a.kelas_unit}</span>
                      {a.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {a.email}</span>}
                      <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {a.kategori}</span>
                      <span>{new Date(a.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{a.isi}</p>
                    {a.tanggapan && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-0.5">Tanggapan</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{a.tanggapan}</p>
                      </div>
                    )}
                  </div>
                </div>

                {canUpdate && (
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <select
                      value={a.status}
                      onChange={e => handleStatusChange(a, e.target.value)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                    >
                      {statusOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => openReply(a)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <MessageSquare className="w-4 h-4" /> Tanggapi
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {replyOpen && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setReplyOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-white">Tanggapi Aspirasi</h2>
              <button onClick={() => setReplyOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Dari:</p>
                <p className="font-medium text-slate-900 dark:text-white">{active.nama} ({active.kelas_unit})</p>
                <p className="text-sm text-blue-500 mt-0.5">{active.judul}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{active.isi}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Tanggapan</label>
                <textarea
                  value={tanggapan}
                  onChange={e => setTanggapan(e.target.value)}
                  rows={4}
                  placeholder="Tulis tanggapan..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setReplyOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveReply}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan Tanggapan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

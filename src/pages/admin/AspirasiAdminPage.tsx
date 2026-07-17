import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Aspirasi {
  id: string;
  nama: string;
  kelas_unit: string;
  email: string;
  kategori: string;
  judul: string;
  isi: string;
  status: string;
  tanggapan: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  Menunggu: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Diproses: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Selesai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};
const STATUS_ICONS: Record<string, typeof Clock> = { Menunggu: Clock, Diproses: AlertCircle, Selesai: CheckCircle };

export default function AspirasiAdminPage() {
  const [items, setItems] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [responseMap, setResponseMap] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase.from('aspirasi').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    if (data) {
      setItems(data as Aspirasi[]);
      const responses: Record<string, string> = {};
      (data as Aspirasi[]).forEach(a => { responses[a.id] = a.tanggapan || ''; });
      setResponseMap(responses);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setSavingId(id);
    const { error } = await supabase.from('aspirasi').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) alert(error.message); else fetchData();
    setSavingId(null);
  }

  async function saveResponse(id: string) {
    setSavingId(id);
    const tanggapan = responseMap[id] || '';
    const status = items.find(a => a.id === id)?.status === 'Menunggu' ? 'Diproses' : undefined;
    const payload: any = { tanggapan, updated_at: new Date().toISOString() };
    if (status) payload.status = status;
    const { error } = await supabase.from('aspirasi').update(payload).eq('id', id);
    if (error) alert(error.message); else fetchData();
    setSavingId(null);
  }

  const filtered = items.filter(a => !filter || a.status === filter);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><MessageSquare className="w-6 h-6 text-indigo-500" /> Kelola Aspirasi</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Tanggapi dan update status aspirasi warga sekolah</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'Menunggu', 'Diproses', 'Selesai'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={cn('px-4 py-2 rounded-xl text-sm font-medium', filter === s ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700')}>
            {s || 'Semua'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada aspirasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const StatusIcon = STATUS_ICONS[a.status] || Clock;
            return (
              <div key={a.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{a.nama}</p>
                      <span className="text-xs text-slate-400">{a.kelas_unit}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">{a.kategori}</span>
                    </div>
                    <p className="text-xs text-slate-400">{fmtDate(a.created_at)}{a.email && ` · ${a.email}`}</p>
                  </div>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0', STATUS_COLORS[a.status] || 'bg-slate-100')}>
                    <StatusIcon className="w-3 h-3" /> {a.status}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mt-2">{a.judul}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{a.isi}</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input type="text" placeholder="Tulis tanggapan..." value={responseMap[a.id] || ''} onChange={e => setResponseMap({ ...responseMap, [a.id]: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 text-sm text-slate-900 dark:text-white" />
                  <button onClick={() => saveResponse(a.id)} disabled={savingId === a.id} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> Tanggapi
                  </button>
                </div>
                <div className="flex gap-1 mt-2">
                  {a.status !== 'Menunggu' && <button onClick={() => updateStatus(a.id, 'Menunggu')} disabled={savingId === a.id} className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-600 text-xs font-medium hover:bg-amber-200">Menunggu</button>}
                  {a.status !== 'Diproses' && <button onClick={() => updateStatus(a.id, 'Diproses')} disabled={savingId === a.id} className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 text-xs font-medium hover:bg-blue-200">Diproses</button>}
                  {a.status !== 'Selesai' && <button onClick={() => updateStatus(a.id, 'Selesai')} disabled={savingId === a.id} className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 text-xs font-medium hover:bg-emerald-200">Selesai</button>}
                </div>
                {a.tanggapan && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/40 p-2 rounded-lg">Tanggapan: {a.tanggapan}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

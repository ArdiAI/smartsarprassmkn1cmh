import { useState, useEffect } from 'react';
import { Search, AlertTriangle, Send, CheckCircle, Clock } from 'lucide-react';
import { Inventory, DamageReport } from '../types';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';

const severityColors: Record<string, string> = {
  minor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function ReportPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ inventory_id: '', reporter_name: '', description: '', severity: 'minor' as 'minor' | 'moderate' | 'severe' });

  useEffect(() => {
    Promise.all([
      supabase.from('inventory').select('*, categories(*)').order('name'),
      supabase.from('damage_reports').select('*, inventory(name)').order('created_at', { ascending: false }).limit(20),
    ]).then(([invRes, repRes]) => {
      if (invRes.data) setInventory(invRes.data);
      if (repRes.data) setReports(repRes.data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await supabase.from('damage_reports').insert([formData]);
    setFormData({ inventory_id: '', reporter_name: '', description: '', severity: 'minor' });
    setSelectedItem('');
    setSubmitting(false);
    fetchData();
  };

  const fetchData = async () => {
    const { data } = await supabase.from('damage_reports').select('*, inventory(name)').order('created_at', { ascending: false }).limit(20);
    if (data) setReports(data);
  };

  const filteredItems = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <section className="pt-24 pb-8 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Laporan Kerusakan</h1>
          <p className="text-slate-600 dark:text-slate-400">Laporkan kerusakan barang inventaris</p>
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Form Laporan</h2>
              </div>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Cari barang..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" />
              </div>
              {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-40 overflow-y-auto mb-6">
                  {filteredItems.map(item => (
                    <button key={item.id} onClick={() => { setSelectedItem(item.id); setFormData({ ...formData, inventory_id: item.id }); }}
                      className={cn('p-3 rounded-xl border-2 text-left transition-all',
                        selectedItem === item.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700')}>
                      <div className="text-xs text-slate-400">{item.code}</div>
                      <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{item.name}</div>
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" required placeholder="Nama Pelapor" value={formData.reporter_name} onChange={e => setFormData({ ...formData, reporter_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" />
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">Tingkat Kerusakan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['minor', 'moderate', 'severe'] as const).map(sev => (
                      <button key={sev} type="button" onClick={() => setFormData({ ...formData, severity: sev })}
                        className={cn('py-3 rounded-xl border-2 font-medium transition-all',
                          formData.severity === sev ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'border-slate-200 dark:border-slate-700 text-slate-600')}>
                        {sev === 'minor' ? 'Ringan' : sev === 'moderate' ? 'Sedang' : 'Berat'}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea rows={4} required placeholder="Deskripsi kerusakan..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" />
                <button type="submit" disabled={submitting || !selectedItem}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-400 text-white font-medium">
                  <Send className="w-5 h-5" />{submitting ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              </form>
            </div>
          </div>
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Laporan Terbaru</h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {reports.length === 0 ? <p className="text-slate-500 text-center py-4">Belum ada laporan</p> : (
                  reports.map(r => (
                    <div key={r.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white text-sm">{r.inventory?.name}</div>
                          <div className="text-xs text-slate-500">{r.reporter_name}</div>
                        </div>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityColors[r.severity])}>
                          {r.severity === 'minor' ? 'Ringan' : r.severity === 'moderate' ? 'Sedang' : 'Berat'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{r.description}</p>
                      <div className="flex items-center gap-1.5">
                        {r.status === 'pending' ? <Clock className="w-3.5 h-3.5" /> : r.status === 'in_progress' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        <span className={cn('text-xs font-medium', statusColors[r.status])}>
                          {r.status === 'pending' ? 'Menunggu' : r.status === 'in_progress' ? 'Diproses' : 'Selesai'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

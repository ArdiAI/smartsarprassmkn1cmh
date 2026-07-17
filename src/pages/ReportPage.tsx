import { useEffect, useState } from 'react';
import { Send, AlertTriangle, User, Mail, FileText, Package, Image } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

export default function ReportPage() {
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    reporter_name: '',
    reporter_email: '',
    description: '',
    severity: 'minor' as 'minor' | 'moderate' | 'severe',
    image_url: '',
    inventory_id: '',
  });

  useEffect(() => {
    supabase.from('inventory').select('id, name').order('name').then(({ data }) => setInventory((data as { id: string; name: string }[]) || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('damage_reports').insert({
      reporter_name: form.reporter_name,
      reporter_email: form.reporter_email,
      description: form.description,
      severity: form.severity,
      image_url: form.image_url || null,
      inventory_id: form.inventory_id || null,
      status: 'pending',
    });
    setLoading(false);
    if (error) {
      show('Gagal mengirim laporan: ' + error.message, 'error');
    } else {
      show('Laporan kerusakan berhasil dikirim!', 'success');
      setForm({ reporter_name: '', reporter_email: '', description: '', severity: 'minor', image_url: '', inventory_id: '' });
    }
  }

  const severityOptions = [
    { value: 'minor', label: 'Minor', desc: 'Kerusakan ringan', color: 'text-yellow-600 dark:text-yellow-400' },
    { value: 'moderate', label: 'Moderate', desc: 'Kerusakan sedang', color: 'text-orange-600 dark:text-orange-400' },
    { value: 'severe', label: 'Severe', desc: 'Kerusakan berat', color: 'text-red-600 dark:text-red-400' },
  ];

  const inputClass = 'w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="relative z-10 pt-20 pb-12 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Laporkan kerusakan fasilitas atau inventaris</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-6 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400">Pastikan data yang Anda masukkan benar. Laporan akan ditinjau oleh admin.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Pelapor *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" required value={form.reporter_name} onChange={e => setForm({ ...form, reporter_name: e.target.value })} placeholder="Nama lengkap" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" required value={form.reporter_email} onChange={e => setForm({ ...form, reporter_email: e.target.value })} placeholder="email@example.com" className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Barang / Inventaris (opsional)</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select value={form.inventory_id} onChange={e => setForm({ ...form, inventory_id: e.target.value })} className={inputClass}>
                  <option value="">Pilih barang (opsional)</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tingkat Kerusakan *</label>
              <div className="grid grid-cols-3 gap-2">
                {severityOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, severity: opt.value as 'minor' | 'moderate' | 'severe' })}
                    className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors',
                      form.severity === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600')}
                  >
                    <AlertTriangle className={cn('w-5 h-5', opt.color)} />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{opt.label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi Kerusakan *</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan kerusakan secara detail..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL Gambar (opsional)</label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="url" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className={inputClass} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-lg disabled:opacity-60">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Kirim Laporan</>}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

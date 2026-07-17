import { useEffect, useState } from 'react';
import { FileText, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';

interface InventoryItem {
  id: string;
  name: string;
}

export default function ReportPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    reporter_name: '',
    reporter_email: '',
    description: '',
    severity: 'low',
    image_url: '',
    inventory_id: '',
  });
  const { show } = useToast();

  useEffect(() => {
    supabase.from('inventory').select('id, name').order('name').then(({ data }) => setInventory(data || []));
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
    });
    setLoading(false);
    if (error) { show('Gagal mengirim laporan: ' + error.message, 'error'); return; }
    show('Laporan berhasil dikirim!', 'success');
    setSubmitted(true);
    setForm({ reporter_name: '', reporter_email: '', description: '', severity: 'low', image_url: '', inventory_id: '' });
  }

  const severityOptions = [
    { value: 'low', label: 'Rendah', color: 'text-green-600' },
    { value: 'medium', label: 'Sedang', color: 'text-yellow-600' },
    { value: 'high', label: 'Tinggi', color: 'text-red-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Laporkan Kerusakan</h1>
          <p className="text-sm text-slate-500">Laporkan kerusakan sarana atau prasarana sekolah.</p>
        </div>

        {submitted ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h2>
            <p className="text-sm text-slate-500 mb-6">Terima kasih. Tim sarpras akan menindakuti laporan Anda.</p>
            <button onClick={() => setSubmitted(false)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              Buat Laporan Lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Pelapor</label>
              <input type="text" value={form.reporter_name} onChange={e => setForm({ ...form, reporter_name: e.target.value })} required
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <input type="email" value={form.reporter_email} onChange={e => setForm({ ...form, reporter_email: e.target.value })} required
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Item Inventaris (opsional)</label>
              <select value={form.inventory_id} onChange={e => setForm({ ...form, inventory_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Pilih item...</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tingkat Keparahan</label>
              <div className="grid grid-cols-3 gap-2">
                {severityOptions.map(o => (
                  <button key={o.value} type="button" onClick={() => setForm({ ...form, severity: o.value })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.severity === o.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}>
                    <AlertTriangle className={`w-4 h-4 ${o.color}`} /> {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi Kerusakan</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={4}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL Gambar (opsional)</label>
              <input type="url" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..."
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-lg disabled:opacity-60">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Kirim Laporan</>}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  FileText, Send, User, Mail, AlertTriangle, Package, Building2,
  CheckCircle2, Loader2, Link2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface Facility { id: string; name: string; }
interface InventoryItem { id: string; name: string; }

const severityOptions = [
  { value: 'minor', label: 'Minor - Kerusakan ringan', color: 'text-green-600' },
  { value: 'moderate', label: 'Moderate - Kerusakan sedang', color: 'text-orange-600' },
  { value: 'severe', label: 'Severe - Kerusakan berat', color: 'text-red-600' },
];

export default function ReportPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    reporter_name: '',
    reporter_email: '',
    item_type: 'facility' as 'facility' | 'inventory',
    item_id: '',
    description: '',
    severity: 'minor',
    photo_url: '',
  });

  useEffect(() => {
    (async () => {
      const [facRes, invRes] = await Promise.all([
        supabase.from('facilities').select('id, name').order('name'),
        supabase.from('inventory').select('id, name').order('name'),
      ]);
      setFacilities(facRes.data || []);
      setInventory(invRes.data || []);
      setLoading(false);
    })();
  }, []);

  const items = form.item_type === 'facility' ? facilities : inventory;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reporter_name || !form.description || !form.item_id) {
      setError('Mohon lengkapi semua field wajib');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        reporter_name: form.reporter_name,
        reporter_email: form.reporter_email,
        description: form.description,
        severity: form.severity,
        image_url: form.photo_url || '',
      };
      if (form.item_type === 'inventory') {
        payload.inventory_id = form.item_id;
      }

      const { error: insertErr } = await supabase.from('damage_reports').insert(payload);
      if (insertErr) throw new Error(insertErr.message);

      setSuccess(true);
      setForm({ reporter_name: '', reporter_email: '', item_type: 'facility', item_id: '', description: '', severity: 'minor', photo_url: '' });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mengirim laporan');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Laporkan Kerusakan</h1>
          <p className="text-slate-500 dark:text-slate-400">Laporkan kerusakan fasilitas atau inventaris sekolah</p>
        </div>

        {success && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Laporan berhasil dikirim. Tim akan menindaklanjuti segera.</p>
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            {/* Item Type Toggle */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
              {([['facility', 'Fasilitas', Building2], ['inventory', 'Inventaris', Package]] as const).map(([key, label, Icon]) => (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, item_type: key, item_id: '' }))}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    form.item_type === key ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400')}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {/* Item Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pilih Item *</label>
              <select value={form.item_id} onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Pilih {form.item_type === 'facility' ? 'fasilitas' : 'inventaris'} --</option>
                {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>

            {/* Reporter Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Pelapor *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={form.reporter_name} onChange={e => setForm(f => ({ ...f, reporter_name: e.target.value }))} placeholder="Nama lengkap" className={inputCls} />
              </div>
            </div>

            {/* Reporter Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" value={form.reporter_email} onChange={e => setForm(f => ({ ...f, reporter_email: e.target.value }))} placeholder="email@example.com" className={inputCls} />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tingkat Keparahan</label>
              <div className="space-y-2">
                {severityOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="severity" value={opt.value} checked={form.severity === opt.value}
                      onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                    <span className={cn('text-sm', opt.color)}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi Kerusakan *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} placeholder="Jelaskan kerusakan secara detail..."
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* Photo URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL Foto (opsional)</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="url" value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." className={inputCls} />
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Kirim Laporan
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}

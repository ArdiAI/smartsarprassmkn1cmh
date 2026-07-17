import { useState } from 'react';
import { AlertTriangle, Send, CheckCircle, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface ReportForm {
  item_name: string;
  description: string;
  reporter_name: string;
  reporter_email: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
}

const SEVERITY_OPTIONS: { value: 'low' | 'medium' | 'high'; label: string; color: string }[] = [
  { value: 'low', label: 'Rendah', color: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' },
  { value: 'medium', label: 'Sedang', color: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
  { value: 'high', label: 'Tinggi', color: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
];

const inputClass =
  'w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

export default function ReportPage() {
  const [form, setForm] = useState<ReportForm>({
    item_name: '',
    description: '',
    reporter_name: '',
    reporter_email: '',
    location: '',
    severity: 'low',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('damage_reports').insert({
        item_name: form.item_name,
        description: form.description,
        reporter_name: form.reporter_name,
        reporter_email: form.reporter_email,
        location: form.location,
        severity: form.severity,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setForm({
        item_name: '',
        description: '',
        reporter_name: '',
        reporter_email: '',
        location: '',
        severity: 'low',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim laporan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 text-center max-w-md w-full animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Laporan Terkirim!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Terima kasih atas laporan Anda. Tim akan meninjau dan menindaklanjuti laporan ini secepatnya.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
            >
              Buat Laporan Lain
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h1 className="text-3xl font-bold">Laporkan Kerusakan</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Laporkan kerusakan fasilitas atau inventaris. Isi formulir di bawah dengan sejelas-jelasnya.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-5">
          {/* Item name */}
          <div>
            <label className="block text-sm font-medium mb-2">Nama Barang / Fasilitas</label>
            <input
              type="text"
              name="item_name"
              value={form.item_name}
              onChange={handleChange}
              required
              placeholder="Contoh: Proyektor Ruang Kelas 10A"
              className={inputClass}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">Lokasi</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              required
              placeholder="Contoh: Gedung A Lantai 2"
              className={inputClass}
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium mb-2">Tingkat Keparahan</label>
            <div className="grid grid-cols-3 gap-3">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, severity: opt.value }))}
                  className={cn(
                    'px-4 py-3 rounded-2xl border-2 font-medium text-sm transition-all',
                    form.severity === opt.value
                      ? opt.color
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Deskripsi Kerusakan</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Jelaskan kerusakan yang ditemukan..."
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* Reporter info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nama Pelapor</label>
              <input
                type="text"
                name="reporter_name"
                value={form.reporter_name}
                onChange={handleChange}
                required
                placeholder="Nama lengkap"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email Pelapor</label>
              <input
                type="email"
                name="reporter_email"
                value={form.reporter_email}
                onChange={handleChange}
                required
                placeholder="email@sekolah.sch.id"
                className={inputClass}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Kirim Laporan
              </>
            )}
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
}

import { useEffect, useState, FormEvent } from 'react';
import {
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  Image as ImageIcon,
  Send,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

type Severity = 'minor' | 'moderate' | 'severe';
type ReportStatus = 'pending' | 'in_progress' | 'resolved';

interface DamageReport {
  id: string;
  reporter_name: string;
  reporter_email: string;
  reporter_unit: string;
  reporter_phone: string | null;
  description: string;
  location: string;
  severity: Severity;
  image_url: string | null;
  status: ReportStatus;
  created_at: string;
}

interface FormState {
  reporter_name: string;
  reporter_email: string;
  reporter_unit: string;
  reporter_phone: string;
  description: string;
  location: string;
  severity: Severity;
  image_url: string;
}

const initialForm: FormState = {
  reporter_name: '',
  reporter_email: '',
  reporter_unit: '',
  reporter_phone: '',
  description: '',
  location: '',
  severity: 'minor',
  image_url: '',
};

const severityOptions: { value: Severity; label: string; color: string; ring: string }[] = [
  { value: 'minor', label: 'Ringan', color: 'text-emerald-600 dark:text-emerald-300', ring: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
  { value: 'moderate', label: 'Sedang', color: 'text-amber-600 dark:text-amber-300', ring: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' },
  { value: 'severe', label: 'Berat', color: 'text-red-600 dark:text-red-300', ring: 'border-red-400 bg-red-50 dark:bg-red-900/20' },
];

const severityBadge: Record<Severity, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const severityLabel: Record<Severity, string> = { minor: 'Ringan', moderate: 'Sedang', severe: 'Berat' };

const statusBadge: Record<ReportStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const statusLabel: Record<ReportStatus, string> = {
  pending: 'Menunggu',
  in_progress: 'Dalam Proses',
  resolved: 'Selesai',
};

const inputClass =
  'w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';

export default function ReportPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const loadReports = async (email: string) => {
    if (!email) {
      setReports([]);
      setLoadingReports(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('damage_reports')
        .select('*')
        .eq('reporter_email', email)
        .order('created_at', { ascending: false })
        .limit(10);
      setReports((data as unknown as DamageReport[]) || []);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadReports(form.reporter_email || submitted?.reporter_email || '');
  }, [submitted]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        reporter_name: form.reporter_name,
        reporter_email: form.reporter_email,
        reporter_unit: form.reporter_unit,
        reporter_phone: form.reporter_phone || null,
        description: form.description,
        location: form.location,
        severity: form.severity,
        image_url: form.image_url || null,
        status: 'pending' as ReportStatus,
      };
      const { data, error } = await supabase.from('damage_reports').insert(payload).select().single();
      if (error) throw error;
      const created = data as unknown as DamageReport;
      setSubmitted(created);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      setForm(initialForm);
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null);
    setForm(initialForm);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-500" /> Laporan Kerusakan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Laporkan kerusakan sarana atau prasarana.</p>
        </div>

        {submitted ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Laporan Anda telah berhasil dikirim dan akan ditinjau oleh tim sarpras.</p>
            <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-5 text-left text-sm space-y-2 mb-6">
              <div className="flex justify-between"><span className="text-slate-500">Pelapor</span><span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Unit/Kelas</span><span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Barang/Item</span><span className="font-medium text-slate-900 dark:text-white">{submitted.description}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Lokasi</span><span className="font-medium text-slate-900 dark:text-white">{submitted.location}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">Keparahan</span><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityBadge[submitted.severity])}>{severityLabel[submitted.severity]}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">Status</span><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusBadge[submitted.status])}>{statusLabel[submitted.status]}</span></div>
            </div>
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Buat Laporan Lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" required value={form.reporter_name} onChange={(e) => setForm({ ...form, reporter_name: e.target.value })} placeholder="Nama lengkap" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="email" required value={form.reporter_email} onChange={(e) => setForm({ ...form, reporter_email: e.target.value })} placeholder="email@example.com" className={inputClass} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Unit/Kelas <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" required value={form.reporter_unit} onChange={(e) => setForm({ ...form, reporter_unit: e.target.value })} placeholder="Kelas / unit" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">No. Telepon <span className="text-slate-400 font-normal">(opsional)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" value={form.reporter_phone} onChange={(e) => setForm({ ...form, reporter_phone: e.target.value })} placeholder="08xxxxxxxxxx" className={inputClass} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Barang/Item <span className="text-red-500">*</span></label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Nama barang yang rusak" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lokasi <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lokasi barang" className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tingkat Keparahan <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {severityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, severity: opt.value })}
                    className={cn(
                      'p-4 rounded-xl border-2 text-center transition-all',
                      form.severity === opt.value
                        ? cn(opt.ring, opt.color, 'font-semibold')
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600',
                    )}
                  >
                    <span className="block text-2xl mb-1">
                      {opt.value === 'minor' ? '🟢' : opt.value === 'moderate' ? '🟡' : '🔴'}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL Foto <span className="text-slate-400 font-normal">(opsional)</span></label>
              <div className="relative">
                <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className={inputClass} />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        )}

        {/* Recent reports */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" /> Laporan Terbaru Anda
          </h2>
          {loadingReports ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : reports.length === 0 ? (
            <EmptyState icon={FileText} title="Belum ada laporan" description="Laporan yang Anda buat akan muncul di sini." />
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {r.location}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityBadge[r.severity])}>{severityLabel[r.severity]}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusBadge[r.status])}>{statusLabel[r.status]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

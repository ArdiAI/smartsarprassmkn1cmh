import { useEffect, useState, FormEvent } from 'react';
import {
  FileText, AlertTriangle, CheckCircle2, Loader2,
  Mail, Phone, MapPin, User, Package, ArrowLeft, Clock,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string;
  image_url: string | null;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string;
  reporter_email: string;
  reporter_phone: string | null;
  location: string;
}

const severityConfig: Record<string, { label: string; badge: string; card: string; icon: string }> = {
  minor: {
    label: 'Ringan',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    card: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'text-emerald-500',
  },
  moderate: {
    label: 'Sedang',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    card: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-500',
  },
  severe: {
    label: 'Berat',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    card: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-500',
  },
};

const statusConfig: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Menunggu', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

interface FormState {
  reporter_name: string;
  reporter_email: string;
  reporter_unit: string;
  reporter_phone: string;
  description: string;
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
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

export default function ReportPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReports = async (email?: string) => {
    const emailToUse = email || form.reporter_email;
    if (!emailToUse) {
      setLoadingReports(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('id, inventory_id, reporter_name, description, image_url, severity, status, resolution_notes, created_at, resolved_at, reporter_unit, reporter_email, reporter_phone, location')
        .eq('reporter_email', emailToUse)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setReports((data as unknown as DamageReport[]) || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!form.reporter_name.trim()) return 'Nama pelapor wajib diisi';
    if (!form.reporter_email.trim()) return 'Email pelapor wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) return 'Format email tidak valid';
    if (!form.reporter_unit.trim()) return 'Unit/Kelas wajib diisi';
    if (!form.description.trim()) return 'Nama barang/item wajib diisi';
    if (!form.location.trim()) return 'Lokasi wajib diisi';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      showToast(error, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reporter_name: form.reporter_name.trim(),
        reporter_email: form.reporter_email.trim(),
        reporter_unit: form.reporter_unit.trim(),
        reporter_phone: form.reporter_phone.trim() || null,
        description: form.description.trim(),
        location: form.location.trim(),
        severity: form.severity,
        image_url: form.image_url.trim() || null,
        status: 'pending' as const,
      };

      const { data, error: insertError } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('id, inventory_id, reporter_name, description, image_url, severity, status, resolution_notes, created_at, resolved_at, reporter_unit, reporter_email, reporter_phone, location')
        .single();

      if (insertError) throw insertError;

      const newReport = data as unknown as DamageReport;
      setSubmitted(newReport);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      setForm(initialForm);
      fetchReports(newReport.reporter_email);
    } catch (err) {
      console.error('Error submitting report:', err);
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
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Laporkan kerusakan sarana atau prasarana</p>
            </div>
          </div>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Berhasil Dikirim!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Laporan Anda akan ditinjau oleh tim penanggung jawab.</p>

            {/* Summary */}
            <div className="text-left bg-slate-50 dark:bg-slate-700/30 rounded-xl p-5 mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Pelapor</span>
                <span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Unit/Kelas</span>
                <span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Item</span>
                <span className="font-medium text-slate-900 dark:text-white">{submitted.description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
                <span className="font-medium text-slate-900 dark:text-white">{submitted.location}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Keparahan</span>
                <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', severityConfig[submitted.severity].badge)}>
                  {severityConfig[submitted.severity].label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', statusConfig[submitted.status].badge)}>
                  {statusConfig[submitted.status].label}
                </span>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
            {/* Reporter Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Pelapor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.reporter_name}
                  onChange={(e) => handleChange('reporter_name', e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email Pelapor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={form.reporter_email}
                  onChange={(e) => handleChange('reporter_email', e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Unit/Class */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Unit/Kelas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.reporter_unit}
                onChange={(e) => handleChange('reporter_unit', e.target.value)}
                placeholder="Contoh: Kelas 10A, Unit TU"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                No. Telepon <span className="text-slate-400 text-xs">(opsional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.reporter_phone}
                  onChange={(e) => handleChange('reporter_phone', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Item Name / Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Barang/Item <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Contoh: Proyektor Epson, AC Ruang Guru"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Lokasi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Contoh: Ruang Guru Lantai 1"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tingkat Keparahan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['minor', 'moderate', 'severe'] as const).map((sev) => {
                  const cfg = severityConfig[sev];
                  const selected = form.severity === sev;
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => handleChange('severity', sev)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                        selected
                          ? cn(cfg.card, 'ring-2 ring-offset-0')
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <AlertTriangle className={cn('w-6 h-6', selected ? cfg.icon : 'text-slate-400')} />
                      <span className={cn('text-sm font-medium', selected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                URL Foto <span className="text-slate-400 text-xs">(opsional)</span>
              </label>
              <input
                type="text"
                value={form.image_url}
                onChange={(e) => handleChange('image_url', e.target.value)}
                placeholder="https://contoh.com/foto-kerusakan.jpg"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium transition-colors"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim Laporan...</>
              ) : (
                <><FileText className="w-5 h-5" /> Kirim Laporan</>
              )}
            </button>
          </form>
        )}

        {/* Recent Reports */}
        {!submitted && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Laporan Terbaru Anda</h2>
            {loadingReports ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-3" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <EmptyState icon={FileText} title="Belum ada laporan" description="Laporan yang Anda buat akan muncul di sini" />
            ) : (
              <div className="space-y-3">
                {reports.map((r) => {
                  const sev = severityConfig[r.severity];
                  const st = statusConfig[r.status];
                  return (
                    <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                        <div className="flex gap-2 flex-shrink-0">
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', sev.badge)}>
                            {sev.label}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', st.badge)}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>{r.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                      {r.resolution_notes && (
                        <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">
                          <span className="font-medium">Resolusi:</span> {r.resolution_notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

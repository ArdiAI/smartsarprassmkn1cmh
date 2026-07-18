import { useEffect, useState, FormEvent } from 'react';
import {
  FileText, AlertTriangle, CheckCircle2, Loader2, MapPin, Calendar,
  User, Mail, Phone, Building, Image as ImageIcon, RotateCcw, Send, ShieldAlert,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface DamageReport {
  id: string;
  reporter_name: string;
  reporter_email: string;
  reporter_unit: string;
  reporter_phone: string | null;
  description: string;
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  image_url: string | null;
  created_at: string;
}

const severityConfig: Record<string, { label: string; badge: string; card: string; ring: string; icon: string }> = {
  minor: {
    label: 'Ringan',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    card: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10',
    ring: 'ring-emerald-500',
    icon: 'text-emerald-500',
  },
  moderate: {
    label: 'Sedang',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    card: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10',
    ring: 'ring-amber-500',
    icon: 'text-amber-500',
  },
  severe: {
    label: 'Berat',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    card: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10',
    ring: 'ring-red-500',
    icon: 'text-red-500',
  },
};

const statusConfig: Record<string, { label: string; badge: string }> = {
  pending: {
    label: 'Menunggu',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  in_progress: {
    label: 'Diproses',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  resolved: {
    label: 'Selesai',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
};

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

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

  const loadReports = async (email?: string) => {
    const emailToUse = email || form.reporter_email;
    if (!emailToUse) {
      setLoadingReports(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, status, image_url, created_at')
        .eq('reporter_email', emailToUse)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setReports((data as unknown as DamageReport[]) || []);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!form.reporter_name.trim()) return 'Nama pelapor wajib diisi.';
    if (!form.reporter_email.trim()) return 'Email pelapor wajib diisi.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) return 'Format email tidak valid.';
    if (!form.reporter_unit.trim()) return 'Unit/Kelas wajib diisi.';
    if (!form.description.trim()) return 'Nama barang/item wajib diisi.';
    if (!form.location.trim()) return 'Lokasi wajib diisi.';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      showToast(err, 'warning');
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

      const { data, error } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, status, image_url, created_at')
        .single();

      if (error) throw error;

      const created = data as unknown as DamageReport;
      setSubmitted(created);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      setForm(initialForm);
      loadReports(created.reporter_email);
    } catch (e) {
      console.error('Failed to submit report:', e);
      showToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null);
    setForm(initialForm);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Laporkan kerusakan sarana atau prasarana. Tim akan menindaklanjuti laporan Anda.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {submitted ? (
            /* Success state */
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Terkirim!</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Laporan Anda telah berhasil dikirim. Tim akan memproses laporan ini segera.
              </p>

              <div className="mt-6 text-left rounded-xl bg-slate-50 dark:bg-slate-700/30 p-5 space-y-3">
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
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityConfig[submitted.severity]?.badge)}>
                    {severityConfig[submitted.severity]?.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Status</span>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig[submitted.status]?.badge)}>
                    {statusConfig[submitted.status]?.label}
                  </span>
                </div>
              </div>

              <button
                onClick={resetForm}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Buat Laporan Lain
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Nama Pelapor */}
                <div>
                  <label className={labelClass}>
                    Nama Pelapor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.reporter_name}
                      onChange={(e) => update('reporter_name', e.target.value)}
                      placeholder="Nama lengkap"
                      className={cn(inputClass, 'pl-10')}
                      required
                    />
                  </div>
                </div>

                {/* Email Pelapor */}
                <div>
                  <label className={labelClass}>
                    Email Pelapor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={form.reporter_email}
                      onChange={(e) => update('reporter_email', e.target.value)}
                      placeholder="email@sekolah.id"
                      className={cn(inputClass, 'pl-10')}
                      required
                    />
                  </div>
                </div>

                {/* Unit/Kelas */}
                <div>
                  <label className={labelClass}>
                    Unit/Kelas <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.reporter_unit}
                      onChange={(e) => update('reporter_unit', e.target.value)}
                      placeholder="Contoh: XII IPA 1 / TU"
                      className={cn(inputClass, 'pl-10')}
                      required
                    />
                  </div>
                </div>

                {/* No. Telepon */}
                <div>
                  <label className={labelClass}>No. Telepon</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.reporter_phone}
                      onChange={(e) => update('reporter_phone', e.target.value)}
                      placeholder="08xxxxxxxxxx (opsional)"
                      className={cn(inputClass, 'pl-10')}
                    />
                  </div>
                </div>

                {/* Nama Barang/Item */}
                <div>
                  <label className={labelClass}>
                    Nama Barang/Item <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) => update('description', e.target.value)}
                      placeholder="Contoh: Proyektor ruang kelas"
                      className={cn(inputClass, 'pl-10')}
                      required
                    />
                  </div>
                </div>

                {/* Lokasi */}
                <div>
                  <label className={labelClass}>
                    Lokasi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => update('location', e.target.value)}
                      placeholder="Contoh: Ruang 12B"
                      className={cn(inputClass, 'pl-10')}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Severity radio cards */}
              <div className="mt-5">
                <label className={labelClass}>
                  Tingkat Keparahan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['minor', 'moderate', 'severe'] as const).map((sev) => {
                    const cfg = severityConfig[sev];
                    const selected = form.severity === sev;
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => update('severity', sev)}
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                          selected
                            ? cn(cfg.card, 'ring-2', cfg.ring)
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600',
                        )}
                      >
                        <AlertTriangle className={cn('w-5 h-5 flex-shrink-0', cfg.icon)} />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{cfg.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {sev === 'minor' && 'Kerusakan ringan'}
                            {sev === 'moderate' && 'Kerusakan sedang'}
                            {sev === 'severe' && 'Kerusakan berat'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* URL Foto */}
              <div className="mt-5">
                <label className={labelClass}>URL Foto (Opsional)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.image_url}
                    onChange={(e) => update('image_url', e.target.value)}
                    placeholder="https://... (opsional)"
                    className={cn(inputClass, 'pl-10')}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Berikan link foto kerusakan jika tersedia.</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
          )}

          {/* Recent reports */}
          <div className="mt-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Laporan Terbaru Anda
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {form.reporter_email
                ? `Menampilkan laporan dari ${form.reporter_email}`
                : 'Isi email pada form untuk melihat laporan Anda.'}
            </p>
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
              {loadingReports ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
                  ))}
                </div>
              ) : reports.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Belum ada laporan"
                  description="Laporan yang Anda buat akan muncul di sini."
                />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {reports.map((r) => {
                    const sev = severityConfig[r.severity] || severityConfig.minor;
                    const st = statusConfig[r.status] || statusConfig.pending;
                    return (
                      <li key={r.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', sev.badge)}>
                                {sev.label}
                              </span>
                              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', st.badge)}>
                                {st.label}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {r.location}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDateTime(r.created_at)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                {r.reporter_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

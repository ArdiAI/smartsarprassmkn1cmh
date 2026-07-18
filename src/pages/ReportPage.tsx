import { useEffect, useState, FormEvent } from 'react';
import {
  AlertCircle, Send, CheckCircle2, Plus, MapPin, Calendar,
  User, Mail, Phone, Package, Loader2, RotateCcw, Image as ImageIcon,
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
  reporter_unit: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  location: string | null;
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

const severityOptions: { value: 'minor' | 'moderate' | 'severe'; label: string; classes: string; border: string }[] = [
  { value: 'minor', label: 'Ringan', classes: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700' },
  { value: 'moderate', label: 'Sedang', classes: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700' },
  { value: 'severe', label: 'Berat', classes: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
];

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  in_progress: { label: 'Diproses', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolved: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

const severityBadge: Record<string, { label: string; classes: string }> = {
  minor: { label: 'Ringan', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  moderate: { label: 'Sedang', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  severe: { label: 'Berat', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function ReportPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  async function fetchReports(email?: string) {
    const targetEmail = email || form.reporter_email;
    if (!targetEmail) {
      setReports([]);
      setLoadingReports(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('id, inventory_id, reporter_name, description, image_url, severity, status, resolution_notes, created_at, resolved_at, reporter_unit, reporter_email, reporter_phone, location')
        .eq('reporter_email', targetEmail)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setReports((data as unknown as DamageReport[]) || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): boolean {
    if (!form.reporter_name.trim()) {
      showToast('Nama pelapor wajib diisi', 'error');
      return false;
    }
    if (!form.reporter_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) {
      showToast('Email pelapor tidak valid', 'error');
      return false;
    }
    if (!form.reporter_unit.trim()) {
      showToast('Unit/Kelas wajib diisi', 'error');
      return false;
    }
    if (!form.description.trim()) {
      showToast('Nama barang/item wajib diisi', 'error');
      return false;
    }
    if (!form.location.trim()) {
      showToast('Lokasi wajib diisi', 'error');
      return false;
    }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
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
      const { data, error } = await supabase.from('damage_reports').insert(payload).select('*').single();
      if (error) throw error;
      const newReport = data as unknown as DamageReport;
      setSubmittedReport(newReport);
      setSuccess(true);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      fetchReports(form.reporter_email);
    } catch (err) {
      console.error('Error submitting report:', err);
      showToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setSuccess(false);
    setSubmittedReport(null);
  }

  const inputClasses =
    'w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Laporkan kerusakan sarana atau prasarana</p>
            </div>
          </div>
        </div>

        {success && submittedReport ? (
          /* Success State */
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Berhasil Dikirim!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Laporan Anda akan ditinjau oleh tim sarpras. Anda akan mendapat informasi melalui email.</p>

            {/* Summary */}
            <div className="text-left rounded-2xl bg-slate-50 dark:bg-slate-700/30 p-5 mb-6 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Item:</span>
                <span className="font-medium text-slate-900 dark:text-white">{submittedReport.description}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Lokasi:</span>
                <span className="font-medium text-slate-900 dark:text-white">{submittedReport.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Pelapor:</span>
                <span className="font-medium text-slate-900 dark:text-white">{submittedReport.reporter_name} ({submittedReport.reporter_unit})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Keparahan:</span>
                <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', severityBadge[submittedReport.severity].classes)}>
                  {severityBadge[submittedReport.severity].label}
                </span>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 md:p-8 space-y-5">
            {/* Reporter Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Pelapor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={form.reporter_name}
                  onChange={(e) => handleChange('reporter_name', e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  required
                  className={cn(inputClasses, 'pl-10')}
                />
              </div>
            </div>

            {/* Reporter Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email Pelapor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={form.reporter_email}
                  onChange={(e) => handleChange('reporter_email', e.target.value)}
                  placeholder="email@sekolah.sch.id"
                  required
                  className={cn(inputClasses, 'pl-10')}
                />
              </div>
            </div>

            {/* Reporter Unit */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Unit/Kelas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.reporter_unit}
                onChange={(e) => handleChange('reporter_unit', e.target.value)}
                placeholder="Contoh: XII IPA 1 / TU / Lab Komputer"
                required
                className={inputClasses}
              />
            </div>

            {/* Reporter Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                No. Telepon <span className="text-slate-400 text-xs">(opsional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={form.reporter_phone}
                  onChange={(e) => handleChange('reporter_phone', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className={cn(inputClasses, 'pl-10')}
                />
              </div>
            </div>

            {/* Description (Item name) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Barang/Item <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Contoh: Proyektor ruang kelas, AC lab komputer"
                  required
                  className={cn(inputClasses, 'pl-10')}
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Lokasi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Contoh: Ruang Kelas XII IPA 1"
                  required
                  className={cn(inputClasses, 'pl-10')}
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tingkat Keparahan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {severityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange('severity', opt.value)}
                    className={cn(
                      'rounded-2xl border-2 p-4 text-center transition-all',
                      form.severity === opt.value
                        ? cn(opt.classes, opt.border, 'ring-2 ring-offset-0')
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                    )}
                  >
                    <AlertCircle className={cn('w-6 h-6 mx-auto mb-1.5', form.severity === opt.value ? '' : 'text-slate-400')} />
                    <span className="text-sm font-medium block">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                URL Foto <span className="text-slate-400 text-xs">(opsional)</span>
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="https://link-foto.com/foto.jpg"
                  className={cn(inputClasses, 'pl-10')}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Mengirim Laporan...
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

        {/* Recent Reports */}
        {form.reporter_email && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Laporan Terbaru Anda
            </h2>
            {loadingReports ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                    <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
                    <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <EmptyState icon={AlertCircle} title="Belum ada laporan" description="Laporan yang Anda buat akan muncul di sini" />
            ) : (
              <div className="space-y-3">
                {reports.map((r) => {
                  const sev = severityBadge[r.severity] || severityBadge.minor;
                  const st = statusConfig[r.status] || statusConfig.pending;
                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          <h3 className="font-medium text-slate-900 dark:text-white">{r.description}</h3>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', sev.classes)}>
                            {sev.label}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', st.classes)}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        {r.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {r.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {r.resolution_notes && (
                        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                          Resolusi: {r.resolution_notes}
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

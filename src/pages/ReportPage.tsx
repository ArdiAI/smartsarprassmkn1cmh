import { useEffect, useState } from 'react';
import {
  FileText,
  Send,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  Mail,
  Phone,
  User,
  Building,
  RotateCcw,
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
  image_url: string | null;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface FormData {
  reporter_name: string;
  reporter_email: string;
  reporter_unit: string;
  reporter_phone: string;
  description: string;
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  image_url: string;
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

const emptyForm: FormData = {
  reporter_name: '',
  reporter_email: '',
  reporter_unit: '',
  reporter_phone: '',
  description: '',
  location: '',
  severity: 'minor',
  image_url: '',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ReportPage() {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<DamageReport | null>(null);
  const [recentReports, setRecentReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchRecentReports = async (email?: string) => {
    const emailToUse = email || form.reporter_email;
    if (!emailToUse) {
      setRecentReports([]);
      setLoadingReports(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('*')
        .eq('reporter_email', emailToUse)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentReports((data as unknown as DamageReport[]) || []);
    } catch (err) {
      console.error('Error fetching recent reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchRecentReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): string | null => {
    if (!form.reporter_name.trim()) return 'Nama pelapor wajib diisi';
    if (!form.reporter_email.trim()) return 'Email pelapor wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) return 'Format email tidak valid';
    if (!form.reporter_unit.trim()) return 'Unit/Kelas wajib diisi';
    if (!form.description.trim()) return 'Nama barang/item wajib diisi';
    if (!form.location.trim()) return 'Lokasi wajib diisi';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      showToast(error, 'warning');
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
        .select()
        .single();

      if (insertError) throw insertError;

      const newReport = data as unknown as DamageReport;
      setSubmitted(newReport);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      fetchRecentReports(form.reporter_email);
    } catch (err) {
      console.error('Error submitting report:', err);
      showToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSubmitted(null);
  };

  const severityOptions: { value: FormData['severity']; label: string; description: string }[] = [
    { value: 'minor', label: 'Ringan', description: 'Kerusakan kecil, masih bisa digunakan' },
    { value: 'moderate', label: 'Sedang', description: 'Kerusakan sedang, perlu perbaikan' },
    { value: 'severe', label: 'Berat', description: 'Kerusakan parah, tidak bisa digunakan' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Laporkan kerusakan sarana atau prasarana dengan mengisi formulir di bawah.
          </p>
        </div>

        {submitted ? (
          /* Success State */
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Terkirim!</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Laporan Anda telah berhasil dikirim dan akan ditindaklanjuti.
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Pelapor</span>
                <span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Unit/Kelas</span>
                <span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Barang/Item</span>
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
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
            >
              <RotateCcw className="w-5 h-5" />
              Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
            <div className="space-y-5">
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
                    onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                    placeholder="Masukkan nama Anda"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Pelapor <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={form.reporter_email}
                    onChange={(e) => setForm({ ...form, reporter_email: e.target.value })}
                    placeholder="email@contoh.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Unit/Kelas + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Unit/Kelas <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={form.reporter_unit}
                      onChange={(e) => setForm({ ...form, reporter_unit: e.target.value })}
                      placeholder="Contoh: Kelas 10A"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    No. Telepon <span className="text-slate-400">(opsional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={form.reporter_phone}
                      onChange={(e) => setForm({ ...form, reporter_phone: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Description (Nama Barang) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Barang/Item <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Contoh: Proyektor Ruang Kelas 10A"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Contoh: Ruang Kelas 10A, Lantai 2"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tingkat Keparahan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {severityOptions.map((opt) => {
                    const config = severityConfig[opt.value];
                    const isSelected = form.severity === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, severity: opt.value })}
                        className={cn(
                          'flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all',
                          isSelected
                            ? config.card
                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 hover:border-slate-300 dark:hover:border-slate-500',
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={cn('w-5 h-5', isSelected ? config.icon : 'text-slate-400')} />
                          <span className={cn('font-semibold', isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300')}>
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  URL Foto <span className="text-slate-400">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://contoh.com/foto.jpg"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Kirim Laporan
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Recent Reports */}
        {!submitted && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Laporan Terakhir Anda</h2>
            {form.reporter_email ? (
              loadingReports ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : recentReports.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Belum ada laporan"
                  description="Laporan yang Anda buat akan muncul di sini."
                />
              ) : (
                <div className="space-y-3">
                  {recentReports.map((report) => {
                    const sev = severityConfig[report.severity];
                    const stat = statusConfig[report.status];
                    return (
                      <div
                        key={report.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{report.description}</h3>
                          <div className="flex gap-2 flex-shrink-0">
                            <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', sev.badge)}>
                              {sev.label}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', stat.badge)}>
                              {stat.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {report.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(report.created_at)}
                          </span>
                        </div>
                        {report.resolution_notes && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Catatan Resolusi</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{report.resolution_notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  Isi email di formulir di atas untuk melihat laporan Anda sebelumnya.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

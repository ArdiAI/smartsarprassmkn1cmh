import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Send, CheckCircle, AlertTriangle, Loader2, MapPin, Calendar,
  Mail, Phone, User, Package, RefreshCw, ImageIcon,
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
  severity: 'minor' | 'moderate' | 'severe' | null;
  status: 'pending' | 'in_progress' | 'resolved' | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string;
  reporter_email: string;
  reporter_phone: string | null;
  location: string;
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

const severityConfig: Record<string, { label: string; class: string; cardClass: string; icon: typeof AlertTriangle }> = {
  minor: {
    label: 'Ringan',
    class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cardClass: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20',
    icon: AlertTriangle,
  },
  moderate: {
    label: 'Sedang',
    class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    cardClass: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20',
    icon: AlertTriangle,
  },
  severe: {
    label: 'Berat',
    class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cardClass: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
    icon: AlertTriangle,
  },
};

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  in_progress: { label: 'Diproses', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolved: { label: 'Selesai', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
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

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));
}

export default function ReportPage() {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<DamageReport | null>(null);
  const [recentReports, setRecentReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchRecentReports = useCallback(async (email?: string) => {
    const emailToUse = email || form.reporter_email;
    if (!emailToUse) {
      setLoadingReports(false);
      return;
    }
    setLoadingReports(true);
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
  }, [form.reporter_email]);

  useEffect(() => {
    fetchRecentReports();
  }, [fetchRecentReports]);

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    if (!form.reporter_name.trim()) { showToast('Nama pelapor wajib diisi', 'error'); return false; }
    if (!form.reporter_email.trim()) { showToast('Email pelapor wajib diisi', 'error'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) { showToast('Format email tidak valid', 'error'); return false; }
    if (!form.reporter_unit.trim()) { showToast('Unit/Kelas wajib diisi', 'error'); return false; }
    if (!form.description.trim()) { showToast('Nama barang/item wajib diisi', 'error'); return false; }
    if (!form.location.trim()) { showToast('Lokasi wajib diisi', 'error'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      const { data, error } = await supabase.from('damage_reports').insert(payload).select().single();
      if (error) throw error;
      const report = data as unknown as DamageReport;
      setSubmitted(report);
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

  const inputClass = 'w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Laporkan kerusakan sarana atau prasarana
          </p>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Laporan Berhasil Dikirim!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Terima kasih atas laporan Anda. Tim akan segera menindaklanjuti.</p>

            {/* Summary */}
            <div className="text-left bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-5 mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Pelapor</span><span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Unit/Kelas</span><span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Barang/Item</span><span className="font-medium text-slate-900 dark:text-white">{submitted.description}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Lokasi</span><span className="font-medium text-slate-900 dark:text-white">{submitted.location}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Keparahan</span>
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold', severityConfig[submitted.severity || 'minor']?.class)}>
                  {severityConfig[submitted.severity || 'minor']?.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold', statusConfig[submitted.status || 'pending']?.class)}>
                  {statusConfig[submitted.status || 'pending']?.label}
                </span>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            {/* reporter_name */}
            <div>
              <label className={labelClass}>Nama Pelapor <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={form.reporter_name} onChange={(e) => handleChange('reporter_name', e.target.value)} placeholder="Nama lengkap pelapor" className={cn(inputClass, 'pl-12')} required />
              </div>
            </div>

            {/* reporter_email */}
            <div>
              <label className={labelClass}>Email Pelapor <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" value={form.reporter_email} onChange={(e) => handleChange('reporter_email', e.target.value)} placeholder="email@contoh.com" className={cn(inputClass, 'pl-12')} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* reporter_unit */}
              <div>
                <label className={labelClass}>Unit/Kelas <span className="text-red-500">*</span></label>
                <input type="text" value={form.reporter_unit} onChange={(e) => handleChange('reporter_unit', e.target.value)} placeholder="Contoh: XII IPA 1" className={inputClass} required />
              </div>
              {/* reporter_phone */}
              <div>
                <label className={labelClass}>No. Telepon <span className="text-slate-400 text-xs">(opsional)</span></label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input type="text" value={form.reporter_phone} onChange={(e) => handleChange('reporter_phone', e.target.value)} placeholder="08xxxxxxxxxx" className={cn(inputClass, 'pl-12')} />
                </div>
              </div>
            </div>

            {/* description */}
            <div>
              <label className={labelClass}>Nama Barang/Item <span className="text-red-500">*</span></label>
              <div className="relative">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={form.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Nama barang yang rusak" className={cn(inputClass, 'pl-12')} required />
              </div>
            </div>

            {/* location */}
            <div>
              <label className={labelClass}>Lokasi <span className="text-red-500">*</span></label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={form.location} onChange={(e) => handleChange('location', e.target.value)} placeholder="Lokasi barang" className={cn(inputClass, 'pl-12')} required />
              </div>
            </div>

            {/* severity */}
            <div>
              <label className={labelClass}>Tingkat Keparahan <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {(['minor', 'moderate', 'severe'] as const).map((sev) => {
                  const config = severityConfig[sev];
                  const isSelected = form.severity === sev;
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => handleChange('severity', sev)}
                      className={cn(
                        'p-4 rounded-2xl border-2 text-center transition-all',
                        isSelected
                          ? cn(config.cardClass, 'ring-2 ring-offset-0')
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600',
                      )}
                    >
                      <AlertTriangle className={cn('w-6 h-6 mx-auto mb-2', isSelected ? '' : 'text-slate-400')} />
                      <p className={cn('font-semibold text-sm', isSelected ? '' : 'text-slate-600 dark:text-slate-300')}>{config.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* image_url */}
            <div>
              <label className={labelClass}>URL Foto <span className="text-slate-400 text-xs">(opsional)</span></label>
              <div className="relative">
                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={form.image_url} onChange={(e) => handleChange('image_url', e.target.value)} placeholder="https://..." className={cn(inputClass, 'pl-12')} />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {submitting ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        )}

        {/* Recent Reports */}
        {!submitted && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Laporan Terakhir {form.reporter_email && `(${form.reporter_email})`}
            </h2>
            {loadingReports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : recentReports.length === 0 ? (
              <EmptyState icon={FileText} title="Belum ada laporan" description="Laporan Anda akan muncul di sini setelah Anda mengisi email dan mengirim laporan" />
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => {
                  const sev = severityConfig[report.severity || 'minor'];
                  const stat = statusConfig[report.status || 'pending'];
                  return (
                    <div key={report.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{report.description}</h3>
                        <div className="flex gap-2 flex-shrink-0">
                          <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold', sev.class)}>{sev.label}</span>
                          <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold', stat.class)}>{stat.label}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{report.location}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDateTime(report.created_at)}</span>
                      </div>
                      {report.resolution_notes && (
                        <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            <span className="font-medium">Resolusi: </span>{report.resolution_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

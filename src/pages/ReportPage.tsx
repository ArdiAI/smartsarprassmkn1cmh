import { useEffect, useState, FormEvent } from 'react';
import {
  Wrench,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Image as ImageIcon,
  Clock,
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
  reporter_phone: string;
  description: string;
  location: string;
  image_url: string;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  resolution_notes: string;
  created_at: string;
  resolved_at: string | null;
}

const severityConfig: Record<string, { label: string; color: string; ring: string; icon: string }> = {
  minor: { label: 'Ringan', color: 'text-emerald-600 dark:text-emerald-400', ring: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20', icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' },
  moderate: { label: 'Sedang', color: 'text-amber-600 dark:text-amber-400', ring: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20', icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' },
  severe: { label: 'Berat', color: 'text-red-600 dark:text-red-400', ring: 'border-red-400 bg-red-50 dark:bg-red-900/20', icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
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
  const [submittedReport, setSubmittedReport] = useState<DamageReport | null>(null);
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
        .select('*')
        .eq('reporter_email', emailToUse)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setReports((data as unknown as DamageReport[]) || []);
    } catch (e) {
      console.error('Failed to fetch reports:', e);
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

  const validate = (): boolean => {
    if (!form.reporter_name.trim()) {
      showToast('Nama pelapor wajib diisi', 'warning');
      return false;
    }
    if (!form.reporter_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) {
      showToast('Email pelapor tidak valid', 'warning');
      return false;
    }
    if (!form.reporter_unit.trim()) {
      showToast('Unit/Kelas wajib diisi', 'warning');
      return false;
    }
    if (!form.description.trim()) {
      showToast('Nama barang/item wajib diisi', 'warning');
      return false;
    }
    if (!form.location.trim()) {
      showToast('Lokasi wajib diisi', 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
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

      const { data, error } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      const newReport = data as unknown as DamageReport;
      setSubmittedReport(newReport);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      fetchReports(form.reporter_email);
    } catch (err) {
      console.error('Failed to submit report:', err);
      showToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setSubmittedReport(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-13">
            Laporkan kerusakan sarana atau prasarana dengan mengisi formulir di bawah.
          </p>
        </div>

        {submittedReport ? (
          /* Success State */
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Laporan Anda telah berhasil dikirim dan akan ditindaklanjuti oleh tim terkait.
            </p>
            <div className="text-left max-w-md mx-auto space-y-2 mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pelapor:</span>
                <span className="font-medium text-slate-900 dark:text-white">{submittedReport.reporter_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Item:</span>
                <span className="font-medium text-slate-900 dark:text-white">{submittedReport.description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lokasi:</span>
                <span className="font-medium text-slate-900 dark:text-white">{submittedReport.location}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Keparahan:</span>
                <span className={cn('font-semibold', severityConfig[submittedReport.severity]?.color)}>
                  {severityConfig[submittedReport.severity]?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status:</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', statusConfig[submittedReport.status]?.color)}>
                  {statusConfig[submittedReport.status]?.label}
                </span>
              </div>
            </div>
            <button onClick={resetForm} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            {/* Reporter Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nama Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.reporter_name}
                    onChange={(e) => handleChange('reporter_name', e.target.value)}
                    className="input pl-9"
                    placeholder="Nama lengkap"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Email Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.reporter_email}
                    onChange={(e) => handleChange('reporter_email', e.target.value)}
                    className="input pl-9"
                    placeholder="email@contoh.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Unit/Kelas <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.reporter_unit}
                  onChange={(e) => handleChange('reporter_unit', e.target.value)}
                  className="input"
                  placeholder="Kelas atau unit kerja"
                  required
                />
              </div>
              <div>
                <label className="label">No. Telepon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.reporter_phone}
                    onChange={(e) => handleChange('reporter_phone', e.target.value)}
                    className="input pl-9"
                    placeholder="08xxxxxxxxxx (opsional)"
                  />
                </div>
              </div>
            </div>

            {/* Item & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nama Barang/Item <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="input pl-9"
                    placeholder="Nama barang yang rusak"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Lokasi <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="input pl-9"
                    placeholder="Lokasi barang"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="label">Tingkat Keparahan <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {(['minor', 'moderate', 'severe'] as const).map((sev) => {
                  const cfg = severityConfig[sev];
                  const isSelected = form.severity === sev;
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => handleChange('severity', sev)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        isSelected
                          ? cfg.ring
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className={cn('w-4 h-4', cfg.color)} />
                        <span className={cn('font-semibold text-sm', isSelected ? cfg.color : 'text-slate-700 dark:text-slate-300')}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {sev === 'minor' && 'Kerusakan kecil, masih berfungsi'}
                        {sev === 'moderate' && 'Kerusakan sedang, perlu perbaikan'}
                        {sev === 'severe' && 'Kerusakan berat, tidak berfungsi'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="label">URL Foto (Opsional)</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  className="input pl-9"
                  placeholder="https://... (link foto kerusakan)"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  Kirim Laporan
                </>
              )}
            </button>
          </form>
        )}

        {/* Recent Reports */}
        {!submittedReport && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Laporan Terakhir Anda
            </h2>
            {loadingReports ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="Belum ada laporan"
                description="Laporan yang Anda buat akan muncul di sini setelah dikirim."
              />
            ) : (
              <div className="space-y-3">
                {reports.map((r) => {
                  const sev = severityConfig[r.severity] || severityConfig.minor;
                  const st = statusConfig[r.status] || statusConfig.pending;
                  return (
                    <div key={r.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{r.location}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={cn('px-2.5 py-0.5 rounded-lg text-xs font-semibold', sev.icon)}>
                            {sev.label}
                          </span>
                          <span className={cn('px-2.5 py-0.5 rounded-lg text-xs font-semibold', st.color)}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                      {r.resolution_notes && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-sm text-slate-600 dark:text-slate-300">
                          <span className="font-medium">Catatan: </span>{r.resolution_notes}
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

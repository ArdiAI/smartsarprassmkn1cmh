import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import {
  Wrench, Loader2, Send, CheckCircle, AlertTriangle, MapPin,
  Mail, Phone, Building2, Package, Plus, Calendar, Clock,
} from 'lucide-react';

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

const severityConfig: Record<string, { label: string; color: string; cardColor: string; icon: string }> = {
  minor: {
    label: 'Ringan',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cardColor: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20',
    icon: '🟢',
  },
  moderate: {
    label: 'Sedang',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    cardColor: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20',
    icon: '🟡',
  },
  severe: {
    label: 'Berat',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    cardColor: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
    icon: '🔴',
  },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

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

const initialForm: FormData = {
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
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<DamageReport | null>(null);
  const [recentReports, setRecentReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchRecentReports = async (email?: string) => {
    const emailToUse = email || form.reporter_email;
    if (!emailToUse) {
      setRecentReports([]);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchRecentReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.reporter_name.trim()) e.reporter_name = 'Nama pelapor wajib diisi';
    if (!form.reporter_email.trim()) e.reporter_email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) e.reporter_email = 'Format email tidak valid';
    if (!form.reporter_unit.trim()) e.reporter_unit = 'Unit/Kelas wajib diisi';
    if (!form.description.trim()) e.description = 'Nama barang wajib diisi';
    if (!form.location.trim()) e.location = 'Lokasi wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Mohon lengkapi semua field yang wajib diisi', 'error');
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
        .select('*')
        .single();

      if (error) throw error;

      const report = data as unknown as DamageReport;
      setSubmittedReport(report);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      fetchRecentReports(form.reporter_email);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
    setSubmittedReport(null);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-500" /> Laporan Kerusakan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Laporkan kerusakan sarana dan prasarana</p>
        </div>

        {/* Success State */}
        {submittedReport ? (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Berhasil Dikirim!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Laporan Anda akan ditinjau oleh tim sarana dan prasarana.</p>

            {/* Report Summary */}
            <div className="text-left max-w-md mx-auto space-y-3 p-5 rounded-xl bg-slate-50 dark:bg-slate-700/30 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Pelapor</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submittedReport.reporter_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Unit/Kelas</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submittedReport.reporter_unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Barang</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submittedReport.description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Lokasi</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submittedReport.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Keparahan</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${severityConfig[submittedReport.severity].color}`}>
                  {severityConfig[submittedReport.severity].label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[submittedReport.status].color}`}>
                  {statusConfig[submittedReport.status].label}
                </span>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" /> Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            {/* Reporter Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Nama Pelapor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.reporter_name}
                  onChange={e => updateField('reporter_name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Masukkan nama Anda"
                />
                {errors.reporter_name && <p className="text-xs text-red-500 mt-1">{errors.reporter_name}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Email Pelapor <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.reporter_email}
                  onChange={e => updateField('reporter_email', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="email@example.com"
                />
                {errors.reporter_email && <p className="text-xs text-red-500 mt-1">{errors.reporter_email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Unit/Kelas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.reporter_unit}
                  onChange={e => updateField('reporter_unit', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: Kelas 10A, Unit TU"
                />
                {errors.reporter_unit && <p className="text-xs text-red-500 mt-1">{errors.reporter_unit}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  No. Telepon <span className="text-slate-400 text-xs">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={form.reporter_phone}
                  onChange={e => updateField('reporter_phone', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>

            {/* Item Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Nama Barang/Item <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: Proyektor Ruang A101"
                />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Lokasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => updateField('location', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Contoh: Ruang A101, Lantai 1"
                />
                {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Tingkat Keparahan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['minor', 'moderate', 'severe'] as const).map(sev => {
                  const cfg = severityConfig[sev];
                  const isSelected = form.severity === sev;
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => updateField('severity', sev)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${isSelected
                        ? `${cfg.cardColor} ring-2 ring-blue-500`
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                      <div className="text-2xl mb-1">{cfg.icon}</div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{cfg.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                URL Foto <span className="text-slate-400 text-xs">(opsional)</span>
              </label>
              <input
                type="text"
                value={form.image_url}
                onChange={e => updateField('image_url', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="https://example.com/foto-kerusakan.jpg"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
              ) : (
                <><Send className="w-5 h-5" /> Kirim Laporan</>
              )}
            </button>
          </form>
        )}

        {/* Recent Reports */}
        {!submittedReport && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> Laporan Terbaru Anda
            </h2>
            {loadingReports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : recentReports.length === 0 ? (
              <div className="card p-6">
                <EmptyState icon={Wrench} title="Belum ada laporan" description="Laporan yang Anda buat akan muncul di sini" />
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map(report => {
                  const sev = severityConfig[report.severity] || severityConfig.minor;
                  const st = statusConfig[report.status] || statusConfig.pending;
                  return (
                    <div key={report.id} className="card p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{report.description}</p>
                            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                              <MapPin className="w-3.5 h-3.5" /> {report.location}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sev.color}`}>{sev.label}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {report.reporter_unit}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {report.reporter_email}</span>
                        {report.reporter_phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {report.reporter_phone}</span>}
                        <span className="ml-auto flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

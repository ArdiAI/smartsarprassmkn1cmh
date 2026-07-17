import { useEffect, useState } from 'react';
import {
  FileWarning, Send, CheckCircle2, AlertTriangle, MapPin, Calendar,
  Plus, Loader2, Mail, Phone, User, Package,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
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

const severityOptions: { value: Severity; label: string; classes: string; border: string }[] = [
  { value: 'minor', label: 'Ringan', classes: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500' },
  { value: 'moderate', label: 'Sedang', classes: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500' },
  { value: 'severe', label: 'Berat', classes: 'text-red-600 dark:text-red-400', border: 'border-red-500' },
];

const severityBadge: Record<Severity, { label: string; classes: string }> = {
  minor: { label: 'Ringan', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  moderate: { label: 'Sedang', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  severe: { label: 'Berat', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const statusBadge: Record<ReportStatus, { label: string; classes: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  in_progress: { label: 'Diproses', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolved: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

function formatDateTime(d: string) {
  try {
    return new Date(d).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d;
  }
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

const emptyForm: FormState = {
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
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<DamageReport | null>(null);
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
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, image_url, status, created_at')
        .eq('reporter_email', emailToUse)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setReports((data as unknown as DamageReport[]) || []);
    } catch (e) {
      // ignore
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
        status: 'pending' as ReportStatus,
      };
      const { data, error: insertError } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, image_url, status, created_at')
        .single();
      if (insertError) throw insertError;
      const newReport = data as unknown as DamageReport;
      setSuccess(newReport);
      setReports((prev) => [newReport, ...prev]);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengirim laporan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Laporkan kerusakan sarana atau prasarana dengan mengisi formulir di bawah.
          </p>
        </div>

        {success ? (
          /* Success State */
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Terkirim!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Laporan Anda telah berhasil dikirim dan akan ditindaklanjuti oleh tim terkait.
            </p>

            <div className="mt-6 text-left bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Nama Pelapor</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.reporter_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Unit/Kelas</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.reporter_unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Barang</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.location}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-500 dark:text-slate-400">Tingkat Keparahan</span>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', severityBadge[success.severity].classes)}>
                  {severityBadge[success.severity].label}
                </span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusBadge[success.status].classes)}>
                  {statusBadge[success.status].label}
                </span>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nama Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.reporter_name}
                    onChange={(e) => update('reporter_name', e.target.value)}
                    placeholder="Nama lengkap"
                    className="input pl-9"
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
                    onChange={(e) => update('reporter_email', e.target.value)}
                    placeholder="email@sekolah.id"
                    className="input pl-9"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Unit/Kelas <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.reporter_unit}
                  onChange={(e) => update('reporter_unit', e.target.value)}
                  placeholder="Contoh: XII IPA 1"
                  className="input"
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
                    onChange={(e) => update('reporter_phone', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="input pl-9"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Nama Barang/Item <span className="text-red-500">*</span></label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Nama barang yang rusak"
                  className="input pl-9"
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
                  onChange={(e) => update('location', e.target.value)}
                  placeholder="Lokasi barang"
                  className="input pl-9"
                  required
                />
              </div>
            </div>

            {/* Severity radio cards */}
            <div>
              <label className="label">Tingkat Keparahan <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {severityOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'cursor-pointer rounded-2xl border-2 p-4 text-center transition-all',
                      form.severity === opt.value
                        ? cn(opt.border, 'bg-slate-50 dark:bg-slate-800')
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={opt.value}
                      checked={form.severity === opt.value}
                      onChange={(e) => update('severity', e.target.value)}
                      className="sr-only"
                    />
                    <AlertTriangle className={cn('w-6 h-6 mx-auto mb-1.5', opt.classes)} />
                    <span className={cn('text-sm font-medium', opt.classes)}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">URL Foto (opsional)</label>
              <input
                type="text"
                value={form.image_url}
                onChange={(e) => update('image_url', e.target.value)}
                placeholder="https://..."
                className="input"
              />
              <p className="text-xs text-slate-400 mt-1">Tempel tautan foto kerusakan jika ada.</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60"
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

        {/* Recent Reports */}
        {!success && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Laporan Terakhir Anda
            </h2>
            {!form.reporter_email ? (
              <div className="card p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                Isi email pada formulir di atas untuk melihat riwayat laporan Anda.
              </div>
            ) : loadingReports ? (
              <div className="card p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
              </div>
            ) : reports.length === 0 ? (
              <div className="card p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                Belum ada laporan dari Anda.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {r.location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDateTime(r.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', severityBadge[r.severity].classes)}>
                          {severityBadge[r.severity].label}
                        </span>
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusBadge[r.status].classes)}>
                          {statusBadge[r.status].label}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

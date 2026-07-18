import { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  Save,
  RotateCcw,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  MapPin,
  User,
  Mail,
  Phone,
  Package,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { uploadFileToDrive } from '../lib/upload';
import { cn } from '../utils/cn';

interface ReportForm {
  reporter_name: string;
  reporter_email: string;
  reporter_unit: string;
  reporter_phone: string;
  description: string;
  location: string;
  severity: 'minor' | 'moderate' | 'severe' | '';
  image_url: string | null;
}

interface DamageReport {
  id: string;
  reporter_name: string;
  reporter_email: string | null;
  reporter_unit: string | null;
  reporter_phone: string | null;
  description: string;
  location: string | null;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  image_url: string | null;
  created_at: string;
}

const severityOptions = [
  { value: 'minor', label: 'Ringan', color: 'green', desc: 'Kerusakan ringan' },
  { value: 'moderate', label: 'Sedang', color: 'amber', desc: 'Kerusakan sedang' },
  { value: 'severe', label: 'Berat', color: 'red', desc: 'Kerusakan berat' },
] as const;

const severityBadge: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

function emptyForm(): ReportForm {
  return {
    reporter_name: '',
    reporter_email: '',
    reporter_unit: '',
    reporter_phone: '',
    description: '',
    location: '',
    severity: '',
    image_url: null,
  };
}

export default function ReportPage() {
  const [form, setForm] = useState<ReportForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<ReportForm | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof ReportForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const fetchReports = async (email: string) => {
    if (!email.trim()) return;
    setReportsLoading(true);
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, status, image_url, created_at')
        .eq('reporter_email', email.trim())
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setReports((data as unknown as DamageReport[]) ?? []);
    } catch {
      /* noop */
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (form.reporter_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) {
      const t = setTimeout(() => fetchReports(form.reporter_email), 500);
      return () => clearTimeout(t);
    }
  }, [form.reporter_email]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFileToDrive(file);
    setUploading(false);
    if (!result) {
      showToast('Gagal mengunggah foto', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    update('image_url', result.url);
    showToast('Foto terunggah', 'success');
  };

  const handleRemovePhoto = () => {
    setForm((f) => ({ ...f, image_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): string | null => {
    if (!form.reporter_name.trim()) return 'Nama pelapor wajib diisi';
    if (!form.reporter_email.trim()) return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) return 'Format email tidak valid';
    if (!form.reporter_unit.trim()) return 'Unit/Kelas wajib diisi';
    if (!form.description.trim()) return 'Nama barang/item wajib diisi';
    if (!form.location.trim()) return 'Lokasi wajib diisi';
    if (!form.severity) return 'Pilih tingkat keparahan';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      showToast(err, 'error');
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
        image_url: form.image_url,
        status: 'pending' as const,
      };
      const { error } = await supabase.from('damage_reports').insert(payload);
      if (error) throw error;
      showToast('Laporan kerusakan berhasil dikirim', 'success');
      setSuccess({ ...form });
      setForm(emptyForm());
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchReports(form.reporter_email);
    } catch {
      showToast('Gagal mengirim laporan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  if (success) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <AnimatedBackground />
        <main className="relative mx-auto max-w-2xl px-4 py-12">
          <div className="card text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Terkirim!</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Laporan kerusakan Anda telah berhasil dikirim dan akan ditindaklanjuti.
            </p>
            <div className="mt-6 space-y-2 text-left">
              <SummaryRow label="Pelapor" value={success.reporter_name} />
              <SummaryRow label="Email" value={success.reporter_email} />
              <SummaryRow label="Unit/Kelas" value={success.reporter_unit} />
              <SummaryRow label="Barang/Item" value={success.description} />
              <SummaryRow label="Lokasi" value={success.location} />
              <SummaryRow label="Keparahan" value={severityOptions.find((s) => s.value === success.severity)?.label ?? success.severity} />
            </div>
            <button onClick={() => setSuccess(null)} className="btn-primary mt-6">
              <RotateCcw className="h-4 w-4" />
              Buat Laporan Lain
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <AnimatedBackground />
      <main className="relative mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <AlertCircle className="h-7 w-7 text-brand-600" />
            Laporan Kerusakan
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Laporkan kerusakan sarana atau prasarana sekolah.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Reporter Info */}
          <fieldset className="card">
            <legend className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Data Pelapor</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nama Pelapor <span className="text-red-500">*</span></label>
                <input className="input" placeholder="Nama lengkap" value={form.reporter_name} onChange={(e) => update('reporter_name', e.target.value)} required />
              </div>
              <div>
                <label className="label">Email Pelapor <span className="text-red-500">*</span></label>
                <input type="email" className="input" placeholder="email@sekolah.sch.id" value={form.reporter_email} onChange={(e) => update('reporter_email', e.target.value)} required />
              </div>
              <div>
                <label className="label">Unit/Kelas <span className="text-red-500">*</span></label>
                <input className="input" placeholder="Contoh: XII RPL 1, TU" value={form.reporter_unit} onChange={(e) => update('reporter_unit', e.target.value)} required />
              </div>
              <div>
                <label className="label">No. Telepon <span className="text-slate-400">(opsional)</span></label>
                <input className="input" placeholder="08xx..." value={form.reporter_phone} onChange={(e) => update('reporter_phone', e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* Damage Info */}
          <fieldset className="card">
            <legend className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Detail Kerusakan</legend>
            <div className="space-y-4">
              <div>
                <label className="label">Nama Barang/Item <span className="text-red-500">*</span></label>
                <input className="input" placeholder="Contoh: Proyektor Lab Komputer 1" value={form.description} onChange={(e) => update('description', e.target.value)} required />
              </div>
              <div>
                <label className="label">Lokasi <span className="text-red-500">*</span></label>
                <input className="input" placeholder="Contoh: Lab Komputer Lt. 2" value={form.location} onChange={(e) => update('location', e.target.value)} required />
              </div>
              <div>
                <label className="label">Tingkat Keparahan <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-3">
                  {severityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('severity', opt.value)}
                      className={cn(
                        'rounded-xl border-2 p-3 text-center transition',
                        form.severity === opt.value
                          ? opt.color === 'green'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                            : opt.color === 'amber'
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/30'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
                      )}
                    >
                      <span
                        className={cn(
                          'mb-1 inline-block h-3 w-3 rounded-full',
                          opt.color === 'green' ? 'bg-emerald-500' : opt.color === 'amber' ? 'bg-amber-500' : 'bg-red-500',
                        )}
                      />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{opt.label}</p>
                      <p className="text-xs text-slate-400">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Photo Upload */}
          <fieldset className="card">
            <legend className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Foto Kerusakan</legend>
            {form.image_url ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={form.image_url}
                    alt="Foto kerusakan"
                    className="h-20 w-20 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                  />
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Foto terunggah
                    </p>
                    <button type="button" onClick={handleRemovePhoto} className="mt-1 flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus Foto
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Foto
                    </>
                  )}
                </button>
                <p className="mt-2 text-xs text-slate-400">Format: JPG, PNG. Maksimal sesuai batas server.</p>
              </div>
            )}
          </fieldset>

          {/* Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Kirim Laporan
                </>
              )}
            </button>
            <button type="button" onClick={handleReset} className="btn-secondary" disabled={submitting}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </form>

        {/* Recent Reports */}
        {form.reporter_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email) && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Laporan Terbaru Anda</h2>
            {reportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              </div>
            ) : reports.length === 0 ? (
              <EmptyState title="Belum ada laporan" description="Laporan Anda akan muncul di sini." />
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                      <div className="flex gap-1.5">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', severityBadge[r.severity])}>
                          {severityOptions.find((s) => s.value === r.severity)?.label ?? r.severity}
                        </span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusBadge[r.status])}>
                          {statusLabel[r.status] ?? r.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.location}</span>
                      <span>{formatDate(r.created_at)}</span>
                      {r.image_url && (
                        <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Lihat Foto
                        </a>
                      )}
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import {
  Wrench,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
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

const severityOptions: { value: 'minor' | 'moderate' | 'severe'; label: string; desc: string; color: string; ring: string }[] = [
  { value: 'minor', label: 'Ringan', desc: 'Kerusakan kecil, masih bisa berfungsi', color: 'text-emerald-600 dark:text-emerald-400', ring: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  { value: 'moderate', label: 'Sedang', desc: 'Kerusakan cukup, perlu perbaikan', color: 'text-amber-600 dark:text-amber-400', ring: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  { value: 'severe', label: 'Berat', desc: 'Kerusakan parah, tidak bisa dipakai', color: 'text-red-600 dark:text-red-400', ring: 'border-red-500 bg-red-50 dark:bg-red-900/20' },
];

const severityBadge: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const severityLabel: Record<string, string> = {
  minor: 'Ringan',
  moderate: 'Sedang',
  severe: 'Berat',
};

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Sedang Diproses',
  resolved: 'Selesai',
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
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ReportPage() {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReports = async (email?: string) => {
    const emailToUse = email ?? form.reporter_email;
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
      setReports((data as unknown as DamageReport[]) || []);
    } catch {
      // ignore
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    return (
      form.reporter_name.trim() &&
      form.reporter_email.trim() &&
      form.reporter_unit.trim() &&
      form.description.trim() &&
      form.location.trim() &&
      /^\S+@\S+\.\S+$/.test(form.reporter_email)
    );
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      showToast('Mohon lengkapi semua field yang wajib diisi', 'warning');
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

      const newReport = data as unknown as DamageReport;
      setSubmitted(newReport);
      setReports((prev) => [newReport, ...prev]);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
    } catch (err) {
      showToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setSubmitted(null);
  };

  const inputClass = 'w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Laporan Kerusakan</h1>
          <p className="text-slate-500 dark:text-slate-400">Laporkan kerusakan sarana atau prasarana</p>
        </div>

        {submitted ? (
          /* Success State */
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Laporan Anda telah berhasil dikirim dan akan ditindaklanjuti oleh tim sarana prasarana.</p>

            <div className="text-left bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Nama Barang</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{submitted.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Lokasi</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{submitted.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Tingkat Keparahan</p>
                  <span className={cn('inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium', severityBadge[submitted.severity])}>
                    {severityLabel[submitted.severity]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Waktu Lapor</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(submitted.created_at)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            {/* Reporter Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Pelapor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={form.reporter_name}
                  onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email Pelapor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={form.reporter_email}
                  onChange={(e) => setForm({ ...form, reporter_email: e.target.value })}
                  onBlur={() => fetchReports()}
                  placeholder="email@sekolah.sch.id"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Unit & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Unit/Kelas <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={form.reporter_unit}
                    onChange={(e) => setForm({ ...form, reporter_unit: e.target.value })}
                    placeholder="Contoh: XII IPA 1"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  No. Telepon <span className="text-slate-400 text-xs">(opsional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={form.reporter_phone}
                    onChange={(e) => setForm({ ...form, reporter_phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Barang/Item <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Contoh: Proyektor ruang kelas"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Lokasi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Contoh: Ruang Kelas XII IPA 1"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tingkat Keparahan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {severityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, severity: opt.value })}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      form.severity === opt.value
                        ? opt.ring
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <div className={cn('font-semibold mb-0.5', opt.color)}>{opt.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</div>
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
                <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5" />
                  Kirim Laporan
                </>
              )}
            </button>
          </form>
        )}

        {/* Recent Reports */}
        {!submitted && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Laporan Terakhir Anda</h2>
            {loadingReports ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <EmptyState
                  icon={Wrench}
                  title="Belum ada laporan"
                  description="Laporan yang Anda buat akan muncul di sini"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', severityBadge[r.severity])}>
                          {severityLabel[r.severity]}
                        </span>
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', statusBadge[r.status])}>
                          {statusLabel[r.status]}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{r.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{formatDate(r.created_at)}</span>
                      </div>
                    </div>
                    {r.resolution_notes && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          <span className="font-medium">Tanggapan: </span>{r.resolution_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

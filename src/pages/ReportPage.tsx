import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Loader2,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  MapPin,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadFileToDrive } from '../lib/upload';
import { showToast } from '../components/Toast';
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
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

const severityOptions = [
  { value: 'minor', label: 'Ringan', desc: 'Kerusakan kecil, tidak mengganggu', color: 'emerald', icon: CheckCircle2 },
  { value: 'moderate', label: 'Sedang', desc: 'Perlu perbaikan segera', color: 'amber', icon: AlertTriangle },
  { value: 'severe', label: 'Berat', desc: 'Tidak dapat digunakan', color: 'red', icon: AlertTriangle },
] as const;

const severityBadge: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  in_progress: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const statusLabel: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

const severityLabel: Record<string, string> = {
  minor: 'Ringan',
  moderate: 'Sedang',
  severe: 'Berat',
};

export default function ReportPage() {
  const [form, setForm] = useState({
    reporter_name: '',
    reporter_email: '',
    reporter_unit: '',
    reporter_phone: '',
    description: '',
    location: '',
    severity: 'minor' as 'minor' | 'moderate' | 'severe',
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedReport, setSavedReport] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReports = useCallback(async (email?: string) => {
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
      if (!error) {
        setReports((data as unknown as DamageReport[]) ?? []);
      }
    } finally {
      setLoadingReports(false);
    }
  }, [form.reporter_email]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar', 'error');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFileToDrive(file);
      if (result) {
        setImageUrl(result.url);
        setFileName(file.name);
        showToast('Foto berhasil diunggah', 'success');
      } else {
        showToast('Gagal mengunggah foto', 'error');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setImageUrl(null);
    setFileName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.reporter_name || !form.reporter_email || !form.reporter_unit || !form.description || !form.location) {
      showToast('Mohon lengkapi semua field wajib', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reporter_name: form.reporter_name,
        reporter_email: form.reporter_email,
        reporter_unit: form.reporter_unit,
        reporter_phone: form.reporter_phone || null,
        description: form.description,
        location: form.location,
        severity: form.severity,
        image_url: imageUrl,
        status: 'pending' as const,
      };

      const { data, error } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        showToast('Gagal mengirim laporan: ' + error.message, 'error');
        return;
      }

      const report = data as unknown as DamageReport;
      setSavedReport(report);
      setSuccess(true);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');

      // Refresh reports list
      setReports((prev) => [report, ...prev]);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      reporter_name: '',
      reporter_email: '',
      reporter_unit: '',
      reporter_phone: '',
      description: '',
      location: '',
      severity: 'minor',
    });
    setImageUrl(null);
    setFileName(null);
    setSuccess(false);
    setSavedReport(null);
  };

  if (success && savedReport) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center dark:border-emerald-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Terkirim</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Laporan kerusakan Anda telah berhasil dikirim. Tim akan meninjau dan menindaklanjuti laporan ini.
          </p>

          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Pelapor</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedReport.reporter_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Barang/Item</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedReport.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedReport.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Keparahan</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', severityBadge[savedReport.severity])}>
                {severityLabel[savedReport.severity]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusBadge[savedReport.status])}>
                {statusLabel[savedReport.status]}
              </span>
            </div>
          </div>

          <button
            onClick={resetForm}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RotateCcw className="h-4 w-4" />
            Buat Laporan Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
          <FileText className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          Laporan Kerusakan
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Laporkan kerusakan sarana dan prasarana sekolah dengan melampirkan foto.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Informasi Pelapor</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nama Pelapor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.reporter_name}
                onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.reporter_email}
                onChange={(e) => setForm({ ...form, reporter_email: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Unit/Kelas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.reporter_unit}
                onChange={(e) => setForm({ ...form, reporter_unit: e.target.value })}
                placeholder="Contoh: XII RPL 1"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                No. Telepon <span className="text-slate-400">(opsional)</span>
              </label>
              <input
                type="text"
                value={form.reporter_phone}
                onChange={(e) => setForm({ ...form, reporter_phone: e.target.value })}
                placeholder="08xx-xxxx-xxxx"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Detail Kerusakan</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nama Barang/Item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Contoh: Proyektor Ruang Kelas XII"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Lokasi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Contoh: Ruang Kelas XII RPL 1"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tingkat Keparahan <span className="text-red-500">*</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {severityOptions.map((opt) => {
                  const selected = form.severity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, severity: opt.value })}
                      className={cn(
                        'flex flex-col items-start rounded-xl border-2 p-3 text-left transition',
                        selected
                          ? opt.color === 'emerald'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : opt.color === 'amber'
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <opt.icon
                          className={cn(
                            'h-5 w-5',
                            opt.color === 'emerald' ? 'text-emerald-600' : opt.color === 'amber' ? 'text-amber-600' : 'text-red-600',
                          )}
                        />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{opt.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Foto Kerusakan</h2>
          {imageUrl ? (
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <img src={imageUrl} alt="Foto kerusakan" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Foto terunggah
                </div>
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{fileName}</p>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Hapus Foto
                </button>
              </div>
            </div>
          ) : (
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center transition hover:border-brand-500 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-500 dark:hover:bg-brand-900/20',
                uploading && 'pointer-events-none opacity-60',
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Mengunggah foto...</p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                    <Upload className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Klik untuk upload foto
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Format: JPG, PNG (maks. 5MB)</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Kirim Laporan
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Recent Reports */}
      {form.reporter_email && (
        <div className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Clock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            Laporan Terakhir Anda
          </h2>
          {loadingReports ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : reports.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Belum ada laporan dari Anda.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{report.description}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {report.location}
                        </span>
                        <span>•</span>
                        <span>{new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', severityBadge[report.severity])}>
                        {severityLabel[report.severity]}
                      </span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', statusBadge[report.status])}>
                        {statusLabel[report.status]}
                      </span>
                    </div>
                  </div>
                  {report.image_url && (
                    <a
                      href={report.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Lihat Foto
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  Send,
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle2,
  Plus,
  AlertTriangle,
  FileText,
  ExternalLink,
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
}

const severityOptions = [
  { value: 'minor', label: 'Ringan', desc: 'Kerusakan kecil, masih bisa digunakan', color: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'moderate', label: 'Sedang', desc: 'Kerusakan sedang, perlu perbaikan', color: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'severe', label: 'Berat', desc: 'Kerusakan parah, tidak bisa digunakan', color: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300' },
];

const severityBadge: Record<string, { badge: string; label: string }> = {
  minor: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Ringan' },
  moderate: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Sedang' },
  severe: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Berat' },
};

const statusBadge: Record<string, { badge: string; label: string }> = {
  pending: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Menunggu' },
  in_progress: { badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300', label: 'Diproses' },
  resolved: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Selesai' },
};

interface FormState {
  reporter_name: string;
  reporter_email: string;
  reporter_unit: string;
  reporter_phone: string;
  description: string;
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  image_url: string | null;
}

const emptyForm: FormState = {
  reporter_name: '',
  reporter_email: '',
  reporter_unit: '',
  reporter_phone: '',
  description: '',
  location: '',
  severity: 'minor',
  image_url: null,
};

export default function ReportPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReports = useCallback(async (email?: string) => {
    const emailToUse = email ?? form.reporter_email;
    if (!emailToUse) {
      setLoadingReports(false);
      return;
    }
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, status, image_url, resolution_notes, created_at')
        .eq('reporter_email', emailToUse)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports((data as unknown as DamageReport[]) ?? []);
    } catch {
      /* noop */
    } finally {
      setLoadingReports(false);
    }
  }, [form.reporter_email]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFileToDrive(file);
    setUploading(false);
    if (result) {
      update('image_url', result.url);
      showToast('Foto berhasil diunggah', 'success');
    } else {
      showToast('Gagal mengunggah foto', 'error');
    }
    e.target.value = '';
  }

  function removePhoto() {
    update('image_url', null);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.reporter_name.trim()) e.reporter_name = 'Nama pelapor wajib diisi';
    if (!form.reporter_email.trim()) e.reporter_email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) e.reporter_email = 'Format email tidak valid';
    if (!form.reporter_unit.trim()) e.reporter_unit = 'Unit/Kelas wajib diisi';
    if (!form.description.trim()) e.description = 'Nama barang/item wajib diisi';
    if (!form.location.trim()) e.location = 'Lokasi wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
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
        image_url: form.image_url,
        status: 'pending' as const,
      };
      const { error } = await supabase.from('damage_reports').insert(payload);
      if (error) throw error;
      showToast('Laporan kerusakan berhasil dikirim', 'success');
      setSuccess({ ...form });
      fetchReports(form.reporter_email);
      setForm(emptyForm);
    } catch (err: any) {
      showToast(err?.message ?? 'Gagal mengirim laporan', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Terkirim!</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Laporan kerusakan Anda telah berhasil dikirim dan akan ditindaklanjuti oleh tim sarpras.
          </p>
          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left dark:bg-slate-800/50">
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Pelapor</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.reporter_name} ({success.reporter_unit})</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Barang/Item</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.description}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.location}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Keparahan</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', severityBadge[success.severity].badge)}>
                {severityBadge[success.severity].label}
              </span>
            </div>
          </div>
          <button onClick={() => setSuccess(null)} className="btn-primary mt-6">
            <Plus className="h-4 w-4" />
            Buat Laporan Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Laporkan kerusakan sarana atau prasarana sekolah. Tim sarpras akan menindaklanjuti laporan Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Data Pelapor</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nama Pelapor <span className="text-red-500">*</span></label>
              <input className={cn('input', errors.reporter_name && 'border-red-500')} value={form.reporter_name} onChange={(e) => update('reporter_name', e.target.value)} placeholder="Nama lengkap" />
              {errors.reporter_name && <p className="mt-1 text-xs text-red-500">{errors.reporter_name}</p>}
            </div>
            <div>
              <label className="label">Email Pelapor <span className="text-red-500">*</span></label>
              <input type="email" className={cn('input', errors.reporter_email && 'border-red-500')} value={form.reporter_email} onChange={(e) => update('reporter_email', e.target.value)} placeholder="email@sekolah.sch.id" />
              {errors.reporter_email && <p className="mt-1 text-xs text-red-500">{errors.reporter_email}</p>}
            </div>
            <div>
              <label className="label">Unit/Kelas <span className="text-red-500">*</span></label>
              <input className={cn('input', errors.reporter_unit && 'border-red-500')} value={form.reporter_unit} onChange={(e) => update('reporter_unit', e.target.value)} placeholder="Contoh: XII RPL 1" />
              {errors.reporter_unit && <p className="mt-1 text-xs text-red-500">{errors.reporter_unit}</p>}
            </div>
            <div>
              <label className="label">No. Telepon (Opsional)</label>
              <input className="input" value={form.reporter_phone} onChange={(e) => update('reporter_phone', e.target.value)} placeholder="08xx-xxxx-xxxx" />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Detail Kerusakan</h2>
          <div className="grid gap-4">
            <div>
              <label className="label">Nama Barang/Item <span className="text-red-500">*</span></label>
              <input className={cn('input', errors.description && 'border-red-500')} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Contoh: Proyektor Ruang Kelas 12" />
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
            </div>
            <div>
              <label className="label">Lokasi <span className="text-red-500">*</span></label>
              <input className={cn('input', errors.location && 'border-red-500')} value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Contoh: Ruang Kelas 12 RPL" />
              {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
            </div>
            <div>
              <label className="label">Tingkat Keparahan <span className="text-red-500">*</span></label>
              <div className="grid gap-3 sm:grid-cols-3">
                {severityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('severity', opt.value as any)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-left transition',
                      form.severity === opt.value
                        ? opt.color
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-semibold">{opt.label}</span>
                    </div>
                    <p className="mt-1 text-xs opacity-80">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Upload Foto</h2>
          {!form.image_url ? (
            <div>
              <label className="btn-secondary cursor-pointer">
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
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
              <p className="mt-2 text-xs text-slate-400">Unggah foto kerusakan (opsional). Format: JPG, PNG, dll.</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                <img src={form.image_url} alt="Foto kerusakan" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Foto terunggah
                </p>
                <button type="button" onClick={removePhoto} className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600 hover:underline">
                  <X className="h-3.5 w-3.5" />
                  Hapus Foto
                </button>
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengirim...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Kirim Laporan
            </>
          )}
        </button>
      </form>

      {/* Recent Reports */}
      {form.reporter_email && (
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            Laporan Terakhir Anda
          </h2>
          {loadingReports ? (
            <div className="card animate-pulse">
              <div className="h-5 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : reports.length === 0 ? (
            <div className="card text-center text-sm text-slate-400">Belum ada laporan dari email ini.</div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const sev = severityBadge[r.severity] ?? severityBadge.minor;
                const st = statusBadge[r.status] ?? statusBadge.pending;
                return (
                  <div key={r.id} className="card">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                      <div className="flex gap-1.5">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', sev.badge)}>{sev.label}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', st.badge)}>{st.label}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>📍 {r.location}</span>
                      <span>🕐 {new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    {r.image_url && (
                      <a href={r.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Lihat Foto
                      </a>
                    )}
                    {r.resolution_notes && (
                      <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Resolusi: {r.resolution_notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

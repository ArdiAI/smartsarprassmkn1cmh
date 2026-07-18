import { useEffect, useState, type FormEvent } from 'react';
import {
  PackageOpen,
  Loader2,
  Upload,
  X,
  CheckCircle2,
  Image as ImageIcon,
  AlertTriangle,
  MapPin,
  Calendar,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadFileToDrive } from '../lib/upload';
import { showToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { cn } from '../utils/cn';

interface DamageReport {
  id: string;
  reporter_name: string;
  reporter_email: string;
  reporter_unit: string;
  reporter_phone: string | null;
  description: string;
  location: string | null;
  severity: 'minor' | 'moderate' | 'severe' | null;
  status: 'pending' | 'in_progress' | 'resolved' | null;
  image_url: string | null;
  created_at: string;
}

const severityOptions = [
  { value: 'minor', label: 'Ringan', color: 'emerald', desc: 'Kerusakan kecil, masih bisa digunakan' },
  { value: 'moderate', label: 'Sedang', color: 'amber', desc: 'Kerusakan menengah, perlu perbaikan' },
  { value: 'severe', label: 'Berat', color: 'red', desc: 'Kerusakan parah, tidak bisa digunakan' },
] as const;

const severityBadgeStyles: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const severityLabels: Record<string, string> = {
  minor: 'Ringan',
  moderate: 'Sedang',
  severe: 'Berat',
};

const statusBadgeStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  resolved: 'Selesai',
};

const severityCardStyles: Record<string, { ring: string; bg: string; text: string; dot: string }> = {
  minor: { ring: 'ring-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  moderate: { ring: 'ring-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  severe: { ring: 'ring-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
};

const emptyForm = {
  reporter_name: '',
  reporter_email: '',
  reporter_unit: '',
  reporter_phone: '',
  description: '',
  location: '',
  severity: '' as '' | 'minor' | 'moderate' | 'severe',
  image_url: '',
  image_name: '',
};

export default function ReportPage() {
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const update = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const fetchReports = async (email: string | null) => {
    if (!email) {
      setReports([]);
      setLoadingReports(false);
      return;
    }
    setLoadingReports(true);
    try {
      const { data } = await supabase
        .from('damage_reports')
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, status, image_url, created_at')
        .eq('reporter_email', email)
        .order('created_at', { ascending: false })
        .limit(10);
      setReports((data as unknown as DamageReport[]) ?? []);
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports(form.reporter_email || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar', 'error');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFileToDrive(file);
      if (!result) {
        showToast('Gagal mengunggah foto', 'error');
        return;
      }
      update('image_url', result.url);
      update('image_name', file.name);
      showToast('Foto terunggah', 'success');
    } catch {
      showToast('Gagal mengunggah foto', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = () => {
    update('image_url', '');
    update('image_name', '');
  };

  const reset = () => setForm({ ...emptyForm });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.reporter_name || !form.reporter_email || !form.reporter_unit || !form.description || !form.location || !form.severity) {
      showToast('Mohon lengkapi semua field wajib', 'error');
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
        image_url: form.image_url || null,
        status: 'pending',
      };
      const { data, error } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, status, image_url, created_at')
        .single();
      if (error) {
        showToast('Gagal menyimpan laporan: ' + error.message, 'error');
        return;
      }
      showToast('Laporan kerusakan berhasil dikirim', 'success');
      const saved = data as unknown as DamageReport;
      setSuccess(saved);
      fetchReports(form.reporter_email);
      reset();
    } catch (err) {
      showToast('Terjadi kesalahan saat menyimpan laporan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Terkirim</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Laporan kerusakan Anda telah berhasil dikirim dan akan ditindaklanjuti.
          </p>
          <div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Pelapor</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.reporter_name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Unit/Kelas</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.reporter_unit}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Barang</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.description}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.location}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Keparahan</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', severityBadgeStyles[success.severity ?? 'minor'])}>
                {severityLabels[success.severity ?? 'minor']}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusBadgeStyles[success.status ?? 'pending'])}>
                {statusLabels[success.status ?? 'pending']}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="btn-primary mt-6"
          >
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
        <div className="mb-2 flex items-center gap-2">
          <PackageOpen className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporkan Kerusakan</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Laporkan kerusakan barang atau fasilitas sekolah.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Reporter info */}
        <fieldset className="card">
          <legend className="mb-4 px-1 text-base font-semibold text-slate-900 dark:text-white">Data Pelapor</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nama Pelapor <span className="text-red-500">*</span></label>
              <input className="input" type="text" value={form.reporter_name} onChange={(e) => update('reporter_name', e.target.value)} required />
            </div>
            <div>
              <label className="label">Email Pelapor <span className="text-red-500">*</span></label>
              <input className="input" type="email" value={form.reporter_email} onChange={(e) => update('reporter_email', e.target.value)} required />
            </div>
            <div>
              <label className="label">Unit / Kelas <span className="text-red-500">*</span></label>
              <input className="input" type="text" value={form.reporter_unit} onChange={(e) => update('reporter_unit', e.target.value)} required />
            </div>
            <div>
              <label className="label">No. Telepon <span className="text-slate-400 font-normal">(opsional)</span></label>
              <input className="input" type="text" value={form.reporter_phone} onChange={(e) => update('reporter_phone', e.target.value)} />
            </div>
          </div>
        </fieldset>

        {/* Damage info */}
        <fieldset className="card">
          <legend className="mb-4 px-1 text-base font-semibold text-slate-900 dark:text-white">Detail Kerusakan</legend>
          <div className="grid gap-4">
            <div>
              <label className="label">Nama Barang / Item <span className="text-red-500">*</span></label>
              <input className="input" type="text" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Contoh: Proyektor Ruang Lab 1" required />
            </div>
            <div>
              <label className="label">Lokasi <span className="text-red-500">*</span></label>
              <input className="input" type="text" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Contoh: Lab Komputer 1" required />
            </div>
            <div>
              <label className="label">Tingkat Keparahan <span className="text-red-500">*</span></label>
              <div className="grid gap-3 sm:grid-cols-3">
                {severityOptions.map((opt) => {
                  const s = severityCardStyles[opt.value];
                  const selected = form.severity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('severity', opt.value)}
                      className={cn(
                        'rounded-xl border-2 p-3 text-left transition',
                        selected
                          ? cn('ring-2', s.ring, s.bg, 'border-transparent')
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', s.dot)} />
                        <span className={cn('text-sm font-bold', selected ? s.text : 'text-slate-700 dark:text-slate-200')}>{opt.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Photo upload */}
        <fieldset className="card">
          <legend className="mb-4 px-1 text-base font-semibold text-slate-900 dark:text-white">Upload Foto</legend>
          {form.image_url ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Foto terunggah
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{form.image_name}</p>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <X className="h-4 w-4" />
                  Hapus Foto
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="photo"
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  uploading && 'pointer-events-none opacity-70',
                )}
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
              </label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
                disabled={uploading}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Format gambar (JPG, PNG). Foto akan diunggah ke Google Drive.
              </p>
            </div>
          )}
        </fieldset>

        <button type="submit" className="btn-primary w-full" disabled={submitting || uploading}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengirim...
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              Kirim Laporan
            </>
          )}
        </button>
      </form>

      {/* Recent reports */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Laporan Terbaru Anda</h2>
        {loadingReports ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            title="Belum ada laporan"
            description="Laporan kerusakan yang Anda buat akan muncul di sini."
            icon={<PackageOpen className="h-8 w-8 text-slate-400" />}
          />
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="card">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{r.description}</h3>
                  <div className="flex gap-1.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', severityBadgeStyles[r.severity ?? 'minor'])}>
                      {severityLabels[r.severity ?? 'minor']}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusBadgeStyles[r.status ?? 'pending'])}>
                      {statusLabels[r.status ?? 'pending']}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                  {r.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {r.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {r.image_url && (
                    <a
                      href={r.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
                    >
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
    </div>
  );
}

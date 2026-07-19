import { useEffect, useState } from 'react';
import {
  Flag, Loader2, Upload, X, CheckCircle2, Image as ImageIcon, AlertCircle, RotateCcw, MapPin, Calendar,
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
  created_at: string;
}

const severityOptions = [
  { value: 'minor', label: 'Ringan', color: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { value: 'moderate', label: 'Sedang', color: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300', dot: 'bg-amber-500' },
  { value: 'severe', label: 'Berat', color: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' },
] as const;

const severityBadge: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  severe: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};
const severityLabel: Record<string, string> = { minor: 'Ringan', moderate: 'Sedang', severe: 'Berat' };

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  in_progress: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};
const statusLabel: Record<string, string> = { pending: 'Menunggu', in_progress: 'Diproses', resolved: 'Selesai' };

const emptyForm = {
  reporter_name: '', reporter_email: '', reporter_unit: '', reporter_phone: '',
  description: '', location: '', severity: '' as '' | 'minor' | 'moderate' | 'severe',
};

export default function ReportPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadReports = async (email?: string) => {
    const em = email ?? form.reporter_email;
    if (!em) { setLoadingReports(false); return; }
    setLoadingReports(true);
    try {
      const { data } = await supabase
        .from('damage_reports')
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, status, image_url, created_at')
        .eq('reporter_email', em)
        .order('created_at', { ascending: false })
        .limit(10);
      setReports((data as unknown as DamageReport[]) ?? []);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => { loadReports(); /* eslint-disable-next-line */ }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFileToDrive(file, file.name);
    setUploading(false);
    if (result) {
      setImageUrl(result.url);
      showToast('Foto terunggah', 'success');
    } else {
      showToast('Gagal mengunggah foto', 'error');
    }
    e.target.value = '';
  };

  const removePhoto = () => setImageUrl(null);

  const validate = (): string | null => {
    if (!form.reporter_name.trim()) return 'Nama pelapor wajib diisi';
    if (!form.reporter_email.trim()) return 'Email wajib diisi';
    if (!form.reporter_unit.trim()) return 'Unit/Kelas wajib diisi';
    if (!form.description.trim()) return 'Nama barang/item wajib diisi';
    if (!form.location.trim()) return 'Lokasi wajib diisi';
    if (!form.severity) return 'Tingkat keparahan wajib dipilih';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { showToast(err, 'error'); return; }
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
        image_url: imageUrl,
        status: 'pending',
      };
      const { data, error } = await supabase.from('damage_reports').insert(payload).select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, status, image_url, created_at').single();
      if (error) throw error;
      const report = data as unknown as DamageReport;
      setSuccess(report);
      setReports((prev) => [report, ...prev]);
      showToast('Laporan kerusakan berhasil dikirim', 'success');
    } catch {
      showToast('Gagal mengirim laporan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setImageUrl(null);
    setSuccess(null);
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Terkirim</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Laporan kerusakan Anda telah dicatat dan akan ditindaklanjuti.</p>
          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
            <div className="flex justify-between gap-4"><span className="text-slate-500">Pelapor</span><span className="font-semibold text-slate-900 dark:text-white">{success.reporter_name}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Unit</span><span className="font-semibold text-slate-900 dark:text-white">{success.reporter_unit}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Barang</span><span className="font-semibold text-slate-900 dark:text-white">{success.description}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Lokasi</span><span className="font-semibold text-slate-900 dark:text-white">{success.location}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Keparahan</span><span className="font-semibold text-slate-900 dark:text-white">{severityLabel[success.severity]}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Status</span><span className="font-semibold text-slate-900 dark:text-white">{statusLabel[success.status]}</span></div>
          </div>
          <button onClick={resetForm} className="btn-primary mt-6">
            <RotateCcw className="h-4 w-4" /> Buat Laporan Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Laporkan kerusakan barang atau fasilitas sekolah.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nama Pelapor <span className="text-red-500">*</span></label>
            <input className="input" value={form.reporter_name} onChange={(e) => setF('reporter_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Email Pelapor <span className="text-red-500">*</span></label>
            <input type="email" className="input" value={form.reporter_email} onChange={(e) => setF('reporter_email', e.target.value)} onBlur={(e) => loadReports(e.target.value)} />
          </div>
          <div>
            <label className="label">Unit/Kelas <span className="text-red-500">*</span></label>
            <input className="input" value={form.reporter_unit} onChange={(e) => setF('reporter_unit', e.target.value)} />
          </div>
          <div>
            <label className="label">No. Telepon (opsional)</label>
            <input className="input" value={form.reporter_phone} onChange={(e) => setF('reporter_phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Nama Barang/Item <span className="text-red-500">*</span></label>
            <input className="input" value={form.description} onChange={(e) => setF('description', e.target.value)} placeholder="Mis. Proyektor LCD" />
          </div>
          <div>
            <label className="label">Lokasi <span className="text-red-500">*</span></label>
            <input className="input" value={form.location} onChange={(e) => setF('location', e.target.value)} placeholder="Mis. Lab Komputer 1" />
          </div>
        </div>

        <div>
          <label className="label">Tingkat Keparahan <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-3 gap-3">
            {severityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setF('severity', opt.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition',
                  form.severity === opt.value ? opt.color : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
                )}
              >
                <span className={cn('h-3 w-3 rounded-full', opt.dot)} />
                <span className="text-sm font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Upload Foto (opsional)</label>
          {imageUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <img src={imageUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Foto terunggah
                </p>
                <p className="truncate text-xs text-slate-500">URL: {imageUrl}</p>
              </div>
              <button type="button" onClick={removePhoto} className="btn-secondary shrink-0">
                <X className="h-4 w-4" /> Hapus Foto
              </button>
            </div>
          ) : (
            <label className={cn('btn-secondary cursor-pointer', uploading && 'pointer-events-none opacity-60')}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Mengunggah...' : 'Upload Foto'}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          )}
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting || uploading}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
          {submitting ? 'Mengirim...' : 'Kirim Laporan'}
        </button>
      </form>

      {/* Recent reports */}
      {form.reporter_email && (
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <ImageIcon className="h-5 w-5 text-brand-600" /> Laporan Terakhir Anda
          </h2>
          {loadingReports ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
          ) : reports.length === 0 ? (
            <div className="card text-sm text-slate-500">Belum ada laporan dari email ini.</div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                    <div className="flex gap-2">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', severityBadge[r.severity])}>{severityLabel[r.severity]}</span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', statusBadge[r.status])}>{statusLabel[r.status]}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                    {r.image_url && <a href={r.image_url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">Lihat Foto</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

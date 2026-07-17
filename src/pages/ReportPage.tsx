import { useEffect, useState } from 'react';
import {
  FileText, Send, CheckCircle2, AlertCircle, Plus, Loader2,
  MapPin, Calendar, ShieldAlert, Package, Mail, Phone, User, Link2,
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

const severityOptions: { value: 'minor' | 'moderate' | 'severe'; label: string; desc: string; classes: string; icon: typeof ShieldAlert }[] = [
  { value: 'minor', label: 'Ringan', desc: 'Kerusakan kecil, masih bisa digunakan', classes: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300', icon: ShieldAlert },
  { value: 'moderate', label: 'Sedang', desc: 'Kerusakan menengah, perlu perbaikan', classes: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300', icon: ShieldAlert },
  { value: 'severe', label: 'Berat', desc: 'Kerusakan parah, tidak bisa digunakan', classes: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300', icon: ShieldAlert },
];

const severityBadge: Record<string, { label: string; classes: string }> = {
  minor: { label: 'Ringan', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  moderate: { label: 'Sedang', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  severe: { label: 'Berat', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const statusBadge: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

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
  const [submitted, setSubmitted] = useState<DamageReport | null>(null);
  const [myReports, setMyReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const fetchMyReports = async (email: string) => {
    if (!email) {
      setLoadingReports(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('*')
        .eq('reporter_email', email)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setMyReports((data as unknown as DamageReport[]) || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    // Don't fetch until user types email — avoid empty query
    setLoadingReports(false);
  }, []);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.reporter_name.trim()) e.reporter_name = 'Nama pelapor wajib diisi';
    if (!form.reporter_email.trim()) e.reporter_email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) e.reporter_email = 'Format email tidak valid';
    if (!form.reporter_unit.trim()) e.reporter_unit = 'Unit/Kelas wajib diisi';
    if (!form.description.trim()) e.description = 'Nama barang/item wajib diisi';
    if (!form.location.trim()) e.location = 'Lokasi wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
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
      const report = data as unknown as DamageReport;
      setSubmitted(report);
      setForm(emptyForm);
      setErrors({});
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      // Refresh user's reports
      if (report.reporter_email) fetchMyReports(report.reporter_email);
    } catch (err) {
      console.error('Failed to submit report:', err);
      showToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnother = () => {
    setSubmitted(null);
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const loadMyReports = () => {
    if (form.reporter_email || submitted?.reporter_email) {
      fetchMyReports(form.reporter_email || submitted?.reporter_email || '');
    } else {
      showToast('Masukkan email Anda di form untuk melihat riwayat laporan', 'info');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Laporan Kerusakan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 ml-13">
            Laporkan kerusakan sarana prasarana dengan mengisi form di bawah.
          </p>
        </div>

        {/* Success state */}
        {submitted ? (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Laporan Anda telah berhasil dikirim dan akan ditindaklanjuti oleh tim SARPRAS.
            </p>
            <div className="text-left bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Pelapor</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.reporter_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Unit/Kelas</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.reporter_unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Barang</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.description}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Lokasi</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.location}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Keparahan</span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityBadge[submitted.severity].classes)}>
                  {severityBadge[submitted.severity].label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusBadge[submitted.status].classes)}>
                  {statusBadge[submitted.status].label}
                </span>
              </div>
            </div>
            <button onClick={handleAnother} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            {/* Reporter info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nama Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.reporter_name}
                    onChange={(e) => handleChange('reporter_name', e.target.value)}
                    className={cn('input pl-10', errors.reporter_name && 'border-red-400 dark:border-red-500')}
                    placeholder="Nama lengkap"
                  />
                </div>
                {errors.reporter_name && <p className="text-xs text-red-500 mt-1">{errors.reporter_name}</p>}
              </div>
              <div>
                <label className="label">Email Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.reporter_email}
                    onChange={(e) => handleChange('reporter_email', e.target.value)}
                    onBlur={loadMyReports}
                    className={cn('input pl-10', errors.reporter_email && 'border-red-400 dark:border-red-500')}
                    placeholder="email@contoh.com"
                  />
                </div>
                {errors.reporter_email && <p className="text-xs text-red-500 mt-1">{errors.reporter_email}</p>}
              </div>
              <div>
                <label className="label">Unit/Kelas <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.reporter_unit}
                  onChange={(e) => handleChange('reporter_unit', e.target.value)}
                  className={cn('input', errors.reporter_unit && 'border-red-400 dark:border-red-500')}
                  placeholder="Contoh: XII IPA 1"
                />
                {errors.reporter_unit && <p className="text-xs text-red-500 mt-1">{errors.reporter_unit}</p>}
              </div>
              <div>
                <label className="label">No. Telepon <span className="text-slate-400 text-xs">(opsional)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.reporter_phone}
                    onChange={(e) => handleChange('reporter_phone', e.target.value)}
                    className="input pl-10"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>
            </div>

            {/* Item info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nama Barang/Item <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className={cn('input pl-10', errors.description && 'border-red-400 dark:border-red-500')}
                    placeholder="Contoh: Proyektor ruang kelas"
                  />
                </div>
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
              </div>
              <div>
                <label className="label">Lokasi <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className={cn('input pl-10', errors.location && 'border-red-400 dark:border-red-500')}
                    placeholder="Contoh: Ruang 203"
                  />
                </div>
                {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="label">Tingkat Keparahan <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {severityOptions.map((opt) => {
                  const selected = form.severity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange('severity', opt.value)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        selected ? opt.classes : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <opt.icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{opt.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="label">URL Foto <span className="text-slate-400 text-xs">(opsional)</span></label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  className="input pl-10"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
                ) : (
                  <><Send className="w-4 h-4" /> Kirim Laporan</>
                )}
              </button>
            </div>
          </form>
        )}

        {/* My recent reports */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" /> Laporan Saya Terbaru
          </h2>
          {loadingReports ? (
            <div className="card p-5 animate-pulse space-y-3">
              <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ) : myReports.length === 0 ? (
            <div className="card p-6">
              <EmptyState icon={FileText} title="Belum ada laporan" description="Laporan Anda akan muncul di sini setelah Anda mengirim. Masukkan email yang sama di form." />
            </div>
          ) : (
            <div className="space-y-3">
              {myReports.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-medium text-slate-900 dark:text-white">{r.description}</h3>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityBadge[r.severity].classes)}>
                        {severityBadge[r.severity].label}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusBadge[r.status].classes)}>
                        {statusBadge[r.status].label}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location}</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  {r.resolution_notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <span className="font-medium">Tindak lanjut: </span>{r.resolution_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

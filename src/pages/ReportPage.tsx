import { useState, useEffect } from 'react';
import {
  FileText, Send, Loader2, CheckCircle, AlertTriangle,
  MapPin, Calendar, RefreshCw, Image as ImageIcon, Mail, Phone, User, Package
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string;
  description: string;
  image_url: string;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  resolution_notes: string;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string;
  reporter_email: string;
  reporter_phone: string;
  location: string;
}

const severityConfig: Record<string, { label: string; color: string; cardColor: string; icon: typeof AlertTriangle }> = {
  minor: {
    label: 'Ringan',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cardColor: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20',
    icon: CheckCircle,
  },
  moderate: {
    label: 'Sedang',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    cardColor: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20',
    icon: AlertTriangle,
  },
  severe: {
    label: 'Berat',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    cardColor: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20',
    icon: AlertTriangle,
  },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

export default function ReportPage() {
  const [form, setForm] = useState({
    reporter_name: '',
    reporter_email: '',
    reporter_unit: '',
    reporter_phone: '',
    item_name: '',
    location: '',
    severity: '' as '' | 'minor' | 'moderate' | 'severe',
    description: '',
    image_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    if (form.reporter_email && form.reporter_email.includes('@')) {
      fetchReports(form.reporter_email);
    } else {
      setReports([]);
      setLoadingReports(false);
    }
  }, [form.reporter_email]);

  async function fetchReports(email: string) {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('id, inventory_id, reporter_name, description, image_url, severity, status, resolution_notes, created_at, resolved_at, reporter_unit, reporter_email, reporter_phone, location')
        .eq('reporter_email', email)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReports((data as unknown as DamageReport[]) || []);
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoadingReports(false);
    }
  }

  function validate(): boolean {
    if (!form.reporter_name.trim()) { showToast('Nama pelapor wajib diisi', 'warning'); return false; }
    if (!form.reporter_email.trim() || !form.reporter_email.includes('@')) { showToast('Email pelapor valid wajib diisi', 'warning'); return false; }
    if (!form.reporter_unit.trim()) { showToast('Unit/Kelas wajib diisi', 'warning'); return false; }
    if (!form.item_name.trim()) { showToast('Nama barang wajib diisi', 'warning'); return false; }
    if (!form.location.trim()) { showToast('Lokasi wajib diisi', 'warning'); return false; }
    if (!form.severity) { showToast('Pilih tingkat keparahan', 'warning'); return false; }
    if (!form.description.trim() || form.description.trim().length < 20) {
      showToast('Deskripsi minimal 20 karakter', 'warning'); return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const fullDescription = `${form.item_name} — ${form.description}`;
      const payload = {
        reporter_name: form.reporter_name.trim(),
        reporter_email: form.reporter_email.trim(),
        reporter_unit: form.reporter_unit.trim(),
        reporter_phone: form.reporter_phone.trim() || null,
        description: fullDescription,
        location: form.location.trim(),
        severity: form.severity,
        image_url: form.image_url.trim() || null,
        status: 'pending' as const,
      };

      const { data, error } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('id, inventory_id, reporter_name, description, image_url, severity, status, resolution_notes, created_at, resolved_at, reporter_unit, reporter_email, reporter_phone, location')
        .single();

      if (error) throw error;
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      setSuccess(data as unknown as DamageReport);
      fetchReports(form.reporter_email);
    } catch (e) {
      console.error('Error submitting report:', e);
      showToast('Gagal mengirim laporan. Silakan coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSuccess(null);
    setForm({
      reporter_name: '',
      reporter_email: '',
      reporter_unit: '',
      reporter_phone: '',
      item_name: '',
      location: '',
      severity: '',
      description: '',
      image_url: '',
    });
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Laporan Kerusakan</h1>
          <p className="text-slate-600 dark:text-slate-400">Laporkan kerusakan sarana atau prasarana</p>
        </div>

        {success ? (
          /* Success State */
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Laporan Anda telah berhasil dikirim dan akan ditindaklanjuti oleh tim terkait.</p>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 text-left mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Pelapor</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.reporter_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Unit/Kelas</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.reporter_unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
                <span className="font-medium text-slate-900 dark:text-white">{success.location}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Keparahan</span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityConfig[success.severity]?.color)}>
                  {severityConfig[success.severity]?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig[success.status]?.color)}>
                  {statusConfig[success.status]?.label}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Deskripsi</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{success.description}</p>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            {/* Reporter Name */}
            <div>
              <label className={labelClass}>Nama Pelapor <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.reporter_name}
                  onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                  className={cn(inputClass, 'pl-10')}
                  placeholder="Nama lengkap Anda"
                  required
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Email Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.reporter_email}
                    onChange={(e) => setForm({ ...form, reporter_email: e.target.value })}
                    className={cn(inputClass, 'pl-10')}
                    placeholder="email@sekolah.id"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>No. Telepon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.reporter_phone}
                    onChange={(e) => setForm({ ...form, reporter_phone: e.target.value })}
                    className={cn(inputClass, 'pl-10')}
                    placeholder="08xxxxxxxxxx (opsional)"
                  />
                </div>
              </div>
            </div>

            {/* Unit & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Unit/Kelas <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.reporter_unit}
                  onChange={(e) => setForm({ ...form, reporter_unit: e.target.value })}
                  className={inputClass}
                  placeholder="Contoh: XII IPA 1"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Lokasi <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className={cn(inputClass, 'pl-10')}
                    placeholder="Contoh: Lab Komputer 1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Item Name */}
            <div>
              <label className={labelClass}>Nama Barang/Item <span className="text-red-500">*</span></label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  className={cn(inputClass, 'pl-10')}
                  placeholder="Contoh: Proyektor Epson"
                  required
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className={labelClass}>Tingkat Keparahan <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {(['minor', 'moderate', 'severe'] as const).map((sev) => {
                  const cfg = severityConfig[sev];
                  const Icon = cfg.icon;
                  const isSelected = form.severity === sev;
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setForm({ ...form, severity: sev })}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                        isSelected
                          ? cfg.cardColor
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <Icon className={cn('w-6 h-6', isSelected ? '' : 'text-slate-400 dark:text-slate-500')} />
                      <span className={cn('text-sm font-medium', isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400')}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Deskripsi Kerusakan <span className="text-red-500">*</span></label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className={inputClass}
                placeholder="Jelaskan kerusakan secara detail (minimal 20 karakter)..."
                required
                minLength={20}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {form.description.length}/20 karakter minimum
              </p>
            </div>

            {/* Image URL */}
            <div>
              <label className={labelClass}>URL Foto (opsional)</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className={cn(inputClass, 'pl-10')}
                  placeholder="https://... (opsional)"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
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
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Laporan Terbaru Anda
          </h2>
          {!form.reporter_email || !form.reporter_email.includes('@') ? (
            <EmptyState icon={FileText} title="Masukkan email Anda" description="Isi email pada formulir di atas untuk melihat laporan Anda" />
          ) : loadingReports ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState icon={FileText} title="Belum ada laporan" description="Laporan yang Anda buat akan muncul di sini" />
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const sev = severityConfig[r.severity] || severityConfig.minor;
                const st = statusConfig[r.status] || statusConfig.pending;
                return (
                  <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300 flex-1 line-clamp-2">{r.description}</p>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', sev.color)}>{sev.label}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', st.color)}>{st.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                      {r.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {r.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {r.resolution_notes && r.status === 'resolved' && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Tindak Lanjut:</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{r.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

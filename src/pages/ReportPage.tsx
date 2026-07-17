import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Plus,
  MapPin,
  Calendar,
  User,
  Mail,
  FileText,
  Image as ImageIcon,
  Building2,
  ArrowLeft,
} from 'lucide-react';

interface Facility {
  id: string;
  name: string;
}

interface DamageReport {
  id: string;
  item_name: string;
  description: string;
  reporter_name: string;
  reporter_email: string;
  status: string;
  created_at: string;
  location: string;
  severity: string;
  damage_type: string;
  reported_date: string;
  photo_url: string | null;
  facility_id: string | null;
}

interface FacilityOption {
  id: string;
  name: string;
}

const severityOptions = [
  { value: 'low', label: 'Rendah', color: 'emerald', icon: '🟢' },
  { value: 'medium', label: 'Sedang', color: 'amber', icon: '🟡' },
  { value: 'high', label: 'Tinggi', color: 'orange', icon: '🟠' },
  { value: 'critical', label: 'Kritis', color: 'red', icon: '🔴' },
];

const damageTypeOptions = [
  { value: 'rusak_fisik', label: 'Rusak Fisik' },
  { value: 'hilang', label: 'Hilang' },
  { value: 'tidak_berfungsi', label: 'Tidak Berfungsi' },
  { value: 'lainnya', label: 'Lainnya' },
];

const severityConfig: Record<string, { label: string; classes: string }> = {
  low: { label: 'Rendah', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  medium: { label: 'Sedang', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  high: { label: 'Tinggi', classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  critical: { label: 'Kritis', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  reviewed: { label: 'Ditinjau', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolved: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { label: 'Ditolak', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const todayStr = () => new Date().toISOString().split('T')[0];

export default function ReportPage() {
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [recentReports, setRecentReports] = useState<DamageReport[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<DamageReport | null>(null);

  const [form, setForm] = useState({
    reporter_name: '',
    reporter_email: '',
    item_name: '',
    location: '',
    facility_id: '',
    damage_type: 'rusak_fisik',
    severity: 'low',
    reported_date: todayStr(),
    description: '',
    photo_url: '',
  });

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const { data } = await supabase.from('facilities').select('id, name').order('name', { ascending: true });
        setFacilities((data as unknown as FacilityOption[]) ?? []);
      } catch {
        setFacilities([]);
      } finally {
        setLoadingFacilities(false);
      }
    };
    fetchFacilities();
  }, []);

  const fetchReports = async (email: string) => {
    if (!email.trim()) {
      setRecentReports([]);
      setLoadingReports(false);
      return;
    }
    setLoadingReports(true);
    try {
      const { data } = await supabase
        .from('damage_reports')
        .select('*')
        .eq('reporter_email', email)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentReports((data as unknown as DamageReport[]) ?? []);
    } catch {
      setRecentReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (form.reporter_email && /\S+@\S+\.\S+/.test(form.reporter_email)) {
      const timer = setTimeout(() => fetchReports(form.reporter_email), 500);
      return () => clearTimeout(timer);
    }
  }, [form.reporter_email]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (form.description.length < 20) {
      showToast('Deskripsi kerusakan minimal 20 karakter', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reporter_name: form.reporter_name,
        reporter_email: form.reporter_email,
        item_name: form.item_name,
        location: form.location,
        facility_id: form.facility_id || null,
        damage_type: form.damage_type,
        severity: form.severity,
        reported_date: form.reported_date,
        description: form.description,
        photo_url: form.photo_url || null,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      const report = data as unknown as DamageReport;
      setSuccess(report);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');

      // Refresh recent reports
      fetchReports(form.reporter_email);
    } catch (err: any) {
      showToast(err.message ?? 'Gagal mengirim laporan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      reporter_name: '',
      reporter_email: '',
      item_name: '',
      location: '',
      facility_id: '',
      damage_type: 'rusak_fisik',
      severity: 'low',
      reported_date: todayStr(),
      description: '',
      photo_url: '',
    });
    setSuccess(null);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  // Success state
  if (success) {
    const sev = severityConfig[success.severity] ?? severityConfig.low;
    const st = statusConfig[success.status] ?? statusConfig.pending;
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Laporan kerusakan Anda telah berhasil dikirim dan akan ditinjau oleh tim terkait.
            </p>

            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-6 text-left space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Barang</span>
                <span className="font-semibold text-slate-900 dark:text-white">{success.item_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Lokasi</span>
                <span className="font-semibold text-slate-900 dark:text-white">{success.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Keparahan</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sev.classes}`}>{sev.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.classes}`}>{st.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Tanggal</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {new Date(success.reported_date).toLocaleDateString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Deskripsi</span>
                <p className="text-sm text-slate-700 dark:text-slate-300">{success.description}</p>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Buat Laporan Lain
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            Laporan Kerusakan
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Laporkan kerusakan sarana atau prasarana untuk ditindaklanjuti
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 space-y-6">
          {/* Reporter info */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Informasi Pelapor</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nama Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.reporter_name}
                    onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                    placeholder="Nama lengkap"
                    className={inputClass + ' pl-11'}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email Pelapor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={form.reporter_email}
                    onChange={(e) => setForm({ ...form, reporter_email: e.target.value })}
                    placeholder="email@example.com"
                    className={inputClass + ' pl-11'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Item info */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Informasi Barang</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nama Barang/Item <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  placeholder="Nama barang yang rusak"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Lokasi <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Lokasi barang"
                    className={inputClass + ' pl-11'}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Jenis Fasilitas (opsional)</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={form.facility_id}
                    onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
                    className={inputClass + ' pl-11'}
                    disabled={loadingFacilities}
                  >
                    <option value="">Pilih fasilitas...</option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Tipe Kerusakan</label>
                <select
                  value={form.damage_type}
                  onChange={(e) => setForm({ ...form, damage_type: e.target.value })}
                  className={inputClass}
                >
                  {damageTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className={labelClass}>Tingkat Keparahan <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {severityOptions.map((opt) => {
                const isSelected = form.severity === opt.value;
                const colorMap: Record<string, string> = {
                  emerald: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
                  amber: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
                  orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
                  red: 'border-red-500 bg-red-50 dark:bg-red-900/20',
                };
                return (
                  <label
                    key={opt.value}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? colorMap[opt.color]
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={opt.value}
                      checked={isSelected}
                      onChange={(e) => setForm({ ...form, severity: e.target.value })}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-1">{opt.icon}</div>
                      <div className={`text-sm font-medium ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {opt.label}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Date and photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tanggal Laporan <span className="text-red-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={form.reported_date}
                  onChange={(e) => setForm({ ...form, reported_date: e.target.value })}
                  className={inputClass + ' pl-11'}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>URL Foto (opsional)</label>
              <div className="relative">
                <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="url"
                  value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  placeholder="https://..."
                  className={inputClass + ' pl-11'}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              Deskripsi Kerusakan <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-slate-400">({form.description.length}/20 min.)</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <textarea
                required
                minLength={20}
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Jelaskan kerusakan secara detail (minimal 20 karakter)..."
                className={inputClass + ' pl-11 resize-none'}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Mengirim laporan...
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                Kirim Laporan
              </>
            )}
          </button>
        </form>

        {/* Recent Reports */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Laporan Terbaru Anda</h2>
          {!form.reporter_email || !/\S+@\S+\.\S+/.test(form.reporter_email) ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <EmptyState
                icon={AlertTriangle}
                title="Isi email pelapor untuk melihat riwayat"
                description="Laporan terbaru Anda akan muncul di sini"
              />
            </div>
          ) : loadingReports ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <Loader2 className="w-6 h-6 text-slate-300 dark:text-slate-600 animate-spin mx-auto" />
            </div>
          ) : recentReports.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <EmptyState icon={AlertTriangle} title="Belum ada laporan" description="Laporan kerusakan Anda akan tampil di sini" />
            </div>
          ) : (
            <div className="space-y-3">
              {recentReports.map((r) => {
                const sev = severityConfig[r.severity] ?? severityConfig.low;
                const st = statusConfig[r.status] ?? statusConfig.pending;
                return (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.item_name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sev.classes}`}>{sev.label}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.classes}`}>{st.label}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-2">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {r.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {new Date(r.reported_date).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{r.description}</p>
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

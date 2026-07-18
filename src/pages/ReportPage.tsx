import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { uploadFileToDrive } from '../lib/upload';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import {
  AlertTriangle, Loader2, Upload, X, CheckCircle, MapPin, Calendar, FileText,
  Image as ImageIcon, Send, RotateCcw, Search,
} from 'lucide-react';

interface DamageReport {
  id: string;
  reporter_name: string;
  description: string;
  image_url: string | null;
  severity: 'minor' | 'moderate' | 'severe';
  status: 'pending' | 'in_progress' | 'resolved';
  location: string | null;
  reporter_email: string | null;
  reporter_unit: string | null;
  reporter_phone: string | null;
  created_at: string;
}

const severityConfig: Record<string, { label: string; color: string; card: string }> = {
  minor: { label: 'Ringan', color: 'text-emerald-600 dark:text-emerald-400', card: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' },
  moderate: { label: 'Sedang', color: 'text-amber-600 dark:text-amber-400', card: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' },
  severe: { label: 'Berat', color: 'text-red-600 dark:text-red-400', card: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' },
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
    description: '',
    location: '',
    severity: 'minor' as 'minor' | 'moderate' | 'severe',
  });
  const [image_url, setImageUrl] = useState<string | null>(null);
  const [image_name, setImageName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReports = async (email: string) => {
    if (!email) {
      setLoadingReports(false);
      return;
    }
    setLoadingReports(true);
    const { data } = await supabase
      .from('damage_reports')
      .select('*')
      .eq('reporter_email', email)
      .order('created_at', { ascending: false });
    setReports((data as unknown as DamageReport[]) || []);
    setLoadingReports(false);
  };

  useEffect(() => {
    setLoadingReports(false);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar', 'error');
      return;
    }

    setUploading(true);
    const fileName = `damage_${Date.now()}_${file.name}`;
    const result = await uploadFileToDrive(file, fileName);
    setUploading(false);

    if (result) {
      setImageUrl(result.url);
      setImageName(file.name);
      showToast('Foto terunggah', 'success');
    } else {
      showToast('Gagal mengunggah foto', 'error');
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = () => {
    setImageUrl(null);
    setImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.reporter_name || !form.reporter_email || !form.reporter_unit || !form.description || !form.location) {
      showToast('Lengkapi semua field wajib', 'error');
      return;
    }

    setSubmitting(true);
    const payload = {
      reporter_name: form.reporter_name,
      reporter_email: form.reporter_email,
      reporter_unit: form.reporter_unit,
      reporter_phone: form.reporter_phone || null,
      description: form.description,
      location: form.location,
      severity: form.severity,
      image_url: image_url,
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from('damage_reports')
      .insert(payload)
      .select('*')
      .single();

    setSubmitting(false);

    if (error) {
      showToast('Gagal membuat laporan: ' + error.message, 'error');
      return;
    }

    showToast('Laporan berhasil dikirim!', 'success');
    setSubmitted(data as unknown as DamageReport);
    fetchReports(form.reporter_email);
  };

  const handleReset = () => {
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
    setImageName('');
    setSubmitted(null);
  };

  const filteredReports = reports.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.description?.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q);
  });

  // Success state
  if (submitted) {
    const sev = severityConfig[submitted.severity] || severityConfig.minor;
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Terima kasih atas laporan Anda. Tim akan menindakuti laporan ini sesuai prosedur.
            </p>

            <div className="text-left space-y-3 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Pelapor</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submitted.reporter_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Unit/Kelas</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submitted.reporter_unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Barang/Item</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submitted.description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Lokasi</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{submitted.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Keparahan</span>
                <span className={`text-sm font-medium ${sev.color}`}>{sev.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Menunggu</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
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
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Laporkan kerusakan sarana atau prasarana sekolah
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          {/* Reporter info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Pelapor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.reporter_name}
                onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email Pelapor <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={form.reporter_email}
                onChange={(e) => setForm({ ...form, reporter_email: e.target.value })}
                onBlur={(e) => fetchReports(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Unit/Kelas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.reporter_unit}
                onChange={(e) => setForm({ ...form, reporter_unit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                No. Telepon
              </label>
              <input
                type="text"
                value={form.reporter_phone}
                onChange={(e) => setForm({ ...form, reporter_phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Description & Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Barang/Item <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Contoh: Proyektor Ruang Aula"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Lokasi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Contoh: Ruang Aula, Lantai 1"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tingkat Keparahan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['minor', 'moderate', 'severe'] as const).map((sev) => {
                const config = severityConfig[sev];
                const isSelected = form.severity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setForm({ ...form, severity: sev })}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      isSelected
                        ? `${config.card} border-current`
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${config.color}`} />
                    <span className={`text-sm font-medium ${isSelected ? config.color : 'text-slate-600 dark:text-slate-300'}`}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Upload Foto
            </label>
            {image_url ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                <img src={image_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Foto terunggah</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{image_name}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-700 text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Klik untuk upload foto
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Kirim Laporan
              </>
            )}
          </button>
        </form>

        {/* Recent reports */}
        {form.reporter_email && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Anda</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {loadingReports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : filteredReports.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Belum ada laporan" description="Laporan yang Anda buat akan muncul di sini" />
            ) : (
              <div className="space-y-3">
                {filteredReports.map((r) => {
                  const sev = severityConfig[r.severity] || severityConfig.minor;
                  const st = statusConfig[r.status] || statusConfig.pending;
                  return (
                    <div key={r.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sev.card} ${sev.color}`}>{sev.label}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                        {r.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {r.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {r.image_url && (
                          <a
                            href={r.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:underline"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            Lihat Foto
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

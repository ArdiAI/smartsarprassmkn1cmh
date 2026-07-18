import { useEffect, useState } from 'react';
import {
  AlertTriangle, Loader2, Upload, X, ImageIcon, CheckCircle2, MapPin, Calendar, FileText, RotateCcw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { uploadFileToDrive } from '../lib/upload';

interface DamageReport {
  id: string;
  inventory_id: string | null;
  reporter_name: string | null;
  description: string | null;
  image_url: string | null;
  severity: 'minor' | 'moderate' | 'severe' | null;
  status: 'pending' | 'in_progress' | 'resolved' | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter_unit: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  location: string | null;
}

const severityConfig: Record<string, { label: string; color: string; ring: string }> = {
  minor: { label: 'Ringan', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', ring: 'ring-emerald-500' },
  moderate: { label: 'Sedang', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', ring: 'ring-amber-500' },
  severe: { label: 'Berat', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', ring: 'ring-red-500' },
};

const reportStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const initialForm = {
  reporter_name: '',
  reporter_email: '',
  reporter_unit: '',
  reporter_phone: '',
  description: '',
  location: '',
  severity: 'minor' as 'minor' | 'moderate' | 'severe',
};

export default function ReportPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const loadReports = async (email?: string) => {
    const emailToUse = email || form.reporter_email;
    if (!emailToUse) { setLoadingReports(false); return; }
    setLoadingReports(true);
    const { data } = await supabase
      .from('damage_reports')
      .select('*')
      .eq('reporter_email', emailToUse)
      .order('created_at', { ascending: false })
      .limit(10);
    setReports((data as unknown as DamageReport[]) || []);
    setLoadingReports(false);
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5MB', 'error');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFileToDrive(file, `laporan-${Date.now()}-${file.name}`);
      if (result) {
        setImageUrl(result.url);
        setFileId(result.fileId);
        setFileName(file.name);
        showToast('Foto berhasil diunggah', 'success');
      } else {
        showToast('Gagal mengunggah foto', 'error');
      }
    } catch (err) {
      showToast('Gagal mengunggah foto', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setImageUrl(null);
    setFileId(null);
    setFileName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (form.description.trim().length < 3) {
      showToast('Nama barang/item minimal 3 karakter', 'error');
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
      const { data, error } = await supabase.from('damage_reports').insert(payload).select().single();
      if (error) {
        showToast('Gagal membuat laporan: ' + error.message, 'error');
      } else {
        const report = data as unknown as DamageReport;
        setSubmitted(report);
        showToast('Laporan berhasil dikirim', 'success');
        setForm(initialForm);
        setImageUrl(null);
        setFileId(null);
        setFileName(null);
        loadReports(form.reporter_email);
      }
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null);
    setForm(initialForm);
    setImageUrl(null);
    setFileId(null);
    setFileName(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Laporkan kerusakan sarana atau prasarana sekolah</p>
        </div>

        {submitted ? (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Laporan Anda telah berhasil dikirim dan akan ditindaklanjuti oleh tim terkait.</p>
            <div className="max-w-md mx-auto text-left space-y-2 mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Pelapor</span><span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Unit/Kelas</span><span className="font-medium text-slate-900 dark:text-white">{submitted.reporter_unit}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Item</span><span className="font-medium text-slate-900 dark:text-white">{submitted.description}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Lokasi</span><span className="font-medium text-slate-900 dark:text-white">{submitted.location}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Keparahan</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityConfig[submitted.severity || 'minor'].color}`}>
                  {severityConfig[submitted.severity || 'minor'].label}
                </span>
              </div>
            </div>
            <button onClick={resetForm} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors">
              <RotateCcw className="w-4 h-4" /> Buat Laporan Lain
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Pelapor *</label>
                <input
                  type="text" required value={form.reporter_name}
                  onChange={e => setForm({ ...form, reporter_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Pelapor *</label>
                <input
                  type="email" required value={form.reporter_email}
                  onChange={e => setForm({ ...form, reporter_email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Unit/Kelas *</label>
                <input
                  type="text" required value={form.reporter_unit}
                  onChange={e => setForm({ ...form, reporter_unit: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">No. Telepon</label>
                <input
                  type="text" value={form.reporter_phone}
                  onChange={e => setForm({ ...form, reporter_phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Barang/Item *</label>
              <input
                type="text" required value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Contoh: Proyektor Ruang Kelas 10A"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lokasi *</label>
              <input
                type="text" required value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Contoh: Ruang 10A, Lantai 2"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tingkat Keparahan *</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: 'minor', label: 'Ringan', desc: 'Kerusakan kecil', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
                  { key: 'moderate', label: 'Sedang', desc: 'Perlu perbaikan', color: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' },
                  { key: 'severe', label: 'Berat', desc: 'Tidak dapat dipakai', color: 'border-red-500 bg-red-50 dark:bg-red-900/20' },
                ] as const).map(s => (
                  <button
                    key={s.key} type="button"
                    onClick={() => setForm({ ...form, severity: s.key })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.severity === s.key ? s.color + ' ring-2 ' + severityConfig[s.key].ring : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Upload Foto</label>
              {imageUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                  <img src={imageUrl} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Foto terunggah</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{fileName}</p>
                  </div>
                  <button type="button" onClick={handleRemovePhoto} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${uploading ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'}`}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Mengunggah...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Klik untuk upload foto</p>
                      <p className="text-xs text-slate-400">Format: JPG, PNG (maks. 5MB)</p>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
                </label>
              )}
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><AlertTriangle className="w-4 h-4" /> Kirim Laporan</>}
            </button>
          </form>
        )}

        {/* Recent reports */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Laporan Terakhir Anda</h2>
          {loadingReports ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
          ) : reports.length === 0 ? (
            <EmptyState icon={FileText} title="Belum ada laporan" description="Laporan yang Anda buat akan tampil di sini." />
          ) : (
            <div className="space-y-3">
              {reports.map(r => {
                const sev = r.severity ? severityConfig[r.severity] : null;
                const st = r.status ? reportStatusConfig[r.status] : null;
                return (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{r.description}</h3>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {sev && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sev.color}`}>{sev.label}</span>}
                        {st && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.location}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {r.image_url && (
                        <a href={r.image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                          <ImageIcon className="w-3.5 h-3.5" /> Lihat Foto
                        </a>
                      )}
                    </div>
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

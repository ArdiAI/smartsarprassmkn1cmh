import { useEffect, useMemo, useState, FormEvent } from 'react';
import {
  FileText, Loader2, Send, CheckCircle, MapPin, AlertTriangle, Image as ImageIcon, RotateCcw, Search,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

type Severity = 'minor' | 'moderate' | 'severe';
type ReportStatus = 'pending' | 'in_progress' | 'resolved';

interface DamageReport {
  id: string;
  reporter_name: string;
  reporter_email: string;
  reporter_unit: string;
  reporter_phone: string | null;
  description: string;
  location: string;
  severity: Severity;
  image_url: string | null;
  status: ReportStatus;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

const severityConfig: Record<Severity, { label: string; classes: string; ring: string }> = {
  minor: {
    label: 'Ringan',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    ring: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  },
  moderate: {
    label: 'Sedang',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    ring: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
  },
  severe: {
    label: 'Berat',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    ring: 'border-red-400 bg-red-50 dark:bg-red-900/20',
  },
};

const statusConfig: Record<ReportStatus, { label: string; classes: string }> = {
  pending: { label: 'Menunggu', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  in_progress: { label: 'Diproses', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const severityOptions: { value: Severity; label: string; desc: string; color: string }[] = [
  { value: 'minor', label: 'Ringan', desc: 'Kerusakan kecil, masih bisa digunakan', color: 'emerald' },
  { value: 'moderate', label: 'Sedang', desc: 'Kerusakan cukup, perlu perbaikan', color: 'amber' },
  { value: 'severe', label: 'Berat', desc: 'Kerusakan parah, tidak bisa dipakai', color: 'red' },
];

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

export default function ReportPage() {
  const [form, setForm] = useState({
    reporter_name: '',
    reporter_email: '',
    reporter_unit: '',
    reporter_phone: '',
    description: '',
    location: '',
    severity: '' as Severity | '',
    image_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [search, setSearch] = useState('');

  const fetchReports = async (email?: string) => {
    const target = (email || form.reporter_email).trim();
    if (!target) {
      setReports([]);
      setLoadingReports(false);
      return;
    }
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, image_url, status, resolution_notes, created_at, resolved_at')
        .eq('reporter_email', target)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports((data as unknown as DamageReport[]) ?? []);
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q),
    );
  }, [reports, search]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.severity) {
      showToast('Pilih tingkat keparahan', 'warning');
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
        severity: form.severity as Severity,
        image_url: form.image_url.trim() || null,
        status: 'pending' as ReportStatus,
      };
      const { data, error } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('id, reporter_name, reporter_email, reporter_unit, reporter_phone, description, location, severity, image_url, status, resolution_notes, created_at, resolved_at')
        .single();
      if (error) throw error;
      const created = data as unknown as DamageReport;
      setSubmitted(created);
      showToast('Laporan kerusakan berhasil dikirim', 'success');
      setForm({
        reporter_name: '',
        reporter_email: '',
        reporter_unit: '',
        reporter_phone: '',
        description: '',
        location: '',
        severity: '',
        image_url: '',
      });
      fetchReports(created.reporter_email);
    } catch (err) {
      console.error('Submit failed:', err);
      showToast('Gagal mengirim laporan. Coba lagi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" /> Laporan Kerusakan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Laporkan kerusakan sarana atau prasarana.
          </p>
        </div>

        {/* Success state */}
        {submitted ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Laporan Anda telah diterima dan akan ditindaklanjuti oleh tim terkait.
            </p>

            <div className="text-left bg-slate-50 dark:bg-slate-700/40 rounded-xl p-5 mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Pelapor</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.reporter_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Unit/Kelas</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.reporter_unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Barang/Item</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.description}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Lokasi</span><span className="font-medium text-slate-700 dark:text-slate-200">{submitted.location}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Keparahan</span>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', severityConfig[submitted.severity].classes)}>
                  {severityConfig[submitted.severity].label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusConfig[submitted.status].classes)}>
                  {statusConfig[submitted.status].label}
                </span>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Buat Laporan Lain
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nama Pelapor <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.reporter_name}
                  onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                  placeholder="Nama lengkap"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email Pelapor <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={form.reporter_email}
                  onChange={(e) => setForm({ ...form, reporter_email: e.target.value })}
                  placeholder="email@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Unit/Kelas <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.reporter_unit}
                  onChange={(e) => setForm({ ...form, reporter_unit: e.target.value })}
                  placeholder="Contoh: XII IPA 1"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>No. Telepon</label>
                <input
                  type="text"
                  value={form.reporter_phone}
                  onChange={(e) => setForm({ ...form, reporter_phone: e.target.value })}
                  placeholder="08xxxxxxxxxx (opsional)"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Nama Barang/Item <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Nama barang yang rusak"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Lokasi <span className="text-red-500">*</span></label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Lokasi barang"
                  className={cn(inputClass, 'pl-10')}
                />
              </div>
            </div>

            {/* Severity radio cards */}
            <div>
              <label className={labelClass}>Tingkat Keparahan <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {severityOptions.map((opt) => {
                  const selected = form.severity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, severity: opt.value })}
                      className={cn(
                        'text-left p-4 rounded-xl border-2 transition-all',
                        selected
                          ? severityConfig[opt.value].ring
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className={cn('w-4 h-4', `text-${opt.color}-500`)} />
                        <span className="font-semibold text-slate-900 dark:text-white">{opt.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>URL Foto</label>
              <div className="relative">
                <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://... (opsional)"
                  className={cn(inputClass, 'pl-10')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        )}

        {/* Recent reports */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Laporan Terakhir Anda</h2>
            {reports.length > 0 && (
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {loadingReports ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <EmptyState icon={FileText} title="Belum ada laporan" description="Isi email di form laporan Anda untuk melihat riwayat." />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((r) => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{r.description}</h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', severityConfig[r.severity].classes)}>
                      {severityConfig[r.severity].label}
                    </span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusConfig[r.status].classes)}>
                      {statusConfig[r.status].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-blue-400" /> {r.location}
                  </div>
                  {r.resolution_notes && (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                      <span className="font-medium">Tindak lanjut:</span> {r.resolution_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

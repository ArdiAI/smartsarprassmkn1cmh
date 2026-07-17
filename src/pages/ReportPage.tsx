import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Send, CheckCircle2, AlertTriangle, AlertOctagon, AlertCircle,
  MapPin, Calendar, Package, RotateCcw, Loader2, Building2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

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
  location: string | null;
  severity: string;
  damage_type: string | null;
  reported_date: string;
  photo_url: string | null;
  facility_id: string | null;
}

const severityConfig: Record<string, { label: string; color: string; icon: any; ring: string }> = {
  low: { label: 'Rendah', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', icon: CheckCircle2, ring: 'ring-emerald-500' },
  medium: { label: 'Sedang', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700', icon: AlertCircle, ring: 'ring-amber-500' },
  high: { label: 'Tinggi', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700', icon: AlertTriangle, ring: 'ring-orange-500' },
  critical: { label: 'Kritis', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700', icon: AlertOctagon, ring: 'ring-red-500' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  reviewed: { label: 'Ditinjau', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const damageTypes: Record<string, string> = {
  rusak_fisik: 'Rusak Fisik',
  hilang: 'Hilang',
  tidak_berfungsi: 'Tidak Berfungsi',
  lainnya: 'Lainnya',
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = severityConfig[severity] ?? severityConfig.low;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border', cfg.color)}>
      <Icon className="w-3.5 h-3.5" /> {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
  return <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium', cfg.color)}>{cfg.label}</span>;
}

interface FormState {
  reporter_name: string;
  reporter_email: string;
  item_name: string;
  location: string;
  facility_id: string;
  damage_type: string;
  severity: string;
  reported_date: string;
  description: string;
  photo_url: string;
}

const emptyForm: FormState = {
  reporter_name: '',
  reporter_email: '',
  item_name: '',
  location: '',
  facility_id: '',
  damage_type: 'rusak_fisik',
  severity: 'low',
  reported_date: new Date().toISOString().split('T')[0],
  description: '',
  photo_url: '',
};

export default function ReportPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<DamageReport | null>(null);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('facilities').select('id, name').order('name', { ascending: true });
        setFacilities((data ?? []) as unknown as Facility[]);
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchReports = useCallback(async (email: string) => {
    if (!email) { setLoadingReports(false); return; }
    setLoadingReports(true);
    try {
      const { data } = await supabase
        .from('damage_reports')
        .select('id, item_name, description, reporter_name, reporter_email, status, created_at, location, severity, damage_type, reported_date, photo_url, facility_id')
        .eq('reporter_email', email)
        .order('created_at', { ascending: false })
        .limit(10);
      setReports((data ?? []) as unknown as DamageReport[]);
    } catch { /* ignore */ } finally { setLoadingReports(false); }
  }, []);

  // Fetch reports when email changes (debounced via simple effect)
  useEffect(() => {
    if (!form.reporter_email) { setReports([]); setLoadingReports(false); return; }
    const t = setTimeout(() => fetchReports(form.reporter_email), 500);
    return () => clearTimeout(t);
  }, [form.reporter_email, fetchReports]);

  const update = (field: keyof FormState, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const validate = (): string | null => {
    if (!form.reporter_name.trim()) return 'Nama pelapor wajib diisi';
    if (!form.reporter_email.trim()) return 'Email pelapor wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporter_email)) return 'Format email tidak valid';
    if (!form.item_name.trim()) return 'Nama barang wajib diisi';
    if (!form.location.trim()) return 'Lokasi wajib diisi';
    if (!form.reported_date) return 'Tanggal laporan wajib diisi';
    if (form.description.trim().length < 20) return 'Deskripsi minimal 20 karakter';
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
        item_name: form.item_name.trim(),
        location: form.location.trim(),
        facility_id: form.facility_id || null,
        damage_type: form.damage_type,
        severity: form.severity,
        reported_date: form.reported_date,
        description: form.description.trim(),
        photo_url: form.photo_url.trim() || null,
        status: 'pending',
      };
      const { data, error } = await supabase
        .from('damage_reports')
        .insert(payload)
        .select('id, item_name, description, reporter_name, reporter_email, status, created_at, location, severity, damage_type, reported_date, photo_url, facility_id')
        .single();
      if (error) throw error;
      const report = data as unknown as DamageReport;
      setSuccess(report);
      showToast('Laporan kerusakan berhasil dikirim!', 'success');
      setForm(emptyForm);
      fetchReports(report.reporter_email);
    } catch (err: any) {
      showToast(err?.message ?? 'Gagal mengirim laporan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => { setSuccess(null); setForm(emptyForm); };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Terkirim!</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Laporan kerusakan Anda telah berhasil dikirim dan akan ditinjau oleh tim terkait.</p>

            <div className="mt-6 text-left space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
              <div className="flex justify-between"><span className="text-sm text-slate-500">Item</span><span className="text-sm font-medium text-slate-900 dark:text-white">{success.item_name}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Keparahan</span><SeverityBadge severity={success.severity} /></div>
              <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Status</span><StatusBadge status={success.status} /></div>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Lokasi</span><span className="text-sm font-medium text-slate-900 dark:text-white">{success.location}</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Tanggal</span><span className="text-sm font-medium text-slate-900 dark:text-white">{new Date(success.reported_date).toLocaleDateString('id-ID')}</span></div>
              {success.damage_type && <div className="flex justify-between"><span className="text-sm text-slate-500">Tipe</span><span className="text-sm font-medium text-slate-900 dark:text-white">{damageTypes[success.damage_type] ?? success.damage_type}</span></div>}
            </div>

            <button onClick={resetForm} className="btn-primary mt-6 inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Buat Laporan Lain
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Kerusakan</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Laporkan kerusakan sarana atau prasarana</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 mt-6 space-y-5">
          {/* Reporter info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nama Pelapor <span className="text-red-500">*</span></label>
              <input type="text" value={form.reporter_name} onChange={e => update('reporter_name', e.target.value)} className="input" placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="label">Email Pelapor <span className="text-red-500">*</span></label>
              <input type="email" value={form.reporter_email} onChange={e => update('reporter_email', e.target.value)} className="input" placeholder="email@contoh.com" />
            </div>
          </div>

          {/* Item info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nama Barang/Item <span className="text-red-500">*</span></label>
              <input type="text" value={form.item_name} onChange={e => update('item_name', e.target.value)} className="input" placeholder="Nama barang" />
            </div>
            <div>
              <label className="label">Lokasi <span className="text-red-500">*</span></label>
              <input type="text" value={form.location} onChange={e => update('location', e.target.value)} className="input" placeholder="Lokasi barang" />
            </div>
          </div>

          {/* Facility + damage type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Jenis Fasilitas (opsional)</label>
              <select value={form.facility_id} onChange={e => update('facility_id', e.target.value)} className="input">
                <option value="">Pilih fasilitas...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipe Kerusakan</label>
              <select value={form.damage_type} onChange={e => update('damage_type', e.target.value)} className="input">
                {Object.entries(damageTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Severity - radio cards */}
          <div>
            <label className="label">Tingkat Keparahan <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(severityConfig).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const active = form.severity === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => update('severity', key)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      active
                        ? cn(cfg.color, 'ring-2', cfg.ring)
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                    )}
                  >
                    <Icon className={cn('w-6 h-6', active ? '' : 'text-slate-400')} />
                    <span className="text-sm font-medium">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tanggal Laporan <span className="text-red-500">*</span></label>
              <input type="date" value={form.reported_date} onChange={e => update('reported_date', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">URL Foto (opsional)</label>
              <input type="text" value={form.photo_url} onChange={e => update('photo_url', e.target.value)} className="input" placeholder="https://..." />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Deskripsi Kerusakan <span className="text-red-500">*</span></label>
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={4}
              className="input resize-none"
              placeholder="Jelaskan kerusakan secara detail (minimal 20 karakter)..."
            />
            <p className="text-xs text-slate-400 mt-1">{form.description.length} / 20 karakter minimum</p>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full inline-flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</> : <><Send className="w-4 h-4" /> Kirim Laporan</>}
          </button>
        </form>

        {/* Recent reports */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Laporan Terbaru Anda</h2>
          {!form.reporter_email ? (
            <div className="card p-6">
              <EmptyState icon={FileText} title="Masukkan email untuk melihat laporan" description="Laporan akan muncul setelah Anda mengisi email." />
            </div>
          ) : loadingReports ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="card p-5 animate-pulse space-y-2"><div className="w-1/3 h-5 bg-slate-200 dark:bg-slate-700 rounded" /><div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded" /></div>)}
            </div>
          ) : reports.length === 0 ? (
            <div className="card p-6">
              <EmptyState icon={FileText} title="Belum ada laporan" description="Anda belum pernah membuat laporan dengan email ini." />
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-500" />
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.item_name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={r.severity} />
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                    {r.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {r.location}</span>}
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(r.reported_date).toLocaleDateString('id-ID')}</span>
                    {r.damage_type && <span className="inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {damageTypes[r.damage_type] ?? r.damage_type}</span>}
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{r.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

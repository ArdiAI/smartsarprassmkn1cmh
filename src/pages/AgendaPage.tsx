import { useState, useRef } from 'react';
import {
  CalendarDays,
  Save,
  RotateCcw,
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  MapPin,
  AlignLeft,
  Paperclip,
  Users,
  User,
  Tag,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { uploadFileToDrive } from '../lib/upload';
import { cn } from '../utils/cn';

const JENIS_OPTIONS = [
  'Rapat',
  'Upacara',
  'Lomba',
  'Seminar',
  'Workshop',
  'Ekstrakurikuler',
  'Senam',
  'Peringatan',
  'Sosial',
  'Lainnya',
];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface AgendaForm {
  nama_kegiatan: string;
  jenis_kegiatan: string;
  organisasi_jurusan: string;
  penanggung_jawab: string;
  jumlah_peserta: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  lokasi: string;
  deskripsi: string;
  lampiran_url: string | null;
  lampiran_nama: string | null;
}

function emptyForm(): AgendaForm {
  return {
    nama_kegiatan: '',
    jenis_kegiatan: '',
    organisasi_jurusan: '',
    penanggung_jawab: '',
    jumlah_peserta: '',
    tanggal: todayStr(),
    waktu_mulai: '08:00',
    waktu_selesai: '16:00',
    lokasi: '',
    deskripsi: '',
    lampiran_url: null,
    lampiran_nama: null,
  };
}

export default function AgendaPage() {
  const [form, setForm] = useState<AgendaForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<AgendaForm | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof AgendaForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFileToDrive(file);
    setUploading(false);
    if (!result) {
      showToast('Gagal mengunggah lampiran', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    update('lampiran_url', result.url);
    update('lampiran_nama', file.name);
    showToast('Lampiran berhasil diunggah', 'success');
  };

  const handleRemoveLampiran = () => {
    setForm((f) => ({ ...f, lampiran_url: null, lampiran_nama: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): string | null => {
    if (!form.nama_kegiatan.trim()) return 'Nama kegiatan wajib diisi';
    if (!form.jenis_kegiatan) return 'Jenis kegiatan wajib dipilih';
    if (!form.organisasi_jurusan.trim()) return 'Organisasi/Jurusan wajib diisi';
    if (!form.penanggung_jawab.trim()) return 'Penanggung jawab wajib diisi';
    const peserta = parseInt(form.jumlah_peserta, 10);
    if (!peserta || peserta < 1) return 'Jumlah peserta minimal 1';
    if (!form.tanggal) return 'Tanggal wajib diisi';
    if (!form.waktu_mulai) return 'Waktu mulai wajib diisi';
    if (!form.waktu_selesai) return 'Waktu selesai wajib diisi';
    if (form.waktu_selesai <= form.waktu_mulai)
      return 'Waktu selesai harus setelah waktu mulai';
    if (!form.lokasi.trim()) return 'Lokasi wajib diisi';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      showToast(err, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        nama_kegiatan: form.nama_kegiatan.trim(),
        jenis_kegiatan: form.jenis_kegiatan,
        organisasi_jurusan: form.organisasi_jurusan.trim(),
        penanggung_jawab: form.penanggung_jawab.trim(),
        jumlah_peserta: parseInt(form.jumlah_peserta, 10),
        tanggal: form.tanggal,
        waktu_mulai: form.waktu_mulai,
        waktu_selesai: form.waktu_selesai,
        lokasi: form.lokasi.trim(),
        deskripsi: form.deskripsi.trim() || null,
        lampiran_url: form.lampiran_url,
        lampiran_nama: form.lampiran_nama,
        status: 'scheduled',
        penyelenggara: form.organisasi_jurusan.trim(),
      };
      const { error } = await supabase.from('agendas').insert(payload);
      if (error) throw error;
      showToast('Agenda berhasil disimpan', 'success');
      setSuccess({ ...form });
      setForm(emptyForm());
    } catch {
      showToast('Gagal menyimpan agenda', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (success) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <AnimatedBackground />
        <main className="relative mx-auto max-w-3xl px-4 py-12">
          <div className="card text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Agenda Berhasil Disimpan
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Agenda akan otomatis muncul di halaman Timeline.
            </p>

            <div className="mt-6 space-y-2 text-left">
              <SummaryRow label="Nama Kegiatan" value={success.nama_kegiatan} />
              <SummaryRow label="Jenis" value={success.jenis_kegiatan} />
              <SummaryRow label="Organisasi/Jurusan" value={success.organisasi_jurusan} />
              <SummaryRow label="Penanggung Jawab" value={success.penanggung_jawab} />
              <SummaryRow label="Jumlah Peserta" value={success.jumlah_peserta} />
              <SummaryRow label="Tanggal" value={success.tanggal} />
              <SummaryRow label="Waktu" value={`${success.waktu_mulai} - ${success.waktu_selesai}`} />
              <SummaryRow label="Lokasi" value={success.lokasi} />
              {success.deskripsi && <SummaryRow label="Deskripsi" value={success.deskripsi} />}
              {success.lampiran_nama && (
                <SummaryRow label="Lampiran" value={success.lampiran_nama} />
              )}
            </div>

            <button
              onClick={() => setSuccess(null)}
              className="btn-primary mt-6"
            >
              <RotateCcw className="h-4 w-4" />
              Buat Agenda Lain
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <AnimatedBackground />
      <main className="relative mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <CalendarDays className="h-7 w-7 text-brand-600" />
            Buat Agenda Kegiatan
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Catat kegiatan sekolah yang tidak meminjam barang atau fasilitas. Agenda akan otomatis muncul di Timeline.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Informasi Kegiatan */}
          <fieldset className="card">
            <legend className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Tag className="h-5 w-5 text-brand-600" />
              Informasi Kegiatan
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="nama_kegiatan">
                  Nama Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  id="nama_kegiatan"
                  type="text"
                  className="input"
                  placeholder="Contoh: Rapat Koordinasi Guru"
                  value={form.nama_kegiatan}
                  onChange={(e) => update('nama_kegiatan', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="jenis_kegiatan">
                  Jenis Kegiatan <span className="text-red-500">*</span>
                </label>
                <select
                  id="jenis_kegiatan"
                  className="input"
                  value={form.jenis_kegiatan}
                  onChange={(e) => update('jenis_kegiatan', e.target.value)}
                  required
                >
                  <option value="">Pilih jenis...</option>
                  {JENIS_OPTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="organisasi_jurusan">
                  Organisasi / Jurusan <span className="text-red-500">*</span>
                </label>
                <input
                  id="organisasi_jurusan"
                  type="text"
                  className="input"
                  placeholder="Contoh: OSIS, Jurusan RPL"
                  value={form.organisasi_jurusan}
                  onChange={(e) => update('organisasi_jurusan', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="penanggung_jawab">
                  Penanggung Jawab <span className="text-red-500">*</span>
                </label>
                <input
                  id="penanggung_jawab"
                  type="text"
                  className="input"
                  placeholder="Nama penanggung jawab"
                  value={form.penanggung_jawab}
                  onChange={(e) => update('penanggung_jawab', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="jumlah_peserta">
                  Jumlah Peserta <span className="text-red-500">*</span>
                </label>
                <input
                  id="jumlah_peserta"
                  type="number"
                  min={1}
                  className="input"
                  placeholder="1"
                  value={form.jumlah_peserta}
                  onChange={(e) => update('jumlah_peserta', e.target.value)}
                  required
                />
              </div>
            </div>
          </fieldset>

          {/* Waktu */}
          <fieldset className="card">
            <legend className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Clock className="h-5 w-5 text-brand-600" />
              Waktu
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="tanggal">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  id="tanggal"
                  type="date"
                  className="input"
                  value={form.tanggal}
                  onChange={(e) => update('tanggal', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="waktu_mulai">
                  Waktu Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  id="waktu_mulai"
                  type="time"
                  className="input"
                  value={form.waktu_mulai}
                  onChange={(e) => update('waktu_mulai', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="waktu_selesai">
                  Waktu Selesai <span className="text-red-500">*</span>
                </label>
                <input
                  id="waktu_selesai"
                  type="time"
                  className="input"
                  value={form.waktu_selesai}
                  onChange={(e) => update('waktu_selesai', e.target.value)}
                  required
                />
              </div>
            </div>
          </fieldset>

          {/* Lokasi */}
          <fieldset className="card">
            <legend className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <MapPin className="h-5 w-5 text-brand-600" />
              Lokasi
            </legend>
            <div>
              <label className="label" htmlFor="lokasi">
                Lokasi Kegiatan <span className="text-red-500">*</span>
              </label>
              <input
                id="lokasi"
                type="text"
                className="input"
                placeholder="Contoh: Aula Utama, Lapangan, atau lokasi di luar sekolah"
                value={form.lokasi}
                onChange={(e) => update('lokasi', e.target.value)}
                required
              />
            </div>
          </fieldset>

          {/* Deskripsi */}
          <fieldset className="card">
            <legend className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <AlignLeft className="h-5 w-5 text-brand-600" />
              Deskripsi
            </legend>
            <div>
              <label className="label" htmlFor="deskripsi">
                Deskripsi <span className="text-slate-400">(opsional)</span>
              </label>
              <textarea
                id="deskripsi"
                rows={4}
                className="input resize-y"
                placeholder="Deskripsi singkat kegiatan..."
                value={form.deskripsi}
                onChange={(e) => update('deskripsi', e.target.value)}
              />
            </div>
          </fieldset>

          {/* Lampiran */}
          <fieldset className="card">
            <legend className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Paperclip className="h-5 w-5 text-brand-600" />
              Lampiran <span className="text-slate-400 text-sm font-normal">(opsional)</span>
            </legend>
            {form.lampiran_url && form.lampiran_nama ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <FileText className="h-5 w-5 text-brand-600" />
                  <span className="font-medium">{form.lampiran_nama}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLampiran}
                  className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  Hapus Lampiran
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload File / Foto
                    </>
                  )}
                </button>
                <p className="mt-2 text-xs text-slate-400">
                  Mendukung dokumen (PDF, DOC, XLS) dan gambar (JPG, PNG).
                </p>
              </div>
            )}
          </fieldset>

          {/* Tombol */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Agenda
                </>
              )}
            </button>
            <button type="button" onClick={handleReset} className="btn-secondary" disabled={submitting}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

import { useState } from 'react';
import { CalendarDays, Save, RotateCcw, Upload, X, Loader2, FileText, CheckCircle2, Plus, MapPin, Clock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadFileToDrive } from '../lib/upload';
import { showToast } from '../components/Toast';
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

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const emptyForm: AgendaForm = {
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

export default function AgendaPage() {
  const [form, setForm] = useState<AgendaForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<AgendaForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof AgendaForm>(key: K, value: AgendaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.nama_kegiatan.trim()) e.nama_kegiatan = 'Nama kegiatan wajib diisi';
    if (!form.jenis_kegiatan) e.jenis_kegiatan = 'Jenis kegiatan wajib dipilih';
    if (!form.organisasi_jurusan.trim()) e.organisasi_jurusan = 'Organisasi/Jurusan wajib diisi';
    if (!form.penanggung_jawab.trim()) e.penanggung_jawab = 'Penanggung jawab wajib diisi';
    if (!form.jumlah_peserta || parseInt(form.jumlah_peserta) < 1)
      e.jumlah_peserta = 'Jumlah peserta minimal 1';
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi';
    if (!form.waktu_mulai) e.waktu_mulai = 'Waktu mulai wajib diisi';
    if (!form.waktu_selesai) e.waktu_selesai = 'Waktu selesai wajib diisi';
    if (form.waktu_mulai && form.waktu_selesai && form.waktu_selesai <= form.waktu_mulai)
      e.waktu_selesai = 'Waktu selesai harus setelah waktu mulai';
    if (!form.lokasi.trim()) e.lokasi = 'Lokasi wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFileToDrive(file);
    setUploading(false);
    if (result) {
      update('lampiran_url', result.url);
      update('lampiran_nama', file.name);
      showToast('Lampiran berhasil diunggah', 'success');
    } else {
      showToast('Gagal mengunggah lampiran', 'error');
    }
    e.target.value = '';
  }

  function removeAttachment() {
    update('lampiran_url', null);
    update('lampiran_nama', null);
  }

  function resetForm() {
    setForm(emptyForm);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      showToast('Mohon lengkapi semua field yang wajib diisi', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        nama_kegiatan: form.nama_kegiatan.trim(),
        jenis_kegiatan: form.jenis_kegiatan,
        organisasi_jurusan: form.organisasi_jurusan.trim(),
        penanggung_jawab: form.penanggung_jawab.trim(),
        jumlah_peserta: parseInt(form.jumlah_peserta),
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
      resetForm();
    } catch (err: any) {
      showToast(err?.message ?? 'Gagal menyimpan agenda', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Agenda Tersimpan!</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Agenda kegiatan Anda telah berhasil disimpan dan akan otomatis muncul di Timeline.
          </p>
          <div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-left dark:bg-slate-800/50">
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Nama Kegiatan</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.nama_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Jenis</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.jenis_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tanggal</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.tanggal}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Waktu</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.waktu_mulai} - {success.waktu_selesai}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.lokasi}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Penanggung Jawab</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.penanggung_jawab}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Jumlah Peserta</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{success.jumlah_peserta}</span>
            </div>
          </div>
          <button onClick={() => setSuccess(null)} className="btn-primary mt-6">
            <Plus className="h-4 w-4" />
            Buat Agenda Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buat Agenda Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Catat kegiatan sekolah yang tidak meminjam barang atau fasilitas. Agenda akan otomatis muncul di Timeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informasi Kegiatan */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Informasi Kegiatan</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nama Kegiatan <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={cn('input', errors.nama_kegiatan && 'border-red-500')}
                value={form.nama_kegiatan}
                onChange={(e) => update('nama_kegiatan', e.target.value)}
                placeholder="Contoh: Rapat Bulanan Guru"
              />
              {errors.nama_kegiatan && <p className="mt-1 text-xs text-red-500">{errors.nama_kegiatan}</p>}
            </div>
            <div>
              <label className="label">Jenis Kegiatan <span className="text-red-500">*</span></label>
              <select
                className={cn('input', errors.jenis_kegiatan && 'border-red-500')}
                value={form.jenis_kegiatan}
                onChange={(e) => update('jenis_kegiatan', e.target.value)}
              >
                <option value="">Pilih jenis kegiatan</option>
                {JENIS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.jenis_kegiatan && <p className="mt-1 text-xs text-red-500">{errors.jenis_kegiatan}</p>}
            </div>
            <div>
              <label className="label">Organisasi / Jurusan <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={cn('input', errors.organisasi_jurusan && 'border-red-500')}
                value={form.organisasi_jurusan}
                onChange={(e) => update('organisasi_jurusan', e.target.value)}
                placeholder="Contoh: OSIS / TKR"
              />
              {errors.organisasi_jurusan && <p className="mt-1 text-xs text-red-500">{errors.organisasi_jurusan}</p>}
            </div>
            <div>
              <label className="label">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={cn('input', errors.penanggung_jawab && 'border-red-500')}
                value={form.penanggung_jawab}
                onChange={(e) => update('penanggung_jawab', e.target.value)}
                placeholder="Nama penanggung jawab"
              />
              {errors.penanggung_jawab && <p className="mt-1 text-xs text-red-500">{errors.penanggung_jawab}</p>}
            </div>
            <div>
              <label className="label">Jumlah Peserta <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                className={cn('input', errors.jumlah_peserta && 'border-red-500')}
                value={form.jumlah_peserta}
                onChange={(e) => update('jumlah_peserta', e.target.value)}
                placeholder="Minimal 1"
              />
              {errors.jumlah_peserta && <p className="mt-1 text-xs text-red-500">{errors.jumlah_peserta}</p>}
            </div>
          </div>
        </div>

        {/* Waktu */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Waktu</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Tanggal <span className="text-red-500">*</span></label>
              <input
                type="date"
                className={cn('input', errors.tanggal && 'border-red-500')}
                value={form.tanggal}
                onChange={(e) => update('tanggal', e.target.value)}
              />
              {errors.tanggal && <p className="mt-1 text-xs text-red-500">{errors.tanggal}</p>}
            </div>
            <div>
              <label className="label">Waktu Mulai <span className="text-red-500">*</span></label>
              <input
                type="time"
                className={cn('input', errors.waktu_mulai && 'border-red-500')}
                value={form.waktu_mulai}
                onChange={(e) => update('waktu_mulai', e.target.value)}
              />
              {errors.waktu_mulai && <p className="mt-1 text-xs text-red-500">{errors.waktu_mulai}</p>}
            </div>
            <div>
              <label className="label">Waktu Selesai <span className="text-red-500">*</span></label>
              <input
                type="time"
                className={cn('input', errors.waktu_selesai && 'border-red-500')}
                value={form.waktu_selesai}
                onChange={(e) => update('waktu_selesai', e.target.value)}
              />
              {errors.waktu_selesai && <p className="mt-1 text-xs text-red-500">{errors.waktu_selesai}</p>}
            </div>
          </div>
        </div>

        {/* Lokasi */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Lokasi</h2>
          </div>
          <div>
            <label className="label">Lokasi Kegiatan <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={cn('input', errors.lokasi && 'border-red-500')}
              value={form.lokasi}
              onChange={(e) => update('lokasi', e.target.value)}
              placeholder="Contoh: Aula Sekolah, Lapangan, atau lokasi di luar sekolah"
            />
            {errors.lokasi && <p className="mt-1 text-xs text-red-500">{errors.lokasi}</p>}
            <p className="mt-1 text-xs text-slate-400">Isi lokasi kegiatan. Jika di luar sekolah, ketik secara bebas.</p>
          </div>
        </div>

        {/* Deskripsi */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Deskripsi</h2>
          </div>
          <div>
            <label className="label">Deskripsi (Opsional)</label>
            <textarea
              rows={4}
              className="input resize-none"
              value={form.deskripsi}
              onChange={(e) => update('deskripsi', e.target.value)}
              placeholder="Deskripsi singkat kegiatan..."
            />
          </div>
        </div>

        {/* Lampiran */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Lampiran (Opsional)</h2>
          </div>
          {!form.lampiran_url ? (
          <div>
            <label className="btn-secondary cursor-pointer">
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
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            <p className="mt-2 text-xs text-slate-400">Unggah dokumen atau foto pendukung kegiatan.</p>
          </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{form.lampiran_nama}</span>
              </div>
              <button
                type="button"
                onClick={removeAttachment}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <X className="h-4 w-4" />
                Hapus Lampiran
              </button>
            </div>
          )}
        </div>

        {/* Tombol */}
        <div className="flex gap-3">
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
          <button type="button" onClick={resetForm} className="btn-secondary" disabled={submitting}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

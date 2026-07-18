import { useState, type FormEvent } from 'react';
import { CalendarDays, Save, RotateCcw, Plus, FileText, CheckCircle2, Loader2, Upload, X, MapPin, Clock, Users } from 'lucide-react';
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

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface SavedAgenda {
  nama_kegiatan: string;
  jenis_kegiatan: string;
  organisasi_jurusan: string;
  penanggung_jawab: string;
  jumlah_peserta: number;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  lokasi: string;
  deskripsi: string;
  lampiran_nama: string | null;
}

const emptyForm = {
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
  lampiran_url: '',
  lampiran_nama: '',
};

export default function AgendaPage() {
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SavedAgenda | null>(null);

  const update = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFileToDrive(file);
      if (!result) {
        showToast('Gagal mengunggah lampiran', 'error');
        return;
      }
      update('lampiran_url', result.url);
      update('lampiran_nama', file.name);
      showToast('Lampiran berhasil diunggah', 'success');
    } catch {
      showToast('Gagal mengunggah lampiran', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeLampiran = () => {
    update('lampiran_url', '');
    update('lampiran_nama', '');
  };

  const reset = () => setForm({ ...emptyForm });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !form.nama_kegiatan ||
      !form.jenis_kegiatan ||
      !form.organisasi_jurusan ||
      !form.penanggung_jawab ||
      !form.jumlah_peserta ||
      !form.tanggal ||
      !form.waktu_mulai ||
      !form.waktu_selesai ||
      !form.lokasi
    ) {
      showToast('Mohon lengkapi semua field wajib', 'error');
      return;
    }
    const peserta = parseInt(form.jumlah_peserta, 10);
    if (isNaN(peserta) || peserta < 1) {
      showToast('Jumlah peserta minimal 1', 'error');
      return;
    }
    if (form.waktu_selesai <= form.waktu_mulai) {
      showToast('Waktu selesai harus setelah waktu mulai', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nama_kegiatan: form.nama_kegiatan.trim(),
        jenis_kegiatan: form.jenis_kegiatan,
        organisasi_jurusan: form.organisasi_jurusan.trim(),
        penanggung_jawab: form.penanggung_jawab.trim(),
        jumlah_peserta: peserta,
        tanggal: form.tanggal,
        waktu_mulai: form.waktu_mulai,
        waktu_selesai: form.waktu_selesai,
        lokasi: form.lokasi.trim(),
        deskripsi: form.deskripsi.trim() || null,
        lampiran_url: form.lampiran_url || null,
        lampiran_nama: form.lampiran_nama || null,
        status: 'scheduled',
        penyelenggara: form.organisasi_jurusan.trim(),
      };
      const { error } = await supabase.from('agendas').insert(payload);
      if (error) {
        showToast('Gagal menyimpan agenda: ' + error.message, 'error');
        return;
      }
      showToast('Agenda berhasil disimpan', 'success');
      setSuccess({
        nama_kegiatan: payload.nama_kegiatan,
        jenis_kegiatan: payload.jenis_kegiatan,
        organisasi_jurusan: payload.organisasi_jurusan,
        penanggung_jawab: payload.penanggung_jawab,
        jumlah_peserta: payload.jumlah_peserta,
        tanggal: payload.tanggal,
        waktu_mulai: payload.waktu_mulai,
        waktu_selesai: payload.waktu_selesai,
        lokasi: payload.lokasi,
        deskripsi: payload.deskripsi ?? '',
        lampiran_nama: payload.lampiran_nama,
      });
      reset();
    } catch (err) {
      showToast('Terjadi kesalahan saat menyimpan agenda', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Agenda Berhasil Disimpan</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Agenda akan otomatis muncul di halaman Timeline.
          </p>
          <div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Nama Kegiatan</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.nama_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Jenis</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.jenis_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Organisasi</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.organisasi_jurusan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Penanggung Jawab</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.penanggung_jawab}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Peserta</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.jumlah_peserta} orang</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Tanggal</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.tanggal}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Waktu</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.waktu_mulai} - {success.waktu_selesai}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="font-semibold text-slate-900 dark:text-white">{success.lokasi}</span>
            </div>
            {success.lampiran_nama && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">Lampiran</span>
                <span className="font-semibold text-slate-900 dark:text-white">{success.lampiran_nama}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="btn-primary mt-6"
          >
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
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buat Agenda Kegiatan</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Catat kegiatan sekolah yang tidak meminjam barang atau fasilitas. Agenda akan otomatis muncul di Timeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Informasi Kegiatan */}
        <fieldset className="card">
          <legend className="mb-4 flex items-center gap-2 px-1 text-base font-semibold text-slate-900 dark:text-white">
            <FileText className="h-5 w-5 text-brand-600" />
            Informasi Kegiatan
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="nama_kegiatan">Nama Kegiatan <span className="text-red-500">*</span></label>
              <input
                id="nama_kegiatan"
                className="input"
                type="text"
                value={form.nama_kegiatan}
                onChange={(e) => update('nama_kegiatan', e.target.value)}
                placeholder="Contoh: Rapat Koordinasi Guru"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="jenis_kegiatan">Jenis Kegiatan <span className="text-red-500">*</span></label>
              <select
                id="jenis_kegiatan"
                className="input"
                value={form.jenis_kegiatan}
                onChange={(e) => update('jenis_kegiatan', e.target.value)}
                required
              >
                <option value="">Pilih jenis kegiatan</option>
                {JENIS_OPTIONS.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="organisasi_jurusan">Organisasi / Jurusan <span className="text-red-500">*</span></label>
              <input
                id="organisasi_jurusan"
                className="input"
                type="text"
                value={form.organisasi_jurusan}
                onChange={(e) => update('organisasi_jurusan', e.target.value)}
                placeholder="Contoh: OSIS, TKR, Guru"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="penanggung_jawab">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input
                id="penanggung_jawab"
                className="input"
                type="text"
                value={form.penanggung_jawab}
                onChange={(e) => update('penanggung_jawab', e.target.value)}
                placeholder="Nama penanggung jawab"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="jumlah_peserta">Jumlah Peserta <span className="text-red-500">*</span></label>
              <input
                id="jumlah_peserta"
                className="input"
                type="number"
                min={1}
                value={form.jumlah_peserta}
                onChange={(e) => update('jumlah_peserta', e.target.value)}
                placeholder="Minimal 1"
                required
              />
            </div>
          </div>
        </fieldset>

        {/* Waktu */}
        <fieldset className="card">
          <legend className="mb-4 flex items-center gap-2 px-1 text-base font-semibold text-slate-900 dark:text-white">
            <Clock className="h-5 w-5 text-brand-600" />
            Waktu
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="tanggal">Tanggal <span className="text-red-500">*</span></label>
              <input
                id="tanggal"
                className="input"
                type="date"
                value={form.tanggal}
                onChange={(e) => update('tanggal', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="waktu_mulai">Waktu Mulai <span className="text-red-500">*</span></label>
              <input
                id="waktu_mulai"
                className="input"
                type="time"
                value={form.waktu_mulai}
                onChange={(e) => update('waktu_mulai', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="waktu_selesai">Waktu Selesai <span className="text-red-500">*</span></label>
              <input
                id="waktu_selesai"
                className="input"
                type="time"
                value={form.waktu_selesai}
                onChange={(e) => update('waktu_selesai', e.target.value)}
                required
              />
            </div>
          </div>
        </fieldset>

        {/* Lokasi */}
        <fieldset className="card">
          <legend className="mb-4 flex items-center gap-2 px-1 text-base font-semibold text-slate-900 dark:text-white">
            <MapPin className="h-5 w-5 text-brand-600" />
            Lokasi
          </legend>
          <div>
            <label className="label" htmlFor="lokasi">Lokasi Kegiatan <span className="text-red-500">*</span></label>
            <input
              id="lokasi"
              className="input"
              type="text"
              value={form.lokasi}
              onChange={(e) => update('lokasi', e.target.value)}
              placeholder="Contoh: Aula Sekolah, Lapangan, atau lokasi luar sekolah"
              required
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Lokasi diisi bebas. Bisa di dalam atau di luar sekolah.
            </p>
          </div>
        </fieldset>

        {/* Deskripsi */}
        <fieldset className="card">
          <legend className="mb-4 flex items-center gap-2 px-1 text-base font-semibold text-slate-900 dark:text-white">
            <FileText className="h-5 w-5 text-brand-600" />
            Deskripsi
          </legend>
          <div>
            <label className="label" htmlFor="deskripsi">Deskripsi <span className="text-slate-400 font-normal">(opsional)</span></label>
            <textarea
              id="deskripsi"
              className="input min-h-[100px] resize-y"
              value={form.deskripsi}
              onChange={(e) => update('deskripsi', e.target.value)}
              placeholder="Keterangan tambahan tentang kegiatan"
            />
          </div>
        </fieldset>

        {/* Lampiran */}
        <fieldset className="card">
          <legend className="mb-4 flex items-center gap-2 px-1 text-base font-semibold text-slate-900 dark:text-white">
            <Upload className="h-5 w-5 text-brand-600" />
            Lampiran <span className="text-sm font-normal text-slate-400">(opsional)</span>
          </legend>
          {form.lampiran_nama ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-brand-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{form.lampiran_nama}</span>
              </div>
              <button
                type="button"
                onClick={removeLampiran}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <X className="h-4 w-4" />
                Hapus Lampiran
              </button>
            </div>
          ) : (
            <div>
              <label
                htmlFor="lampiran"
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  uploading && 'pointer-events-none opacity-70',
                )}
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
              </label>
              <input
                id="lampiran"
                type="file"
                className="hidden"
                onChange={handleFile}
                disabled={uploading}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Mendukung dokumen atau gambar. File akan diunggah ke Google Drive.
              </p>
            </div>
          )}
        </fieldset>

        {/* Tombol */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || uploading}
          >
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
          <button
            type="button"
            onClick={reset}
            className="btn-secondary"
            disabled={submitting}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

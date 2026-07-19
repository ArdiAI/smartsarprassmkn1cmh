import { useState } from 'react';
import { CalendarPlus, Loader2, Upload, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadFileToDrive } from '../../lib/upload';
import { showToast } from '../../components/Toast';
import { cn } from '../../utils/cn';

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
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const emptyForm = {
  nama_kegiatan: '',
  jenis_kegiatan: 'Rapat',
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

export default function AgendaAdminPage() {
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<null | {
    nama_kegiatan: string;
    tanggal: string;
    waktu_mulai: string;
    waktu_selesai: string;
    lokasi: string;
    jenis_kegiatan: string;
  }>(null);

  const set = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const res = await uploadFileToDrive(file);
    setUploading(false);
    if (!res) {
      showToast('Gagal mengunggah lampiran', 'error');
      return;
    }
    setForm((f) => ({ ...f, lampiran_url: res.url, lampiran_nama: file.name }));
    showToast('Lampiran berhasil diunggah', 'success');
  };

  const removeLampiran = () => {
    setForm((f) => ({ ...f, lampiran_url: '', lampiran_nama: '' }));
  };

  const reset = () => {
    setForm({ ...emptyForm, tanggal: todayStr() });
    setSuccess(null);
  };

  const validate = (): string | null => {
    if (!form.nama_kegiatan.trim()) return 'Nama kegiatan wajib diisi';
    if (!form.jenis_kegiatan.trim()) return 'Jenis kegiatan wajib dipilih';
    if (!form.organisasi_jurusan.trim()) return 'Organisasi/Jurusan wajib diisi';
    if (!form.penanggung_jawab.trim()) return 'Penanggung jawab wajib diisi';
    const peserta = Number(form.jumlah_peserta);
    if (!form.jumlah_peserta || isNaN(peserta) || peserta < 1)
      return 'Jumlah peserta minimal 1';
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
    const payload = {
      nama_kegiatan: form.nama_kegiatan.trim(),
      jenis_kegiatan: form.jenis_kegiatan,
      organisasi_jurusan: form.organisasi_jurusan.trim(),
      penanggung_jawab: form.penanggung_jawab.trim(),
      jumlah_peserta: Number(form.jumlah_peserta),
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
    setSubmitting(false);
    if (error) {
      showToast('Gagal menyimpan agenda: ' + error.message, 'error');
      return;
    }
    showToast('Agenda berhasil disimpan', 'success');
    setSuccess({
      nama_kegiatan: payload.nama_kegiatan,
      tanggal: payload.tanggal,
      waktu_mulai: payload.waktu_mulai,
      waktu_selesai: payload.waktu_selesai,
      lokasi: payload.lokasi,
      jenis_kegiatan: payload.jenis_kegiatan,
    });
    setForm({ ...emptyForm, tanggal: todayStr() });
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Agenda Berhasil Disimpan
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Agenda akan otomatis muncul di Timeline.
          </p>
          <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Nama</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{success.nama_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Jenis</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{success.jenis_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Tanggal</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{success.tanggal}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Waktu</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{success.waktu_mulai} - {success.waktu_selesai}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{success.lokasi}</span>
            </div>
          </div>
          <button onClick={reset} className="btn-primary mt-6">
            <CalendarPlus className="h-4 w-4" />
            Buat Agenda Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Buat Agenda Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Catat kegiatan sekolah yang tidak meminjam barang atau fasilitas. Agenda akan otomatis muncul di Timeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Informasi Kegiatan */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">Informasi Kegiatan</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nama Kegiatan <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.nama_kegiatan}
                onChange={(e) => set('nama_kegiatan', e.target.value)}
                placeholder="Mis. Rapat Koordinasi Guru"
              />
            </div>
            <div>
              <label className="label">Jenis Kegiatan <span className="text-red-500">*</span></label>
              <select
                className="input"
                value={form.jenis_kegiatan}
                onChange={(e) => set('jenis_kegiatan', e.target.value)}
              >
                {JENIS_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Organisasi / Jurusan <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.organisasi_jurusan}
                onChange={(e) => set('organisasi_jurusan', e.target.value)}
                placeholder="Mis. OSIS / TKR"
              />
            </div>
            <div>
              <label className="label">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.penanggung_jawab}
                onChange={(e) => set('penanggung_jawab', e.target.value)}
                placeholder="Nama penanggung jawab"
              />
            </div>
            <div>
              <label className="label">Jumlah Peserta <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.jumlah_peserta}
                onChange={(e) => set('jumlah_peserta', e.target.value)}
                placeholder="Minimal 1"
              />
            </div>
          </div>
        </div>

        {/* Waktu */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">Waktu</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Tanggal <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="input"
                value={form.tanggal}
                onChange={(e) => set('tanggal', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Waktu Mulai <span className="text-red-500">*</span></label>
              <input
                type="time"
                className="input"
                value={form.waktu_mulai}
                onChange={(e) => set('waktu_mulai', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Waktu Selesai <span className="text-red-500">*</span></label>
              <input
                type="time"
                className="input"
                value={form.waktu_selesai}
                onChange={(e) => set('waktu_selesai', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Lokasi */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">Lokasi</h2>
          <div>
            <label className="label">Lokasi Kegiatan <span className="text-red-500">*</span></label>
            <input
              className="input"
              value={form.lokasi}
              onChange={(e) => set('lokasi', e.target.value)}
              placeholder="Mis. Aula Sekolah / Lapangan Luar"
            />
          </div>
        </div>

        {/* Deskripsi */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">Deskripsi</h2>
          <div>
            <label className="label">Deskripsi</label>
            <textarea
              className="input min-h-[100px] resize-y"
              value={form.deskripsi}
              onChange={(e) => set('deskripsi', e.target.value)}
              placeholder="Deskripsi kegiatan (opsional)"
            />
          </div>
        </div>

        {/* Lampiran */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">Lampiran (Opsional)</h2>
          {form.lampiran_nama ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {form.lampiran_nama}
                </span>
              </div>
              <button
                type="button"
                onClick={removeLampiran}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <X className="h-4 w-4" />
                Hapus Lampiran
              </button>
            </div>
          ) : (
            <label className={cn(
              'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
              uploading && 'pointer-events-none opacity-70',
            )}>
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
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={(e) => handleFile(e.target.files?.[0])}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* Tombol */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" className="btn-primary" disabled={submitting || uploading}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <CalendarPlus className="h-4 w-4" />
                Simpan Agenda
              </>
            )}
          </button>
          <button type="button" onClick={reset} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

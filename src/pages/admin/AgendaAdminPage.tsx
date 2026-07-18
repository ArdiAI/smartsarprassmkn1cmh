import { useState, type FormEvent } from 'react';
import { CalendarPlus, Loader2, Upload, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadFileToDrive } from '../../lib/upload';
import { showToast } from '../../components/Toast';

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
}

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
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
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
};

interface SavedSummary {
  nama_kegiatan: string;
  jenis_kegiatan: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  lokasi: string;
}

export default function AgendaAdminPage() {
  const [form, setForm] = useState<AgendaForm>(emptyForm);
  const [lampiranUrl, setLampiranUrl] = useState<string | null>(null);
  const [lampiranNama, setLampiranNama] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<SavedSummary | null>(null);

  function update<K extends keyof AgendaForm>(key: K, value: AgendaForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFileToDrive(file);
      if (!result) {
        showToast('Gagal mengunggah lampiran', 'error');
        setUploading(false);
        return;
      }
      setLampiranUrl(result.url);
      setLampiranNama(file.name);
      showToast('Lampiran berhasil diunggah', 'success');
    } catch {
      showToast('Gagal mengunggah lampiran', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function hapusLampiran() {
    setLampiranUrl(null);
    setLampiranNama(null);
  }

  function resetForm() {
    setForm(emptyForm);
    setLampiranUrl(null);
    setLampiranNama(null);
    setSaved(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saved) return;

    if (!form.nama_kegiatan.trim()) return showToast('Nama kegiatan wajib diisi', 'warning');
    if (!form.jenis_kegiatan) return showToast('Jenis kegiatan wajib dipilih', 'warning');
    if (!form.organisasi_jurusan.trim()) return showToast('Organisasi/Jurusan wajib diisi', 'warning');
    if (!form.penanggung_jawab.trim()) return showToast('Penanggung jawab wajib diisi', 'warning');
    const peserta = parseInt(form.jumlah_peserta, 10);
    if (!form.jumlah_peserta || isNaN(peserta) || peserta < 1)
      return showToast('Jumlah peserta minimal 1', 'warning');
    if (!form.tanggal) return showToast('Tanggal wajib diisi', 'warning');
    if (!form.waktu_mulai) return showToast('Waktu mulai wajib diisi', 'warning');
    if (!form.waktu_selesai) return showToast('Waktu selesai wajib diisi', 'warning');
    if (form.waktu_selesai <= form.waktu_mulai)
      return showToast('Waktu selesai harus setelah waktu mulai', 'warning');
    if (!form.lokasi.trim()) return showToast('Lokasi wajib diisi', 'warning');

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
        lampiran_url: lampiranUrl,
        lampiran_nama: lampiranNama,
        status: 'scheduled',
        penyelenggara: form.organisasi_jurusan.trim(),
      };
      const { error } = await supabase.from('agendas').insert(payload);
      if (error) {
        showToast('Gagal menyimpan agenda: ' + error.message, 'error');
        setSubmitting(false);
        return;
      }
      showToast('Agenda berhasil disimpan', 'success');
      setSaved({
        nama_kegiatan: form.nama_kegiatan.trim(),
        jenis_kegiatan: form.jenis_kegiatan,
        tanggal: form.tanggal,
        waktu_mulai: form.waktu_mulai,
        waktu_selesai: form.waktu_selesai,
        lokasi: form.lokasi.trim(),
      });
    } catch (err) {
      showToast('Gagal menyimpan agenda', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card flex flex-col items-center py-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">
            Agenda Berhasil Disimpan
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Agenda akan otomatis muncul di Timeline.
          </p>
          <div className="mt-5 w-full max-w-md space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Nama</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{saved.nama_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Jenis</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{saved.jenis_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Tanggal</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{saved.tanggal}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Waktu</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {saved.waktu_mulai} - {saved.waktu_selesai}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{saved.lokasi}</span>
            </div>
          </div>
          <button onClick={resetForm} className="btn-primary mt-6">
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
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">
            Informasi Kegiatan
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nama Kegiatan <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.nama_kegiatan}
                onChange={(e) => update('nama_kegiatan', e.target.value)}
                placeholder="Contoh: Rapat Koordinasi Guru"
              />
            </div>
            <div>
              <label className="label">Jenis Kegiatan <span className="text-red-500">*</span></label>
              <select
                className="input"
                value={form.jenis_kegiatan}
                onChange={(e) => update('jenis_kegiatan', e.target.value)}
              >
                <option value="">Pilih jenis kegiatan</option>
                {JENIS_OPTIONS.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Organisasi / Jurusan <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.organisasi_jurusan}
                onChange={(e) => update('organisasi_jurusan', e.target.value)}
                placeholder="Contoh: OSIS / TKR"
              />
            </div>
            <div>
              <label className="label">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.penanggung_jawab}
                onChange={(e) => update('penanggung_jawab', e.target.value)}
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
                onChange={(e) => update('jumlah_peserta', e.target.value)}
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
                onChange={(e) => update('tanggal', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Waktu Mulai <span className="text-red-500">*</span></label>
              <input
                type="time"
                className="input"
                value={form.waktu_mulai}
                onChange={(e) => update('waktu_mulai', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Waktu Selesai <span className="text-red-500">*</span></label>
              <input
                type="time"
                className="input"
                value={form.waktu_selesai}
                onChange={(e) => update('waktu_selesai', e.target.value)}
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
              onChange={(e) => update('lokasi', e.target.value)}
              placeholder="Contoh: Aula Sekolah / Lapangan / Lokasi luar sekolah"
            />
          </div>
        </div>

        {/* Deskripsi */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">Deskripsi</h2>
          <div>
            <label className="label">Deskripsi (opsional)</label>
            <textarea
              rows={4}
              className="input"
              value={form.deskripsi}
              onChange={(e) => update('deskripsi', e.target.value)}
              placeholder="Deskripsi singkat kegiatan"
            />
          </div>
        </div>

        {/* Lampiran */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-200">
            Lampiran (Opsional)
          </h2>
          {lampiranNama ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {lampiranNama}
                </span>
              </div>
              <button type="button" onClick={hapusLampiran} className="btn-secondary px-3 py-1.5 text-xs">
                <X className="h-4 w-4" />
                Hapus Lampiran
              </button>
            </div>
          ) : (
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
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
                onChange={handleFile}
                disabled={uploading}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              />
            </label>
          )}
        </div>

        {/* Tombol */}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={submitting}>
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
          <button type="button" onClick={resetForm} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

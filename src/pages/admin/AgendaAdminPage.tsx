import { useState } from 'react';
import { CalendarPlus, Loader2, Upload, X, CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadFileToDrive } from '../../lib/upload';
import { showToast } from '../../components/Toast';

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
  lampiran_url: string;
  lampiran_nama: string;
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
  lampiran_url: '',
  lampiran_nama: '',
};

export default function AgendaAdminPage() {
  const [form, setForm] = useState<AgendaForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState<AgendaForm | null>(null);

  function update<K extends keyof AgendaForm>(key: K, value: AgendaForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFileToDrive(file);
    setUploading(false);
    if (!result) {
      showToast('Gagal mengunggah lampiran', 'error');
      e.target.value = '';
      return;
    }
    update('lampiran_url', result.url);
    update('lampiran_nama', file.name);
    showToast('Lampiran berhasil diunggah', 'success');
  }

  function handleRemoveLampiran() {
    update('lampiran_url', '');
    update('lampiran_nama', '');
  }

  function validate(): string | null {
    if (!form.nama_kegiatan.trim()) return 'Nama kegiatan wajib diisi';
    if (!form.jenis_kegiatan) return 'Jenis kegiatan wajib dipilih';
    if (!form.organisasi_jurusan.trim()) return 'Organisasi/Jurusan wajib diisi';
    if (!form.penanggung_jawab.trim()) return 'Penanggung jawab wajib diisi';
    const peserta = parseInt(form.jumlah_peserta, 10);
    if (!form.jumlah_peserta || isNaN(peserta) || peserta < 1)
      return 'Jumlah peserta minimal 1';
    if (!form.tanggal) return 'Tanggal wajib diisi';
    if (!form.waktu_mulai) return 'Waktu mulai wajib diisi';
    if (!form.waktu_selesai) return 'Waktu selesai wajib diisi';
    if (form.waktu_selesai <= form.waktu_mulai)
      return 'Waktu selesai harus setelah waktu mulai';
    if (!form.lokasi.trim()) return 'Lokasi wajib diisi';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
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
      jumlah_peserta: parseInt(form.jumlah_peserta, 10),
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
    setSaved({ ...form });
    setForm(emptyForm);
  }

  function handleReset() {
    setForm(emptyForm);
  }

  function handleBuatLagi() {
    setSaved(null);
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="card flex flex-col items-center text-center">
          <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-500" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Agenda Berhasil Disimpan
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Agenda akan otomatis muncul di halaman Timeline.
          </p>
          <div className="mt-5 w-full space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Nama</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{saved.nama_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Jenis</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{saved.jenis_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Organisasi</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{saved.organisasi_jurusan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Penanggung Jawab</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{saved.penanggung_jawab}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Tanggal</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{saved.tanggal}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Waktu</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{saved.waktu_mulai} - {saved.waktu_selesai}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{saved.lokasi}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Peserta</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{saved.jumlah_peserta}</span>
            </div>
            {saved.lampiran_nama && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">Lampiran</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{saved.lampiran_nama}</span>
              </div>
            )}
          </div>
          <button onClick={handleBuatLagi} className="btn-primary mt-6">
            <CalendarPlus className="h-4 w-4" />
            Buat Agenda Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Buat Agenda Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Catat kegiatan sekolah yang tidak meminjam barang atau fasilitas. Agenda akan otomatis muncul di Timeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Informasi Kegiatan */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">Informasi Kegiatan</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nama Kegiatan <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.nama_kegiatan}
                onChange={(e) => update('nama_kegiatan', e.target.value)}
                placeholder="Masukkan nama kegiatan"
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
                placeholder="Masukkan organisasi/jurusan"
              />
            </div>
            <div>
              <label className="label">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.penanggung_jawab}
                onChange={(e) => update('penanggung_jawab', e.target.value)}
                placeholder="Masukkan penanggung jawab"
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
                placeholder="1"
              />
            </div>
          </div>
        </div>

        {/* Waktu */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">Waktu</h2>
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
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">Lokasi</h2>
          <div>
            <label className="label">Lokasi Kegiatan <span className="text-red-500">*</span></label>
            <input
              className="input"
              value={form.lokasi}
              onChange={(e) => update('lokasi', e.target.value)}
              placeholder="Masukkan lokasi kegiatan"
            />
          </div>
        </div>

        {/* Deskripsi */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">Deskripsi</h2>
          <div>
            <label className="label">Deskripsi</label>
            <textarea
              className="input min-h-[100px]"
              value={form.deskripsi}
              onChange={(e) => update('deskripsi', e.target.value)}
              placeholder="Deskripsi kegiatan (opsional)"
            />
          </div>
        </div>

        {/* Lampiran */}
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">Lampiran (Opsional)</h2>
          {form.lampiran_url ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{form.lampiran_nama}</span>
              </div>
              <button type="button" onClick={handleRemoveLampiran} className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
                <X className="h-4 w-4" />
                Hapus Lampiran
              </button>
            </div>
          ) : (
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
                  onChange={handleFile}
                  disabled={uploading}
                />
              </label>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Mendukung dokumen dan gambar.
              </p>
            </div>
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
          <button type="button" onClick={handleReset} className="btn-secondary">
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

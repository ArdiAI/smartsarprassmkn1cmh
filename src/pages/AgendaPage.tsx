import { useState } from 'react';
import {
  CalendarDays,
  Loader2,
  Upload,
  X,
  CheckCircle2,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  Save,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadFileToDrive } from '../lib/upload';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

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

const jenisOptions = [
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

export default function AgendaPage() {
  const [form, setForm] = useState<AgendaForm>(emptyForm);
  const [lampiranUrl, setLampiranUrl] = useState<string | null>(null);
  const [lampiranNama, setLampiranNama] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedAgenda, setSavedAgenda] = useState<AgendaForm | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFileToDrive(file);
      if (result) {
        setLampiranUrl(result.url);
        setLampiranNama(file.name);
        showToast('Lampiran berhasil diunggah', 'success');
      } else {
        showToast('Gagal mengunggah lampiran', 'error');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveLampiran = () => {
    setLampiranUrl(null);
    setLampiranNama(null);
  };

  const validate = (): boolean => {
    if (!form.nama_kegiatan.trim()) {
      showToast('Nama kegiatan wajib diisi', 'error');
      return false;
    }
    if (!form.jenis_kegiatan) {
      showToast('Jenis kegiatan wajib dipilih', 'error');
      return false;
    }
    if (!form.organisasi_jurusan.trim()) {
      showToast('Organisasi/Jurusan wajib diisi', 'error');
      return false;
    }
    if (!form.penanggung_jawab.trim()) {
      showToast('Penanggung jawab wajib diisi', 'error');
      return false;
    }
    const peserta = parseInt(form.jumlah_peserta, 10);
    if (!form.jumlah_peserta || isNaN(peserta) || peserta < 1) {
      showToast('Jumlah peserta minimal 1', 'error');
      return false;
    }
    if (!form.tanggal) {
      showToast('Tanggal wajib diisi', 'error');
      return false;
    }
    if (!form.waktu_mulai) {
      showToast('Waktu mulai wajib diisi', 'error');
      return false;
    }
    if (!form.waktu_selesai) {
      showToast('Waktu selesai wajib diisi', 'error');
      return false;
    }
    if (form.waktu_selesai <= form.waktu_mulai) {
      showToast('Waktu selesai harus setelah waktu mulai', 'error');
      return false;
    }
    if (!form.lokasi.trim()) {
      showToast('Lokasi wajib diisi', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

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
        lampiran_url: lampiranUrl,
        lampiran_nama: lampiranNama,
        status: 'scheduled',
        penyelenggara: form.organisasi_jurusan.trim(),
      };

      const { error } = await supabase.from('agendas').insert(payload);

      if (error) {
        showToast('Gagal menyimpan agenda: ' + error.message, 'error');
        return;
      }

      setSavedAgenda({ ...form });
      setSuccess(true);
      showToast('Agenda berhasil disimpan!', 'success');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setLampiranUrl(null);
    setLampiranNama(null);
    setSuccess(false);
    setSavedAgenda(null);
  };

  if (success && savedAgenda) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center dark:border-emerald-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Agenda Tersimpan</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Agenda kegiatan Anda telah berhasil disimpan dan akan otomatis muncul di Timeline.
          </p>

          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Nama Kegiatan</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedAgenda.nama_kegiatan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Jenis</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedAgenda.jenis_kegiatan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Organisasi</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedAgenda.organisasi_jurusan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Penanggung Jawab</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedAgenda.penanggung_jawab}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Tanggal</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {new Date(savedAgenda.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Waktu</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {savedAgenda.waktu_mulai} - {savedAgenda.waktu_selesai}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedAgenda.lokasi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Peserta</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{savedAgenda.jumlah_peserta} orang</span>
            </div>
            {lampiranNama && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Lampiran</span>
                <span className="truncate font-medium text-slate-800 dark:text-slate-200">{lampiranNama}</span>
              </div>
            )}
          </div>

          <button
            onClick={resetForm}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RotateCcw className="h-4 w-4" />
            Buat Agenda Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
          <CalendarDays className="h-7 w-7 text-brand-600 dark:text-brand-400" />
          Buat Agenda Kegiatan
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Catat kegiatan sekolah yang tidak meminjam barang atau fasilitas. Agenda akan otomatis muncul di Timeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informasi Kegiatan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Informasi Kegiatan</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nama Kegiatan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nama_kegiatan}
                onChange={(e) => setForm({ ...form, nama_kegiatan: e.target.value })}
                placeholder="Contoh: Rapat Pleno Awal Tahun Ajaran"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Jenis Kegiatan <span className="text-red-500">*</span>
              </label>
              <select
                value={form.jenis_kegiatan}
                onChange={(e) => setForm({ ...form, jenis_kegiatan: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              >
                <option value="">Pilih jenis kegiatan</option>
                {jenisOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Organisasi / Jurusan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.organisasi_jurusan}
                onChange={(e) => setForm({ ...form, organisasi_jurusan: e.target.value })}
                placeholder="Contoh: OSIS, Jurusan RPL"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Penanggung Jawab <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.penanggung_jawab}
                onChange={(e) => setForm({ ...form, penanggung_jawab: e.target.value })}
                placeholder="Nama penanggung jawab"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Jumlah Peserta <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.jumlah_peserta}
                onChange={(e) => setForm({ ...form, jumlah_peserta: e.target.value })}
                min={1}
                placeholder="Contoh: 50"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Waktu */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Waktu</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Waktu Mulai <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.waktu_mulai}
                onChange={(e) => setForm({ ...form, waktu_mulai: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Waktu Selesai <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={form.waktu_selesai}
                onChange={(e) => setForm({ ...form, waktu_selesai: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Lokasi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Lokasi</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Lokasi Kegiatan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.lokasi}
              onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
              placeholder="Contoh: Aula Utama, Lapangan Sekolah, atau lokasi di luar sekolah"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
          </div>
        </div>

        {/* Deskripsi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">Deskripsi</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Deskripsi <span className="text-slate-400">(opsional)</span>
            </label>
            <textarea
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              rows={4}
              placeholder="Deskripsi singkat tentang kegiatan..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Lampiran */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold uppercase text-slate-400">
            Lampiran <span className="text-slate-400 normal-case">(Opsional)</span>
          </h2>
          {lampiranUrl ? (
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {lampiranNama?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <ImageIcon className="h-8 w-8 text-brand-500" />
                ) : (
                  <FileText className="h-8 w-8 text-brand-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{lampiranNama}</p>
                <button
                  type="button"
                  onClick={handleRemoveLampiran}
                  className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Hapus Lampiran
                </button>
              </div>
            </div>
          ) : (
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center transition hover:border-brand-500 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-500 dark:hover:bg-brand-900/20',
                uploading && 'pointer-events-none opacity-60',
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Mengunggah lampiran...</p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                    <Upload className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Upload File atau Foto
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Dokumen atau gambar (maks. 10MB)</p>
                </>
              )}
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Agenda
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

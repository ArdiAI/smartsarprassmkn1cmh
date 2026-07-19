import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFileToDrive } from '../../lib/upload';
import { showToast } from '../../components/Toast';
import {
  CalendarPlus,
  Save,
  RotateCcw,
  Upload,
  Loader2,
  X,
  CheckCircle2,
  FileText,
  Calendar,
  Clock,
  MapPin,
  AlignLeft,
  Paperclip,
} from 'lucide-react';

interface AgendaFormData {
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

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const emptyForm: AgendaFormData = {
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

export default function AgendaAdminPage() {
  const [form, setForm] = useState<AgendaFormData>(emptyForm);
  const [lampiranUrl, setLampiranUrl] = useState<string | null>(null);
  const [lampiranNama, setLampiranNama] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ nama: string; tanggal: string; waktu: string; lokasi: string } | null>(null);

  const update = (field: keyof AgendaFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch {
      showToast('Gagal mengunggah lampiran', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveLampiran = () => {
    setLampiranUrl(null);
    setLampiranNama(null);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setLampiranUrl(null);
    setLampiranNama(null);
  };

  const validate = (): string | null => {
    if (!form.nama_kegiatan.trim()) return 'Nama kegiatan wajib diisi';
    if (!form.jenis_kegiatan.trim()) return 'Jenis kegiatan wajib dipilih';
    if (!form.organisasi_jurusan.trim()) return 'Organisasi / Jurusan wajib diisi';
    if (!form.penanggung_jawab.trim()) return 'Penanggung jawab wajib diisi';
    const peserta = parseInt(form.jumlah_peserta, 10);
    if (isNaN(peserta) || peserta < 1) return 'Jumlah peserta minimal 1';
    if (!form.tanggal) return 'Tanggal wajib diisi';
    if (!form.waktu_mulai) return 'Waktu mulai wajib diisi';
    if (!form.waktu_selesai) return 'Waktu selesai wajib diisi';
    if (form.waktu_selesai <= form.waktu_mulai) return 'Waktu selesai harus setelah waktu mulai';
    if (!form.lokasi.trim()) return 'Lokasi wajib diisi';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      showToast(error, 'error');
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
        lampiran_url: lampiranUrl,
        lampiran_nama: lampiranNama,
        status: 'scheduled',
        penyelenggara: form.organisasi_jurusan.trim(),
      };
      const { error: insertError } = await supabase.from('agendas').insert(payload);
      if (insertError) {
        showToast('Gagal menyimpan agenda: ' + insertError.message, 'error');
        return;
      }
      showToast('Agenda berhasil disimpan', 'success');
      setSuccess({
        nama: form.nama_kegiatan,
        tanggal: form.tanggal,
        waktu: `${form.waktu_mulai} - ${form.waktu_selesai}`,
        lokasi: form.lokasi,
      });
      resetForm();
    } catch {
      showToast('Gagal menyimpan agenda', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Agenda Berhasil Disimpan</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Agenda akan otomatis muncul di Timeline.
          </p>
          <div className="mt-5 w-full space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
            <div className="flex gap-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">Nama:</span>
              <span className="text-slate-800 dark:text-slate-100">{success.nama}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">Tanggal:</span>
              <span className="text-slate-800 dark:text-slate-100">{success.tanggal}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">Waktu:</span>
              <span className="text-slate-800 dark:text-slate-100">{success.waktu}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">Lokasi:</span>
              <span className="text-slate-800 dark:text-slate-100">{success.lokasi}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="btn-primary mt-5"
          >
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
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Informasi Kegiatan</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nama Kegiatan <span className="text-red-500">*</span></label>
              <input
                type="text"
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
                {JENIS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Organisasi / Jurusan <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input"
                value={form.organisasi_jurusan}
                onChange={(e) => update('organisasi_jurusan', e.target.value)}
                placeholder="Masukkan organisasi / jurusan"
              />
            </div>
            <div>
              <label className="label">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input"
                value={form.penanggung_jawab}
                onChange={(e) => update('penanggung_jawab', e.target.value)}
                placeholder="Masukkan nama penanggung jawab"
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
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Waktu</h2>
          </div>
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
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Lokasi</h2>
          </div>
          <div>
            <label className="label">Lokasi Kegiatan <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="input"
              value={form.lokasi}
              onChange={(e) => update('lokasi', e.target.value)}
              placeholder="Masukkan lokasi kegiatan"
            />
          </div>
        </div>

        {/* Deskripsi */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <AlignLeft className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Deskripsi</h2>
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea
              className="input min-h-[100px] resize-y"
              value={form.deskripsi}
              onChange={(e) => update('deskripsi', e.target.value)}
              placeholder="Deskripsi kegiatan (opsional)"
            />
          </div>
        </div>

        {/* Lampiran */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Lampiran (Opsional)</h2>
          </div>
          {!lampiranNama ? (
            <div>
              <label className="label">Upload File / Foto</label>
              <label className="btn-secondary cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Pilih File
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
              <p className="mt-2 text-xs text-slate-400">Dokumen atau gambar</p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{lampiranNama}</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveLampiran}
                className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <X className="h-4 w-4" />
                Hapus Lampiran
              </button>
            </div>
          )}
        </div>

        {/* Tombol */}
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={submitting}>
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

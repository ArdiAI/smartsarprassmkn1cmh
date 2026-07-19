import { useState } from 'react';
import { CalendarDays, Save, RotateCcw, CheckCircle2, Loader2, Upload, X, FileText } from 'lucide-react';
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

const JENIS_OPTIONS = [
  'Rapat', 'Upacara', 'Lomba', 'Seminar', 'Workshop',
  'Ekstrakurikuler', 'Senam', 'Peringatan', 'Sosial', 'Lainnya',
];

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
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

export default function AgendaPage() {
  const [form, setForm] = useState<AgendaForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<AgendaForm | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lampiranUrl, setLampiranUrl] = useState<string | null>(null);
  const [lampiranNama, setLampiranNama] = useState<string | null>(null);

  const set = (k: keyof AgendaForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFileToDrive(file, file.name);
    setUploading(false);
    if (result) {
      setLampiranUrl(result.url);
      setLampiranNama(file.name);
      showToast('Lampiran berhasil diunggah', 'success');
    } else {
      showToast('Gagal mengunggah lampiran', 'error');
    }
    e.target.value = '';
  };

  const removeLampiran = () => {
    setLampiranUrl(null);
    setLampiranNama(null);
  };

  const validate = (): string | null => {
    if (!form.nama_kegiatan.trim()) return 'Nama kegiatan wajib diisi';
    if (!form.jenis_kegiatan) return 'Jenis kegiatan wajib dipilih';
    if (!form.organisasi_jurusan.trim()) return 'Organisasi/Jurusan wajib diisi';
    if (!form.penanggung_jawab.trim()) return 'Penanggung jawab wajib diisi';
    const jml = Number(form.jumlah_peserta);
    if (!form.jumlah_peserta || isNaN(jml) || jml < 1) return 'Jumlah peserta minimal 1';
    if (!form.tanggal) return 'Tanggal wajib diisi';
    if (!form.waktu_mulai) return 'Waktu mulai wajib diisi';
    if (!form.waktu_selesai) return 'Waktu selesai wajib diisi';
    if (form.waktu_selesai <= form.waktu_mulai) return 'Waktu selesai harus setelah waktu mulai';
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
        jumlah_peserta: Number(form.jumlah_peserta),
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
      if (error) throw error;
      setSuccess({ ...form });
      showToast('Agenda berhasil disimpan', 'success');
    } catch {
      showToast('Gagal menyimpan agenda', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setLampiranUrl(null);
    setLampiranNama(null);
    setSuccess(null);
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Agenda Berhasil Disimpan</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Agenda akan otomatis muncul di halaman Timeline.
          </p>
          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/50">
            <div className="flex justify-between gap-4"><span className="text-slate-500">Nama</span><span className="font-semibold text-slate-900 dark:text-white">{success.nama_kegiatan}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Jenis</span><span className="font-semibold text-slate-900 dark:text-white">{success.jenis_kegiatan}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Organisasi</span><span className="font-semibold text-slate-900 dark:text-white">{success.organisasi_jurusan}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">PJ</span><span className="font-semibold text-slate-900 dark:text-white">{success.penanggung_jawab}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Peserta</span><span className="font-semibold text-slate-900 dark:text-white">{success.jumlah_peserta}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Tanggal</span><span className="font-semibold text-slate-900 dark:text-white">{success.tanggal}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Waktu</span><span className="font-semibold text-slate-900 dark:text-white">{success.waktu_mulai} - {success.waktu_selesai}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Lokasi</span><span className="font-semibold text-slate-900 dark:text-white">{success.lokasi}</span></div>
            {lampiranNama && (
              <div className="flex justify-between gap-4"><span className="text-slate-500">Lampiran</span><span className="font-semibold text-slate-900 dark:text-white">{lampiranNama}</span></div>
            )}
          </div>
          <button onClick={resetForm} className="btn-primary mt-6">
            <CalendarDays className="h-4 w-4" />
            Buat Agenda Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buat Agenda Kegiatan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Catat kegiatan sekolah yang tidak meminjam barang atau fasilitas. Agenda akan otomatis muncul di Timeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informasi Kegiatan */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            Informasi Kegiatan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nama Kegiatan <span className="text-red-500">*</span></label>
              <input className="input" value={form.nama_kegiatan} onChange={(e) => set('nama_kegiatan', e.target.value)} placeholder="Mis. Rapat Koordinasi Guru" />
            </div>
            <div>
              <label className="label">Jenis Kegiatan <span className="text-red-500">*</span></label>
              <select className="input" value={form.jenis_kegiatan} onChange={(e) => set('jenis_kegiatan', e.target.value)}>
                <option value="">Pilih jenis...</option>
                {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Organisasi / Jurusan <span className="text-red-500">*</span></label>
              <input className="input" value={form.organisasi_jurusan} onChange={(e) => set('organisasi_jurusan', e.target.value)} placeholder="Mis. OSIS / TKR" />
            </div>
            <div>
              <label className="label">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input className="input" value={form.penanggung_jawab} onChange={(e) => set('penanggung_jawab', e.target.value)} placeholder="Nama PJ" />
            </div>
            <div>
              <label className="label">Jumlah Peserta <span className="text-red-500">*</span></label>
              <input type="number" min={1} className="input" value={form.jumlah_peserta} onChange={(e) => set('jumlah_peserta', e.target.value)} placeholder="50" />
            </div>
          </div>
        </div>

        {/* Waktu */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            Waktu
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Tanggal <span className="text-red-500">*</span></label>
              <input type="date" className="input" value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
            </div>
            <div>
              <label className="label">Waktu Mulai <span className="text-red-500">*</span></label>
              <input type="time" className="input" value={form.waktu_mulai} onChange={(e) => set('waktu_mulai', e.target.value)} />
            </div>
            <div>
              <label className="label">Waktu Selesai <span className="text-red-500">*</span></label>
              <input type="time" className="input" value={form.waktu_selesai} onChange={(e) => set('waktu_selesai', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Lokasi */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            Lokasi
          </h2>
          <div>
            <label className="label">Lokasi Kegiatan <span className="text-red-500">*</span></label>
            <input className="input" value={form.lokasi} onChange={(e) => set('lokasi', e.target.value)} placeholder="Mis. Aula / Lapangan / Luar sekolah" />
          </div>
        </div>

        {/* Deskripsi */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <FileText className="h-5 w-5 text-brand-600" />
            Deskripsi
          </h2>
          <div>
            <label className="label">Deskripsi (opsional)</label>
            <textarea className="input min-h-[100px]" value={form.deskripsi} onChange={(e) => set('deskripsi', e.target.value)} placeholder="Deskripsi singkat kegiatan..." />
          </div>
        </div>

        {/* Lampiran */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Upload className="h-5 w-5 text-brand-600" />
            Lampiran (Opsional)
          </h2>
          {lampiranNama ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-5 w-5 shrink-0 text-brand-600" />
                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{lampiranNama}</span>
              </div>
              <button type="button" onClick={removeLampiran} className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className={cn('btn-secondary cursor-pointer', uploading && 'pointer-events-none opacity-60')}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Mengunggah...' : 'Upload File / Foto'}
              <input type="file" className="hidden" onChange={handleFile} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
            </label>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={submitting || uploading}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? 'Menyimpan...' : 'Simpan Agenda'}
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

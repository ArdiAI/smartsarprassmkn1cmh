import { useState, type FormEvent } from 'react';
import { CalendarDays, Save, RotateCcw, CheckCircle2, Upload, Loader2, X, FileText } from 'lucide-react';
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
  lampiran_url: string | null;
  lampiran_nama: string | null;
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

export default function AgendaAdminPage() {
  const [form, setForm] = useState<AgendaForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState<AgendaForm | null>(null);

  const set = <K extends keyof AgendaForm>(key: K, value: AgendaForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const result = await uploadFileToDrive(file);
    setUploading(false);
    if (!result) {
      showToast('Gagal mengunggah lampiran', 'error');
      return;
    }
    set('lampiran_url', result.url);
    set('lampiran_nama', file.name);
    showToast('Lampiran berhasil diunggah', 'success');
  };

  const removeLampiran = () => {
    set('lampiran_url', null);
    set('lampiran_nama', null);
  };

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saved) {
      setSaved(null);
      resetForm();
      return;
    }

    if (!form.nama_kegiatan.trim()) return showToast('Nama kegiatan wajib diisi', 'error');
    if (!form.jenis_kegiatan) return showToast('Jenis kegiatan wajib dipilih', 'error');
    if (!form.organisasi_jurusan.trim()) return showToast('Organisasi/Jurusan wajib diisi', 'error');
    if (!form.penanggung_jawab.trim()) return showToast('Penanggung jawab wajib diisi', 'error');
    const peserta = parseInt(form.jumlah_peserta, 10);
    if (!form.jumlah_peserta || isNaN(peserta) || peserta < 1)
      return showToast('Jumlah peserta minimal 1', 'error');
    if (!form.tanggal) return showToast('Tanggal wajib diisi', 'error');
    if (!form.waktu_mulai) return showToast('Waktu mulai wajib diisi', 'error');
    if (!form.waktu_selesai) return showToast('Waktu selesai wajib diisi', 'error');
    if (form.waktu_selesai <= form.waktu_mulai)
      return showToast('Waktu selesai harus setelah waktu mulai', 'error');
    if (!form.lokasi.trim()) return showToast('Lokasi wajib diisi', 'error');

    setSubmitting(true);
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
      lampiran_url: form.lampiran_url,
      lampiran_nama: form.lampiran_nama,
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
    resetForm();
  };

  if (saved) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Agenda Berhasil Disimpan</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Agenda akan otomatis muncul di halaman Timeline.
          </p>
          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/60">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Nama Kegiatan</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{saved.nama_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Jenis</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{saved.jenis_kegiatan}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Tanggal</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{saved.tanggal}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Waktu</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {saved.waktu_mulai} - {saved.waktu_selesai}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Lokasi</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{saved.lokasi}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Penanggung Jawab</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{saved.penanggung_jawab}</span>
            </div>
            {saved.lampiran_nama && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">Lampiran</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{saved.lampiran_nama}</span>
              </div>
            )}
          </div>
          <button onClick={() => { setSaved(null); resetForm(); }} className="btn-primary mt-6">
            <RotateCcw className="h-4 w-4" /> Buat Agenda Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
          <CalendarDays className="h-6 w-6 text-brand-600" /> Buat Agenda Kegiatan
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Catat kegiatan sekolah yang tidak meminjam barang atau fasilitas. Agenda akan otomatis muncul di Timeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Informasi Kegiatan */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Informasi Kegiatan</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nama Kegiatan <span className="text-red-500">*</span></label>
              <input className="input" value={form.nama_kegiatan} onChange={(e) => set('nama_kegiatan', e.target.value)} placeholder="Masukkan nama kegiatan" />
            </div>
            <div>
              <label className="label">Jenis Kegiatan <span className="text-red-500">*</span></label>
              <select className="input" value={form.jenis_kegiatan} onChange={(e) => set('jenis_kegiatan', e.target.value)}>
                <option value="">Pilih jenis kegiatan</option>
                {JENIS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Organisasi / Jurusan <span className="text-red-500">*</span></label>
              <input className="input" value={form.organisasi_jurusan} onChange={(e) => set('organisasi_jurusan', e.target.value)} placeholder="Masukkan organisasi/jurusan" />
            </div>
            <div>
              <label className="label">Penanggung Jawab <span className="text-red-500">*</span></label>
              <input className="input" value={form.penanggung_jawab} onChange={(e) => set('penanggung_jawab', e.target.value)} placeholder="Masukkan nama penanggung jawab" />
            </div>
            <div>
              <label className="label">Jumlah Peserta <span className="text-red-500">*</span></label>
              <input type="number" min={1} className="input" value={form.jumlah_peserta} onChange={(e) => set('jumlah_peserta', e.target.value)} placeholder="Minimal 1" />
            </div>
          </div>
        </div>

        {/* Waktu */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Waktu</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Lokasi</h2>
          <div>
            <label className="label">Lokasi Kegiatan <span className="text-red-500">*</span></label>
            <input className="input" value={form.lokasi} onChange={(e) => set('lokasi', e.target.value)} placeholder="Masukkan lokasi kegiatan" />
          </div>
        </div>

        {/* Deskripsi */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Deskripsi</h2>
          <div>
            <label className="label">Deskripsi (Opsional)</label>
            <textarea className="input min-h-[100px]" value={form.deskripsi} onChange={(e) => set('deskripsi', e.target.value)} placeholder="Masukkan deskripsi kegiatan" />
          </div>
        </div>

        {/* Lampiran */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Lampiran (Opsional)</h2>
          {form.lampiran_nama ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <FileText className="h-5 w-5 text-brand-600" />
                <span className="font-medium">{form.lampiran_nama}</span>
              </div>
              <button type="button" onClick={removeLampiran} className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700">
                <X className="h-4 w-4" /> Hapus Lampiran
              </button>
            </div>
          ) : (
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Mengunggah...' : 'Upload File / Foto'}
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                disabled={uploading}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        {/* Tombol */}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting || uploading} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? 'Menyimpan...' : 'Simpan Agenda'}
          </button>
          <button type="button" onClick={resetForm} disabled={submitting} className="btn-secondary">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </form>
    </div>
  );
}

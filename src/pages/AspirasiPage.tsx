import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import type { AspirasiKategori } from '../types';
import { ASPIRASI_KATEGORI_OPTIONS } from '../types';
import { MessageSquare, Send, User, Mail, CheckCircle, Loader2, AlertCircle, Lightbulb } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';

export default function AspirasiPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nama: '',
    kelas_unit: '',
    email: '',
    kategori: 'Sarana' as AspirasiKategori,
    judul: '',
    isi: '',
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nama.trim()) newErrors.nama = 'Nama wajib diisi';
    if (!formData.kelas_unit.trim()) newErrors.kelas_unit = 'Unit/Kelas wajib diisi';
    if (!formData.judul.trim()) newErrors.judul = 'Judul aspirasi wajib diisi';
    if (!formData.isi.trim()) newErrors.isi = 'Isi aspirasi wajib diisi';
    if (formData.isi.trim().length < 20) newErrors.isi = 'Isi aspirasi minimal 20 karakter';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const { error } = await supabase.from('aspirasi').insert([{
        nama: formData.nama.trim(),
        kelas_unit: formData.kelas_unit.trim(),
        email: formData.email.trim(),
        kategori: formData.kategori,
        judul: formData.judul.trim(),
        isi: formData.isi.trim(),
        status: 'Menunggu',
      }]);

      if (error) throw error;

      setSuccess(true);
      setFormData({
        nama: '',
        kelas_unit: '',
        email: '',
        kategori: 'Sarana',
        judul: '',
        isi: '',
      });

      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting aspirasi:', error);
      setErrors({ submit: 'Terjadi kesalahan saat mengirim aspirasi. Silakan coba lagi.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 bg-gradient-to-br from-purple-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Aspirasi Sarana Prasarana</h1>
            <p className="text-slate-600 dark:text-slate-400">Sampaikan aspirasi, saran, atau masukan Anda terkait sarana prasarana sekolah</p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 pb-16">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">Aspirasi Berhasil Dikirim!</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Terima kasih atas masukan Anda. Tim kami akan menindakani aspirasi Anda.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Form Aspirasi</h2>
              <p className="text-sm text-slate-500 mt-1">Isi data dengan lengkap dan jelas</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Error Message */}
              {errors.submit && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                </div>
              )}

              {/* Nama & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nama <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.nama}
                      onChange={e => setFormData({ ...formData, nama: e.target.value })}
                      className={cn(
                        'w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                        errors.nama ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'
                      )}
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  {errors.nama && <p className="mt-1 text-sm text-red-500">{errors.nama}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Unit/Kelas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.kelas_unit}
                    onChange={e => setFormData({ ...formData, kelas_unit: e.target.value })}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                      errors.kelas_unit ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'
                    )}
                    placeholder="Contoh: X IOP A, Guru, Staff"
                  />
                  {errors.kelas_unit && <p className="mt-1 text-sm text-red-500">{errors.kelas_unit}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email (Opsional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="email@contoh.com"
                  />
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Kategori Aspirasi <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ASPIRASI_KATEGORI_OPTIONS.map(kat => (
                    <button
                      type="button"
                      key={kat}
                      onClick={() => setFormData({ ...formData, kategori: kat })}
                      className={cn(
                        'py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all text-center',
                        formData.kategori === kat
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300'
                      )}
                    >
                      {kat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Judul */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Judul Aspirasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={e => setFormData({ ...formData, judul: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                    errors.judul ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'
                  )}
                  placeholder="Contoh: Perbaikan AC di Lab Komputer"
                />
                {errors.judul && <p className="mt-1 text-sm text-red-500">{errors.judul}</p>}
              </div>

              {/* Isi */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Isi Aspirasi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={formData.isi}
                  onChange={e => setFormData({ ...formData, isi: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none',
                    errors.isi ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'
                  )}
                  placeholder="Jelaskan aspirasi, saran, atau masukan Anda secara detail..."
                />
                <div className="flex justify-between mt-1">
                  {errors.isi && <p className="text-sm text-red-500">{errors.isi}</p>}
                  <p className="text-xs text-slate-500 ml-auto">{formData.isi.length} karakter</p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Kirim Aspirasi
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
          >
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-700 dark:text-purple-300">
                <p className="font-medium mb-1">Tips Mengisi Aspirasi</p>
                <ul className="list-disc list-inside space-y-1 text-purple-600 dark:text-purple-400">
                  <li>Jelaskan masalah atau saran dengan jelas dan spesifik</li>
                  <li>Sertakan lokasi atau barang yang terkait</li>
                  <li>Berikan solusi jika memungkinkan</li>
                  <li>Aspirasi Anda akan dibaca dan ditindaklanjuti oleh tim sarpras</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { KELAS_UNIT_OPTIONS } from '../types';
import { FileBox, Upload, Check, AlertCircle, Loader2, File, Image, X } from 'lucide-react';
import { cn } from '../utils/cn';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function KavlingInputPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState({
    nama: '',
    kelas_unit: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nama.trim()) {
      newErrors.nama = 'Nama wajib diisi';
    }

    if (!formData.kelas_unit) {
      newErrors.kelas_unit = 'Kelas/Unit wajib dipilih';
    }

    if (!formData.tanggal) {
      newErrors.tanggal = 'Tanggal wajib diisi';
    }

    if (!selectedFile) {
      newErrors.file = 'File bukti pendukung wajib diupload';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        file: 'Format file tidak valid. Gunakan PDF, JPG, JPEG, atau PNG'
      }));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setErrors(prev => ({
        ...prev,
        file: 'Ukuran file terlalu besar. Maksimal 10 MB'
      }));
      return;
    }

    setSelectedFile(file);
    setErrors(prev => ({ ...prev, file: '' }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = fileName;

    const { error } = await supabase.storage
      .from('kavling-files')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('kavling-files')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Upload file first
      const fileUrl = await uploadFile(selectedFile!);

      // Insert data into database
      const { error } = await supabase
        .from('kavling')
        .insert([{
          nama: formData.nama.trim(),
          kelas_unit: formData.kelas_unit,
          tanggal: formData.tanggal,
          file_url: fileUrl,
          file_name: selectedFile!.name,
          status_verifikasi: 'Menunggu',
        }]);

      if (error) throw error;

      // Show success
      setSuccess(true);
      setFormData({ nama: '', kelas_unit: '', tanggal: new Date().toISOString().split('T')[0] });
      setSelectedFile(null);
      setPreviewUrl(null);

      // Redirect after delay
      setTimeout(() => {
        navigate('/kavling');
      }, 2000);
    } catch (error) {
      console.error('Error submitting data:', error);
      setErrors({ submit: 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.' });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return File;
    if (selectedFile.type.startsWith('image/')) return Image;
    return File;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      {/* Header Section */}
      <section className="pt-24 pb-8 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                <FileBox className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Input Data Kavling</h1>
            <p className="text-slate-600 dark:text-slate-400">Masukkan data kavling baru dengan mengisi form di bawah</p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-6 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">Data Berhasil Disimpan</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Anda akan dialihkan ke daftar kavling...</p>
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
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Form Input Kavling</h2>
              <p className="text-sm text-slate-500 mt-1">Semua field bertanda * wajib diisi</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* General Error */}
              {errors.submit && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{errors.submit}</span>
                  </div>
                </div>
              )}

              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                    errors.nama
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-slate-300 dark:border-slate-600'
                  )}
                  placeholder="Masukkan nama lengkap"
                />
                {errors.nama && (
                  <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.nama}
                  </p>
                )}
              </div>

              {/* Kelas/Unit */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Kelas/Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.kelas_unit}
                  onChange={e => setFormData({ ...formData, kelas_unit: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                    errors.kelas_unit
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-slate-300 dark:border-slate-600'
                  )}
                >
                  <option value="">-- Pilih Kelas/Unit --</option>
                  {KELAS_UNIT_OPTIONS.map(kelas => (
                    <option key={kelas} value={kelas}>{kelas}</option>
                  ))}
                </select>
                {errors.kelas_unit && (
                  <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.kelas_unit}
                  </p>
                )}
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                    errors.tanggal
                      ? 'border-red-300 dark:border-red-600'
                      : 'border-slate-300 dark:border-slate-600'
                  )}
                />
                {errors.tanggal && (
                  <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.tanggal}
                  </p>
                )}
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  File Bukti Pendukung <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Format yang diterima: PDF, JPG, JPEG, PNG. Maksimal 10 MB.
                </p>

                {!selectedFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                      dragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : errors.file
                          ? 'border-red-300 dark:border-red-600 bg-red-50/50 dark:bg-red-900/10'
                          : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
                    )}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className={cn(
                        'w-14 h-14 rounded-xl flex items-center justify-center',
                        dragActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-700'
                      )}>
                        <Upload className={cn(
                          'w-7 h-7',
                          dragActive ? 'text-blue-500' : 'text-slate-400'
                        )} />
                      </div>
                      <div>
                        <p className={cn(
                          'font-medium',
                          dragActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                        )}>
                          {dragActive ? 'Lepaskan file di sini' : 'Drag & drop file di sini'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          atau klik untuk memilih file
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    {previewUrl ? (
                      <div className="relative aspect-video bg-slate-100 dark:bg-slate-700">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={removeFile}
                          className="absolute top-3 right-3 p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const FileIcon = getFileIcon();
                            return <FileIcon className="w-8 h-8 text-blue-500" />;
                          })()}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeFile}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {errors.file && (
                  <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.file}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/kavling')}
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Simpan Data
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Informasi Penting</p>
                <p>Data yang Anda masukkan akan melalui proses verifikasi oleh admin. Status verifikasi akan diperbarui setelah admin memeriksa data.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

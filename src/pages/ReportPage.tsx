import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertTriangle, Send, CheckCircle, Clock, User, MapPin, Mail, Phone, Upload, X, Image as ImageIcon, Loader2, Package } from 'lucide-react';
import { Inventory, DamageReport, DamageSeverity } from '../types';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ReportPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_unit: '',
    reporter_email: '',
    reporter_phone: '',
    inventory_id: '',
    location: '',
    description: '',
    severity: 'minor' as DamageSeverity,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [invRes, repRes] = await Promise.all([
        supabase.from('inventory').select('*, categories(*)').order('name'),
        supabase.from('damage_reports').select('*, inventory(name, code, location)').order('created_at', { ascending: false }).limit(10),
      ]);
      if (invRes.data) setInventory(invRes.data);
      if (repRes.data) setReports(repRes.data as DamageReport[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrors(prev => ({ ...prev, image: 'Format gambar tidak valid. Gunakan JPG, PNG, atau WebP' }));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrors(prev => ({ ...prev, image: 'Ukuran gambar terlalu besar. Maksimal 5 MB' }));
      return;
    }
    setSelectedImage(file);
    setErrors(prev => ({ ...prev, image: '' }));
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `damage-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('borrowing-documents').upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('borrowing-documents').getPublicUrl(fileName);
    return publicUrl;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.reporter_name.trim()) newErrors.reporter_name = 'Nama pelapor wajib diisi';
    if (!formData.reporter_unit.trim()) newErrors.reporter_unit = 'Unit/Kelas wajib diisi';
    if (!formData.inventory_id) newErrors.inventory_id = 'Pilih barang yang rusak';
    if (!formData.location.trim()) newErrors.location = 'Lokasi kerusakan wajib diisi';
    if (!formData.description.trim()) newErrors.description = 'Deskripsi kerusakan wajib diisi';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      let imageUrl = '';
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const { error } = await supabase.from('damage_reports').insert([{
        reporter_name: formData.reporter_name.trim(),
        reporter_unit: formData.reporter_unit.trim(),
        reporter_email: formData.reporter_email.trim(),
        reporter_phone: formData.reporter_phone.trim(),
        inventory_id: formData.inventory_id,
        location: formData.location.trim(),
        description: formData.description.trim(),
        severity: formData.severity,
        image_url: imageUrl,
        status: 'pending',
      }]);

      if (error) throw error;

      setSuccess(true);
      setFormData({
        reporter_name: '',
        reporter_unit: '',
        reporter_email: '',
        reporter_phone: '',
        inventory_id: '',
        location: '',
        description: '',
        severity: 'minor',
      });
      setSelectedItem(null);
      removeImage();
      fetchInitialData();

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
      setErrors({ submit: 'Terjadi kesalahan saat mengirim laporan. Silakan coba lagi.' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSeverityColor = (severity: DamageSeverity) => {
    switch (severity) {
      case 'minor': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'moderate': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'severe': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  const getSeverityLabel = (severity: DamageSeverity) => {
    switch (severity) {
      case 'minor': return 'Ringan';
      case 'moderate': return 'Sedang';
      case 'severe': return 'Berat';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-600 dark:text-amber-400';
      case 'in_progress': return 'text-blue-600 dark:text-blue-400';
      case 'resolved': return 'text-green-600 dark:text-green-400';
      default: return 'text-slate-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'in_progress': return 'Diproses';
      case 'resolved': return 'Selesai';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 bg-gradient-to-br from-orange-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Laporan Kerusakan</h1>
            <p className="text-slate-600 dark:text-slate-400">Laporkan kerusakan sarana prasarana dengan lengkap</p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 pb-16">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                <p className="font-medium text-green-800 dark:text-green-300">Laporan berhasil dikirim! Tim kami akan segera menindaklanjuti.</p>
              </div>
            </motion.div>
          )}

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Form Laporan Kerusakan</h2>
              <p className="text-sm text-slate-500 mt-1">Isi data dengan lengkap dan jelas</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Error Message */}
              {errors.submit && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                </div>
              )}

              {/* Reporter Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nama Pelapor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.reporter_name}
                      onChange={e => setFormData({ ...formData, reporter_name: e.target.value })}
                      className={cn(
                        'w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent',
                        errors.reporter_name ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'
                      )}
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  {errors.reporter_name && <p className="mt-1 text-sm text-red-500">{errors.reporter_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Unit/Kelas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.reporter_unit}
                    onChange={e => setFormData({ ...formData, reporter_unit: e.target.value })}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent',
                      errors.reporter_unit ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'
                    )}
                    placeholder="Contoh: X Mekatronika A, Guru, Staff"
                  />
                  {errors.reporter_unit && <p className="mt-1 text-sm text-red-500">{errors.reporter_unit}</p>}
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={formData.reporter_email}
                      onChange={e => setFormData({ ...formData, reporter_email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="email@contoh.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">No. Telepon</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={formData.reporter_phone}
                      onChange={e => setFormData({ ...formData, reporter_phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="08xx-xxxx-xxxx"
                    />
                  </div>
                </div>
              </div>

              {/* Select Item */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Barang yang Rusak <span className="text-red-500">*</span>
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari barang berdasarkan nama atau kode..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {loading ? (
                    <div className="col-span-3 text-center py-4 text-slate-500">Memuat...</div>
                  ) : filteredItems.length === 0 ? (
                    <div className="col-span-3 text-center py-4 text-slate-500">Tidak ada barang ditemukan</div>
                  ) : (
                    filteredItems.map(item => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setFormData({ ...formData, inventory_id: item.id, location: item.location || formData.location });
                        }}
                        className={cn(
                          'p-3 rounded-xl border-2 text-left transition-all',
                          selectedItem?.id === item.id
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-orange-300'
                        )}
                      >
                        <div className="text-xs text-slate-400">{item.code}</div>
                        <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{item.name}</div>
                        {item.location && <div className="text-xs text-slate-500 truncate">{item.location}</div>}
                      </button>
                    ))
                  )}
                </div>
                {errors.inventory_id && <p className="mt-1 text-sm text-red-500">{errors.inventory_id}</p>}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Lokasi Kerusakan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className={cn(
                      'w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent',
                      errors.location ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'
                    )}
                    placeholder="Contoh: Lab Komputer Lt.2, Ruang Kelas XII Mekatronika A"
                  />
                </div>
                {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tingkat Kerusakan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['minor', 'moderate', 'severe'] as const).map(sev => (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setFormData({ ...formData, severity: sev })}
                      className={cn(
                        'py-4 rounded-xl border-2 font-medium transition-all',
                        formData.severity === sev
                          ? sev === 'minor' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                            : sev === 'moderate' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                            : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:border-orange-300'
                      )}
                    >
                      {sev === 'minor' ? 'Ringan' : sev === 'moderate' ? 'Sedang' : 'Berat'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Deskripsi Kerusakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none',
                    errors.description ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'
                  )}
                  placeholder="Jelaskan kerusakan yang terjadi secara detail..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Foto Kerusakan (Opsional)</label>
                {!selectedImage ? (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-orange-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageInput}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">Klik untuk upload foto</p>
                      <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP. Maks 5MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="relative inline-block">
                    <img src={imagePreview!} alt="Preview" className="max-h-48 rounded-xl" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {errors.image && <p className="mt-1 text-sm text-red-500">{errors.image}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium shadow-lg shadow-orange-500/30 hover:shadow-xl disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Kirim Laporan
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Laporan Terbaru</h2>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Memuat...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Belum ada laporan</div>
            ) : (
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-white text-sm">{r.inventory?.name || 'Barang tidak ditemukan'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <User className="w-3 h-3" />
                          {r.reporter_name} • {r.reporter_unit}
                        </div>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', getSeverityColor(r.severity))}>
                        {getSeverityLabel(r.severity)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{r.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">{r.location || r.inventory?.location || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {r.status === 'pending' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        <span className={cn('text-xs font-medium', getStatusColor(r.status))}>
                          {getStatusLabel(r.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

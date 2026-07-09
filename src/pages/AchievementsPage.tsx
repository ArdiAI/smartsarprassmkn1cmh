import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Search, Award, User, GraduationCap, Upload, Send, Check, AlertCircle, LogIn } from 'lucide-react';
import { Achievement, ACHIEVEMENT_LEVELS, ACHIEVEMENT_CATEGORIES } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../utils/cn';
import { Link } from 'react-router-dom';

const LEVEL_COLORS: Record<string, string> = {
  sekolah: 'bg-slate-500',
  kota: 'bg-blue-500',
  provinsi: 'bg-emerald-500',
  nasional: 'bg-purple-500',
  internasional: 'bg-amber-500',
};

const CATEGORY_ICONS: Record<string, any> = {
  akademik: GraduationCap,
  non_akademik: Trophy,
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'list' | 'submit'>('list');

  // Form state
  const [formData, setFormData] = useState({
    student_name: '',
    student_class: '',
    student_major: '',
    achievement_name: '',
    category: 'non_akademik' as 'akademik' | 'non_akademik',
    level: 'sekolah' as string,
    year: new Date().getFullYear(),
    advisor: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    const { data, error } = await supabase.from('achievements').select('*').order('created_at', { ascending: false });
    if (error) console.error('Fetch achievements error:', error);
    if (data) setAchievements(data as Achievement[]);
    setLoading(false);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `achievements/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('borrowing-documents').upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from('borrowing-documents').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    let photoUrl = '';
    if (selectedFile) {
      photoUrl = await uploadPhoto(selectedFile) || '';
    }

    const { error } = await supabase.from('achievements').insert([{
      ...formData,
      photo_url: photoUrl,
    }]);

    if (error) {
      setSubmitError(`Gagal menyimpan: ${error.message}`);
    } else {
      setSubmitSuccess(true);
      setFormData({
        student_name: '',
        student_class: '',
        student_major: '',
        achievement_name: '',
        category: 'non_akademik',
        level: 'sekolah',
        year: new Date().getFullYear(),
        advisor: '',
        description: '',
      });
      setSelectedFile(null);
      fetchAchievements();
      setTimeout(() => setSubmitSuccess(false), 5000);
    }
    setSubmitting(false);
  };

  const years = [...new Set(achievements.map(a => a.year))].sort((a, b) => b - a);

  const filtered = achievements.filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    if (filterLevel !== 'all' && a.level !== filterLevel) return false;
    if (filterYear !== 'all' && a.year.toString() !== filterYear) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.student_name.toLowerCase().includes(q) && !a.achievement_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: achievements.length,
    byLevel: ACHIEVEMENT_LEVELS.reduce((acc, level) => {
      acc[level] = achievements.filter(a => a.level === level).length;
      return acc;
    }, {} as Record<string, number>),
    thisYear: achievements.filter(a => a.year === new Date().getFullYear()).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <section className="pt-24 pb-8 bg-gradient-to-br from-amber-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">Prestasi Sekolah</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-slate-600 dark:text-slate-400">Daftar dan input prestasi siswa SMKN 1 Cimahi</motion.p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setActiveTab('list')}
              className={cn('px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === 'list' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              )}>Daftar Prestasi</button>
            <button onClick={() => setActiveTab('submit')}
              className={cn('px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                activeTab === 'submit' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              )}><Send className="w-4 h-4" /> Input Prestasi</button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'submit' ? (
              <motion.div key="submit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" /> Form Input Prestasi
                  </h2>

                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Silakan isi data prestasi di bawah ini. Data akan ditampilkan setelah diverifikasi oleh admin.
                  </p>

                  {submitSuccess && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                      <Check className="w-5 h-5 text-emerald-500" />
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">Prestasi berhasil disimpan!</p>
                    </div>
                  )}

                  {submitError && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Siswa <span className="text-red-500">*</span></label>
                        <input type="text" required value={formData.student_name} onChange={e => setFormData({ ...formData, student_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kelas <span className="text-red-500">*</span></label>
                        <input type="text" required value={formData.student_class} onChange={e => setFormData({ ...formData, student_class: e.target.value })}
                          placeholder="Contoh: XII RPL 1" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jurusan</label>
                      <input type="text" value={formData.student_major} onChange={e => setFormData({ ...formData, student_major: e.target.value })}
                        placeholder="Contoh: Rekayasa Perangkat Lunak" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Prestasi <span className="text-red-500">*</span></label>
                      <input type="text" required value={formData.achievement_name} onChange={e => setFormData({ ...formData, achievement_name: e.target.value })}
                        placeholder="Contoh: Juara 1 Lomba Cerdas Cermat" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori <span className="text-red-500">*</span></label>
                        <select required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                          <option value="akademik">Akademik</option>
                          <option value="non_akademik">Non Akademik</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tingkat <span className="text-red-500">*</span></label>
                        <select required value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                          <option value="sekolah">Sekolah</option>
                          <option value="kota">Kota/Kabupaten</option>
                          <option value="provinsi">Provinsi</option>
                          <option value="nasional">Nasional</option>
                          <option value="internasional">Internasional</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tahun <span className="text-red-500">*</span></label>
                        <input type="number" required min="2000" max={new Date().getFullYear()} value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pembimbing</label>
                        <input type="text" value={formData.advisor} onChange={e => setFormData({ ...formData, advisor: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                      <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        <Upload className="w-4 h-4 inline mr-1" /> Foto Dokumentasi (opsional)
                      </label>
                      <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-400" />
                      {selectedFile && <p className="text-xs text-slate-500 mt-1">{selectedFile.name}</p>}
                    </div>

                    <button type="submit" disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg disabled:opacity-50">
                      <Send className="w-5 h-5" /> {submitting ? 'Menyimpan...' : 'Simpan Prestasi'}
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                        <div className="text-xs text-slate-500">Total Prestasi</div>
                      </div>
                    </div>
                  </div>
                  {ACHIEVEMENT_LEVELS.slice(3).map(level => (
                    <div key={level} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', LEVEL_COLORS[level])}>
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.byLevel[level] || 0}</div>
                          <div className="text-xs text-slate-500 capitalize">{level}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" placeholder="Cari siswa atau prestasi..." value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                  </div>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
                    <option value="all">Semua Kategori</option>
                    <option value="akademik">Akademik</option>
                    <option value="non_akademik">Non Akademik</option>
                  </select>
                  <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
                    <option value="all">Semua Tingkat</option>
                    {ACHIEVEMENT_LEVELS.map(l => (
                      <option key={l} value={l} className="capitalize">{l}</option>
                    ))}
                  </select>
                  <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
                    <option value="all">Semua Tahun</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center">
                    <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">Tidak ada prestasi ditemukan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 overflow-hidden group hover:shadow-lg transition-all"
                      >
                        <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 relative overflow-hidden">
                          {a.photo_url ? (
                            <img src={a.photo_url} alt={a.achievement_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Award className="w-12 h-12 text-slate-400" />
                            </div>
                          )}
                          <div className={cn('absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize', LEVEL_COLORS[a.level] || 'bg-slate-500')}>
                            {a.level}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {(() => {
                              const Icon = CATEGORY_ICONS[a.category] || Trophy;
                              return <Icon className={cn('w-4 h-4', a.category === 'akademik' ? 'text-blue-500' : 'text-emerald-500')} />;
                            })()}
                            <span className={cn('text-xs font-medium', a.category === 'akademik' ? 'text-blue-600' : 'text-emerald-600')}>
                              {a.category === 'akademik' ? 'Akademik' : 'Non Akademik'}
                            </span>
                          </div>
                          <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 mb-2">{a.achievement_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-1">
                            <User className="w-3.5 h-3.5" />
                            <span>{a.student_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{a.student_class}</span>
                            {a.student_major && <><span>|</span><span>{a.student_major}</span></>}
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <span className="text-xs text-slate-500">{a.year}</span>
                            {a.advisor && <span className="text-xs text-slate-500">Pembimbing: {a.advisor}</span>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
      <Footer />
    </div>
  );
}

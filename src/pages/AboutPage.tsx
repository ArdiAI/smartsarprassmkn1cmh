import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Target,Flag, Briefcase, Users, CheckCircle2, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import { cn } from '../utils/cn';

interface Settings {
  profile: {
    name: string;
    fullname: string;
    description: string;
    established: string;
  };
  vision: {
    text: string;
    description: string;
  };
  mission: {
    items: string[];
  };
  tasks: {
    items: { title: string; description: string }[];
  };
}

const defaultSettings: Settings = {
  profile: {
    name: 'Unit Sarana dan Prasarana',
    fullname: 'Unit Sarana dan Prasarana SMK Negeri 1 Cimahi',
    description: 'Unit Sarana dan Prasarana bertanggung jawab dalam pengelolaan, pemeliharaan, dan pengembangan sarana prasarana sekolah untuk mendukung kegiatan belajar mengajar.',
    established: '2010',
  },
  vision: {
    text: 'Menjadi unit sarana prasarana yang profesional, inovatif, dan terpercaya dalam pengelolaan fasilitas pendidikan.',
    description: 'Kami berkomitmen untuk memberikan layanan terbaik dalam pengelolaan sarana prasarana sekolah.',
  },
  mission: {
    items: [
      'Menyediakan sarana prasarana yang memadai dan berkualitas untuk mendukung kegiatan pembelajaran',
      'Mengelola inventaris barang dengan sistem yang terintegrasi dan transparan',
      'Melakukan pemeliharaan dan perawatan fasilitas secara berkala dan terencana',
      'Merespon laporan kerusakan dengan cepat dan tepat',
      'Mengembangkan sistem informasi sarana prasarana yang modern dan efisien',
    ],
  },
  tasks: {
    items: [
      { title: 'Perencanaan Kebutuhan', description: 'Menyusun rencana kebutuhan sarana prasarana berdasarkan analisis kebutuhan sekolah' },
      { title: 'Pengadaan Barang', description: 'Melaksanakan pengadaan barang dan jasa sesuai dengan prosedur yang berlaku' },
      { title: 'Pencatatan Inventaris', description: 'Mencatat dan mendokumentasikan seluruh inventaris barang milik sekolah' },
      { title: 'Pemeliharaan Fasilitas', description: 'Melakukan pemeliharaan rutin dan perbaikan fasilitas sekolah' },
      { title: 'Pengelolaan Peminjaman', description: 'Mengatur dan mengelola peminjaman fasilitas dan inventaris sekolah' },
      { title: 'Monitoring dan Evaluasi', description: 'Memantau kondisi sarana prasarana dan mengevaluasi kinerja pengelolaan' },
    ],
  },
};

export default function AboutPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('about_settings').select('section, content');
      if (data && data.length > 0) {
        const merged: any = {};
        data.forEach((item: any) => {
          merged[item.section] = item.content;
        });
        setSettings({ ...defaultSettings, ...merged });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const sections = [
    {
      id: 'profile',
      icon: Building2,
      title: 'Profil Unit',
      color: 'blue',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{settings.profile.fullname}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{settings.profile.description}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50"
            >
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Informasi Kontak</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Alamat</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Jl. Mahar Martanegara No. 48, Leuwigajah, Cimahi Selatan</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Telepon</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">(022) 6643748</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">sarpras@smkn1cimahi.sch.id</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-blue-100 text-sm">Tahun Berdiri</p>
                <p className="text-2xl font-bold">{settings.profile.established}</p>
              </div>
            </div>
            <div className="space-y-4 pt-6 border-t border-white/20">
              <div>
                <p className="text-blue-100 text-sm mb-1">Jumlah Fasilitas</p>
                <p className="text-xl font-bold">48 Unit</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">Total Inventaris</p>
                <p className="text-xl font-bold">850+ Item</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">Tim Pengelola</p>
                <p className="text-xl font-bold">6 Orang</p>
              </div>
            </div>
          </motion.div>
        </div>
      ),
    },
    {
      id: 'vision',
      icon: Target,
      title: 'Visi',
      color: 'green',
      content: (
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 backdrop-blur-xl rounded-2xl p-8 lg:p-12 border border-green-200/50 dark:border-green-700/50 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Visi</h3>
                  <p className="text-slate-600 dark:text-slate-400">Pandangan Masa Depan</p>
                </div>
              </div>
              <blockquote className="text-xl lg:text-2xl font-medium text-slate-800 dark:text-slate-200 mb-6 leading-relaxed italic">
                "{settings.vision.text}"
              </blockquote>
              <p className="text-slate-600 dark:text-slate-400">{settings.vision.description}</p>
            </div>
          </motion.div>
        </div>
      ),
    },
    {
      id: 'mission',
      icon: Flag,
      title: 'Misi',
      color: 'cyan',
      content: (
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 lg:p-8 border border-slate-200/50 dark:border-slate-700/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                <Flag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Misi</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Langkah untuk Mencapai Visi</p>
              </div>
            </div>
            <div className="space-y-4">
              {settings.mission.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-700/30 border border-slate-200/50 dark:border-slate-600/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{i + 1}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      ),
    },
    {
      id: 'tasks',
      icon: Briefcase,
      title: 'Tugas dan Fungsi',
      color: 'orange',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {settings.tasks.items.map((task, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
              className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 shadow-lg group-hover:shadow-orange-500/30 transition-all">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{task.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{task.description}</p>
            </motion.div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      <AnimatedBackground />
      <Navbar />

      {/* Header */}
      <section className="relative pt-24 pb-12 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-3 mb-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/30">
                <Building2 className="w-7 h-7 text-white" />
              </div>
            </motion.div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
              Tentang Sarpras
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Profil, visi, misi, dan tugas pengelolaan sarana prasarana sekolah
            </p>
          </motion.div>

          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
                  'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50',
                  'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
                  'hover:shadow-lg'
                )}
              >
                <section.icon className="w-4 h-4" />
                {section.title}
              </a>
            ))}
            <Link
              to="/team"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white transition-all hover:shadow-lg"
            >
              <Users className="w-4 h-4" />
              Tim Pengelola
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="relative pb-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {sections.map((section) => (
            <motion.div
              key={section.id}
              id={section.id}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="scroll-mt-32"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  section.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  section.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                  section.color === 'cyan' ? 'bg-cyan-100 dark:bg-cyan-900/30' :
                  'bg-orange-100 dark:bg-orange-900/30'
                )}>
                  <section.icon className={cn(
                    'w-5 h-5',
                    section.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    section.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    section.color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' :
                    'text-orange-600 dark:text-orange-400'
                  )} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{section.title}</h2>
              </div>
              {section.content}
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

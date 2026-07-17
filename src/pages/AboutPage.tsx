import { Building2, Target, Users, ShieldCheck, Mail, MapPin, GraduationCap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { brandConfig } from '../brand/config';

const values = [
  { icon: Target, title: 'Visi', desc: 'Menjadi sistem pengelolaan sarana prasarana sekolah yang terdepan dan terintegrasi.' },
  { icon: ShieldCheck, title: 'Transparansi', desc: 'Setiap peminjaman dan persetujuan tercatat dengan jelas dan dapat dilacak.' },
  { icon: Users, title: 'Kolaborasi', desc: 'Mempermudah koordinasi antara siswa, guru, dan admin dalam pengelolaan sarana.' },
  { icon: Building2, title: 'Efisiensi', desc: 'Otomatisasi proses persetujuan bertingkat untuk pengelolaan yang lebih cepat.' },
];

const stats = [
  { label: 'Fasilitas Terdaftar', value: '10+' },
  { label: 'Item Inventaris', value: '50+' },
  { label: 'Peminjaman / Bulan', value: '100+' },
  { label: 'Tingkat Penyelesaian', value: '98%' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">{brandConfig.system.name}</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">{brandConfig.system.fullName}</p>
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tentang Sistem</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            {brandConfig.system.name} adalah platform digital yang dikembangkan untuk mengelola sarana dan prasarana di {brandConfig.system.school}.
            Sistem ini memungkinkan siswa dan staf untuk melakukan peminjaman ruangan maupun barang inventaris secara online,
            dengan sistem persetujuan bertingkat untuk memastikan akuntabilitas penuh.
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Dengan fitur pelaporan kerusakan, rekap statistik, dan pengumuman real-time, {brandConfig.system.name}
            memberikan solusi menyeluruh untuk pengelolaan fasilitas sekolah yang lebih efisien dan transparan.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-center">
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-1">{s.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">Nilai & Prinsip</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {values.map((v, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <v.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{v.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{v.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-8 text-white">
          <h2 className="text-xl font-bold mb-4">Informasi Kontak</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 opacity-80" />
              <span>{brandConfig.system.school}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 opacity-80" />
              <span>Cimahi, Jawa Barat</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 opacity-80" />
              <span>admin@sisarpras.sch.id</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

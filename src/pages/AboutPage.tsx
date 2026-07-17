import { Building2, Target, ShieldCheck, BarChart3, Users, Zap, Mail, MapPin } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { brandConfig } from '../brand/config';

const values = [
  { icon: ShieldCheck, title: 'Transparansi', desc: 'Setiap aktivitas tercatat dan dapat diaudit oleh semua pihak yang berkepentingan.' },
  { icon: BarChart3, title: 'Akurasi Data', desc: 'Data sarana dan prasarana diperbarui secara real-time untuk akurasi pelaporan.' },
  { icon: Users, title: 'Kemudahan Akses', desc: 'Siswa dan guru dapat mengakses informasi kapan saja dan di mana saja.' },
  { icon: Zap, title: 'Efisiensi', desc: 'Otomatisasi proses peminjaman dan pelaporan menghemat waktu administrasi.' },
];

const goals = [
  'Menyediakan platform terpusat untuk pengelolaan sarana dan prasarana sekolah',
  'Meningkatkan transparansi dan akuntabilitas penggunaan fasilitas',
  'Mempermudah proses peminjaman dan pengembalian barang inventaris',
  'Mempercepat penanganan laporan kerusakan fasilitas',
  'Menyediakan data statistik untuk pengambilan keputusan',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="relative z-10 pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">{brandConfig.system.name}</h1>
          <p className="mt-2 text-lg text-blue-600 dark:text-blue-400 font-medium">{brandConfig.system.fullName}</p>
          <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">{brandConfig.system.description}</p>
        </div>

        {/* About Section */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tentang Sistem</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {brandConfig.system.name} adalah sistem informasi terpadu yang dikembangkan untuk
            membantu pengelolaan sarana dan prasarana di {brandConfig.system.school}. Sistem ini
            mengintegrasikan manajemen fasilitas, inventaris, peminjaman, dan pelaporan kerusakan
            dalam satu platform yang mudah diakses oleh seluruh warga sekolah. Dengan adanya sistem
            ini, diharapkan pengelolaan sarana dan prasarana menjadi lebih tertib, transparan, dan
            akuntabel.
          </p>
        </section>

        {/* Values */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Nilai Utama</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {values.map(v => (
              <div key={v.title} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                  <v.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{v.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Goals */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tujuan Sistem</h2>
          </div>
          <ul className="space-y-3">
            {goals.map((g, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{i + 1}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{g}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Contact */}
        <section className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-6 sm:p-8 text-white">
          <h2 className="text-xl font-bold mb-2">Hubungi Kami</h2>
          <p className="text-blue-50 mb-4 text-sm">Untuk pertanyaan atau bantuan, silakan hubungi pihak sekolah.</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {brandConfig.system.school}</span>
            <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> admin@sekolah.sch.id</span>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

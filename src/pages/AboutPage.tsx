import { Building2, Target, Zap, Users, ShieldCheck, BarChart3, Mail, MapPin } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { brandConfig } from '../brand/config';

const values = [
  { icon: ShieldCheck, title: 'Transparansi', desc: 'Setiap peminjaman dan laporan tercatat dengan jelas dan dapat ditelusuri.' },
  { icon: Zap, title: 'Efisiensi', desc: 'Otomatisasi proses pengelolaan sarana dan prasarana menghemat waktu.' },
  { icon: BarChart3, title: 'Akurasi Data', desc: 'Data terkini untuk pengambilan keputusan yang lebih baik.' },
  { icon: Users, title: 'Kolaborasi', desc: 'Menghubungkan siswa, guru, dan administrator dalam satu sistem.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Tentang {brandConfig.system.name}</h1>
          <p className="text-slate-500">{brandConfig.system.fullName}</p>
        </div>

        {/* Description */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-white">{brandConfig.system.name}</strong> adalah sistem informasi terpadu
            yang dirancang khusus untuk pengelolaan sarana dan prasarana di lingkungan {brandConfig.system.school}.
            Sistem ini memfasilitasi pengelolaan fasilitas, inventaris, peminjaman, serta pelaporan kerusakan
            dalam satu platform yang terintegrasi dan mudah digunakan.
          </p>
        </section>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Visi</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Menjadi sistem pengelolaan sarana dan prasarana sekolah yang terdepan dalam hal efisiensi,
              transparansi, dan kemudahan akses.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-900 dark:text-white">Misi</h2>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Mempermudah pengelolaan inventaris sekolah.</li>
              <li>Menyediakan layanan peminjaman yang cepat dan tercatat.</li>
              <li>Memfasilitasi pelaporan kerusakan secara real-time.</li>
              <li>Menyediakan data statistik untuk pengambilan keputusan.</li>
            </ul>
          </div>
        </div>

        {/* Values */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Nilai Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {values.map((v, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-blue-50 dark:bg-blue-900/30">
                  <v.icon className="w-5 h-5 text-blue-500" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">{v.title}</p>
                <p className="text-sm text-slate-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 text-white">
          <h2 className="text-lg font-bold mb-2">Informasi Kontak</h2>
          <div className="space-y-1.5 text-sm text-blue-50">
            <p className="flex items-center gap-2"><Building2 className="w-4 h-4" /> {brandConfig.system.school}</p>
            <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> sarpras@sekolah.sch.id</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Cimahi, Jawa Barat</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

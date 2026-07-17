import { Link } from 'react-router-dom';
import { ArrowRight, Building, Package, ClipboardList, History, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import AnimatedStats from '../components/AnimatedStats';
import AnnouncementFeed from '../components/AnnouncementFeed';
import RealtimeClock from '../components/RealtimeClock';

export default function LandingPage() {
  const quickLinks = [
    { to: '/fasilitas', label: 'Fasilitas', description: 'Jelajahi fasilitas yang tersedia', icon: Building, color: 'from-blue-500 to-cyan-500' },
    { to: '/inventaris', label: 'Inventaris', description: 'Lihat daftar barang inventaris', icon: Package, color: 'from-cyan-500 to-teal-500' },
    { to: '/pinjam', label: 'Pinjam', description: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-emerald-500 to-green-500' },
    { to: '/riwayat', label: 'Riwayat', description: 'Pantau status peminjaman', icon: History, color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <AnimatedBackground />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium mb-6 animate-slide-up">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Sistem Manajemen Sarana & Prasarana
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent animate-slide-up">
              SMART SARPRAS
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Kelola fasilitas dan inventaris sekolah dengan mudah, transparan, dan terpadu.
              Ajukan peminjaman, pantau status, dan laporkan kerusakan dalam satu platform.
            </p>
            <div className="mt-6 flex justify-center animate-slide-up" style={{ animationDelay: '0.15s' }}>
              <RealtimeClock />
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link
                to="/pinjam"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
              >
                Ajukan Peminjaman
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/fasilitas"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 font-medium transition-all hover:scale-[1.02]"
              >
                Lihat Fasilitas
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatedStats />
        </section>

        {/* Quick links */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold mb-6">Akses Cepat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, i) => (
              <Link
                key={link.to}
                to={link.to}
                className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center mb-4`}>
                  <link.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">{link.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{link.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-2xl font-bold">Pengumuman Terbaru</h2>
          </div>
          <AnnouncementFeed />
        </section>
      </main>

      <Footer />
    </div>
  );
}

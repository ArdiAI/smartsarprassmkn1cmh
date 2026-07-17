import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Package, ClipboardList, FileText, ShieldCheck, BarChart3, Zap, Users, ArrowRight, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import RealtimeClock from '../components/RealtimeClock';
import AnimatedStats from '../components/AnimatedStats';
import AnnouncementFeed from '../components/AnnouncementFeed';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';

const quickActions = [
  { to: '/facilities', label: 'Fasilitas', desc: 'Lihat daftar ruangan & area', icon: Building2, color: 'from-blue-500 to-blue-600' },
  { to: '/inventory', label: 'Inventaris', desc: 'Cek barang tersedia', icon: Package, color: 'from-cyan-500 to-cyan-600' },
  { to: '/borrow', label: 'Peminjaman', desc: 'Ajukan peminjaman barang', icon: ClipboardList, color: 'from-green-500 to-green-600' },
  { to: '/report', label: 'Laporan Kerusakan', desc: 'Laporkan kerusakan', icon: FileText, color: 'from-orange-500 to-orange-600' },
];

const features = [
  { icon: Building2, title: 'Manajemen Fasilitas', desc: 'Kelola ruangan, lapangan, dan area sekolah dengan terstruktur.' },
  { icon: Package, title: 'Pelacakan Inventaris', desc: 'Pantau ketersediaan dan kondisi barang secara real-time.' },
  { icon: ClipboardList, title: 'Sistem Peminjaman', desc: 'Ajukan dan pantau status peminjaman secara online.' },
  { icon: FileText, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan sarana dengan cepat dan mudah.' },
  { icon: BarChart3, title: 'Rekap & Statistik', desc: 'Analisis data penggunaan sarana dan prasarana.' },
  { icon: ShieldCheck, title: 'Transparan & Akuntabel', desc: 'Semua aktivitas tercatat untuk audit yang jelas.' },
];

export default function LandingPage() {
  const [stats, setStats] = useState({ facilities: 0, inventory: 0, borrowings: 0, reports: 0 });

  useEffect(() => {
    (async () => {
      const [f, i, b, r] = await Promise.all([
        supabase.from('facilities').select('*', { count: 'exact', head: true }),
        supabase.from('inventory').select('*', { count: 'exact', head: true }),
        supabase.from('borrowings').select('*', { count: 'exact', head: true }),
        supabase.from('damage_reports').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ facilities: f.count || 0, inventory: i.count || 0, borrowings: b.count || 0, reports: r.count || 0 });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AnimatedBackground />
      <Navbar />
      <main className="relative z-10 pt-16">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium mb-4">
                <Zap className="w-3.5 h-3.5" /> {brandConfig.system.school}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                {brandConfig.system.name}
              </h1>
              <p className="mt-3 text-lg text-blue-600 dark:text-blue-400 font-medium">{brandConfig.system.fullName}</p>
              <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-lg">{brandConfig.system.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
                  Mulai Sekarang <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/facilities" className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
                  <Search className="w-4 h-4" /> Jelajahi
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              <RealtimeClock />
              <div className="grid grid-cols-2 gap-4">
                <AnimatedStats value={stats.facilities} label="Fasilitas" icon={Building2} color="blue" />
                <AnimatedStats value={stats.inventory} label="Inventaris" icon={Package} color="cyan" />
                <AnimatedStats value={stats.borrowings} label="Peminjaman" icon={ClipboardList} color="green" />
                <AnimatedStats value={stats.reports} label="Laporan" icon={FileText} color="orange" />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Aksi Cepat</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(a => (
              <Link key={a.to} to={a.to} className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center mb-4`}>
                  <a.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{a.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{a.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Buka <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Fitur Utama</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Semua yang Anda butuhkan untuk mengelola sarana dan prasarana</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <div key={f.title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><AnnouncementFeed /></div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
              <Users className="w-10 h-10 text-blue-500 mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gabung Sekarang</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">Buat akun untuk mulai mengajukan peminjaman dan melaporkan kerusakan.</p>
              <Link to="/auth" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                Login / Daftar <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Siap memulai?</h2>
            <p className="text-blue-50 mb-6 max-w-xl mx-auto">Buat akun atau masuk untuk mengakses semua fitur {brandConfig.system.name}.</p>
            <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50">
              Login / Register <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

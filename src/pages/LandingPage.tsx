import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building, Package, ClipboardList, FileText, ArrowRight, ShieldCheck, Clock, BarChart3, Bell, Users, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import RealtimeClock from '../components/RealtimeClock';
import AnimatedStats from '../components/AnimatedStats';
import AnnouncementFeed from '../components/AnnouncementFeed';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

const quickActions = [
  { to: '/facilities', label: 'Fasilitas', desc: 'Lihat daftar fasilitas', icon: Building, color: 'from-blue-500 to-blue-600' },
  { to: '/inventory', label: 'Inventaris', desc: 'Cek barang inventaris', icon: Package, color: 'from-cyan-500 to-cyan-600' },
  { to: '/borrow', label: 'Peminjaman', desc: 'Ajukan peminjaman', icon: ClipboardList, color: 'from-green-500 to-green-600' },
  { to: '/report', label: 'Laporan', desc: 'Laporkan kerusakan', icon: FileText, color: 'from-orange-500 to-orange-600' },
];

const features = [
  { icon: ShieldCheck, title: 'Manajemen Terpadu', desc: 'Kelola sarana dan prasarana dalam satu platform terpadu.' },
  { icon: Clock, title: 'Real-time Monitoring', desc: 'Pantau status peminjaman dan inventaris secara real-time.' },
  { icon: BarChart3, title: 'Statistik & Rekap', desc: 'Visualisasi data peminjaman dan laporan kerusakan.' },
  { icon: Bell, title: 'Notifikasi Pengumuman', desc: 'Informasi terbaru langsung dari pengelola sarpras.' },
  { icon: Users, title: 'Multi-User', desc: 'Akses untuk siswa, guru, dan administrator.' },
  { icon: Zap, title: 'Proses Cepat', desc: 'Pengajuan dan pelaporan berlangsung dalam hitungan menit.' },
];

export default function LandingPage() {
  const [counts, setCounts] = useState({ facilities: 0, inventory: 0, borrowings: 0, reports: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from('facilities').select('*', { count: 'exact', head: true }),
      supabase.from('inventory').select('*', { count: 'exact', head: true }),
      supabase.from('borrowings').select('*', { count: 'exact', head: true }),
      supabase.from('damage_reports').select('*', { count: 'exact', head: true }),
    ]).then(([f, i, b, r]) => {
      setCounts({ facilities: f.count || 0, inventory: i.count || 0, borrowings: b.count || 0, reports: r.count || 0 });
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AnimatedBackground />
      <Navbar />
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Hero */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Sistem Aktif
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white mb-4">
            SMART <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">SARPRAS</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            Sistem Manajemen Sarana dan Prasarana Terpadu — kelola, pinjam, dan laporkan fasilitas sekolah dengan mudah.
          </p>
          <div className="max-w-md mx-auto mb-8"><RealtimeClock /></div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow">
              Mulai Sekarang <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/about" className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              Pelajari Lebih Lanjut
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <AnimatedStats value={counts.facilities} label="Total Fasilitas" icon={Building} color="blue" />
          <AnimatedStats value={counts.inventory} label="Item Inventaris" icon={Package} color="cyan" />
          <AnimatedStats value={counts.borrowings} label="Total Peminjaman" icon={ClipboardList} color="green" />
          <AnimatedStats value={counts.reports} label="Laporan Kerusakan" icon={FileText} color="orange" />
        </section>

        {/* Quick Actions */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(a => (
              <Link key={a.to} to={a.to} className="group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br', a.color)}>
                  <a.icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">{a.label}</p>
                <p className="text-sm text-slate-500">{a.desc}</p>
                <ArrowRight className="w-4 h-4 text-slate-400 mt-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Fitur Unggulan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 bg-blue-50 dark:bg-blue-900/30">
                  <f.icon className="w-5 h-5 text-blue-500" />
                </div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">{f.title}</p>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Announcement + CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2"><AnnouncementFeed /></div>
          <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 text-white flex flex-col justify-center">
            <h3 className="text-lg font-bold mb-2">Siap memulai?</h3>
            <p className="text-sm text-blue-50 mb-4">Masuk atau daftar untuk mulai mengelola sarana dan prasarana sekolah.</p>
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors">
              Login / Daftar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

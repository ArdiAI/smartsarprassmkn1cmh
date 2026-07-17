import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Package, ClipboardList, FileText, ShieldCheck,
  Bell, Users, TrendingUp, ArrowRight, LayoutDashboard,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import RealtimeClock from '../components/RealtimeClock';
import AnimatedStats from '../components/AnimatedStats';
import AnnouncementFeed from '../components/AnnouncementFeed';
import { brandConfig } from '../brand/config';
import { supabase } from '../lib/supabase';

const quickActions = [
  { to: '/facilities', label: 'Fasilitas', desc: 'Lihat daftar ruangan', icon: Building2, color: 'from-blue-500 to-blue-600' },
  { to: '/inventory', label: 'Inventaris', desc: 'Cek barang tersedia', icon: Package, color: 'from-cyan-500 to-cyan-600' },
  { to: '/borrow', label: 'Peminjaman', desc: 'Ajukan peminjaman', icon: ClipboardList, color: 'from-green-500 to-green-600' },
  { to: '/report', label: 'Laporan', desc: 'Laporkan kerusakan', icon: FileText, color: 'from-orange-500 to-orange-600' },
];

const features = [
  { icon: Building2, title: 'Manajemen Fasilitas', desc: 'Kelola ruangan dan fasilitas sekolah dengan mudah dan terorganisir.' },
  { icon: Package, title: 'Inventaris Terpusat', desc: 'Pantau ketersediaan barang dan kondisi inventaris secara real-time.' },
  { icon: ClipboardList, title: 'Peminjaman Online', desc: 'Ajukan peminjaman barang dan ruangan kapan saja, di mana saja.' },
  { icon: FileText, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan fasilitas atau inventaris dengan cepat.' },
  { icon: ShieldCheck, title: 'Persetujuan Bertingkat', desc: 'Sistem approval multi-level untuk akuntabilitas penuh.' },
  { icon: TrendingUp, title: 'Statistik & Rekap', desc: 'Pantau tren peminjaman dan penggunaan sarana secara visual.' },
];

export default function LandingPage() {
  const [stats, setStats] = useState({ facilities: 0, inventory: 0, borrowings: 0, reports: 0 });

  useEffect(() => {
    (async () => {
      const [fac, inv, bor, rep] = await Promise.all([
        supabase.from('facilities').select('*', { count: 'exact', head: true }),
        supabase.from('inventory').select('*', { count: 'exact', head: true }),
        supabase.from('borrowings').select('*', { count: 'exact', head: true }),
        supabase.from('damage_reports').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        facilities: fac.count ?? 0,
        inventory: inv.count ?? 0,
        borrowings: bor.count ?? 0,
        reports: rep.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <AnimatedBackground />

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium mb-6">
              <Bell className="w-4 h-4" />
              {brandConfig.system.school}
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              {brandConfig.system.name}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-lg">
              {brandConfig.system.description}. Kelola, pinjam, dan pantau sarana prasarana sekolah dalam satu platform terpadu.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/borrow" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
                Mulai Peminjaman <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/facilities" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Lihat Fasilitas
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4">
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
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(a => (
            <Link key={a.to} to={a.to} className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${a.color}`}>
                <a.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{a.label}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{a.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Fitur Unggulan</h2>
          <p className="text-slate-500 dark:text-slate-400">Semua yang Anda butuhkan untuk mengelola sarana prasarana</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Announcements + CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          <AnnouncementFeed />
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-8 text-white flex flex-col justify-center">
            <Users className="w-10 h-10 mb-4 opacity-80" />
            <h2 className="text-2xl font-bold mb-2">Panel Admin</h2>
            <p className="text-blue-100 mb-6">Kelola seluruh sistem melalui dashboard admin yang lengkap dengan approval bertingkat.</p>
            <Link to="/admin" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-700 font-semibold w-fit hover:bg-blue-50 transition-colors">
              <LayoutDashboard className="w-4 h-4" /> Buka Dashboard
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

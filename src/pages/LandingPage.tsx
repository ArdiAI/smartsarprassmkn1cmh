import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Package, ClipboardList, AlertTriangle, BarChart3, Shield, ArrowRight, Clock, CheckCircle2, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import AnimatedStats from '../components/AnimatedStats';
import AnnouncementFeed from '../components/AnnouncementFeed';
import RealtimeClock from '../components/RealtimeClock';
import { brandConfig } from '../brand/config';

const features = [
  { icon: Building2, title: 'Fasilitas Digital', desc: 'Database fasilitas lengkap dengan foto, lokasi, dan kapasitas', color: 'from-blue-500 to-blue-600' },
  { icon: Package, title: 'Inventaris Cerdas', desc: 'Tracking inventaris dengan QR code dan monitoring kondisi', color: 'from-cyan-500 to-cyan-600' },
  { icon: ClipboardList, title: 'Peminjaman Terintegrasi', desc: 'Peminjaman multi-item dengan approval per Penanggung Jawab', color: 'from-green-500 to-green-600' },
  { icon: AlertTriangle, title: 'Laporan Kerusakan', desc: 'Pelaporan dan tracking kerusakan dengan prioritas dan status', color: 'from-orange-500 to-orange-600' },
  { icon: BarChart3, title: 'Monitoring Real-time', desc: 'Dashboard monitoring kondisi dan utilisasi sarpras', color: 'from-pink-500 to-pink-600' },
  { icon: Shield, title: 'Akses Aman', desc: 'Sistem role-based access untuk setiap PJ dan admin', color: 'from-emerald-500 to-emerald-600' },
];

export default function LandingPage() {
  const [stats, setStats] = useState({ facilities: 0, inventory: 0, goodCondition: 0, avgResponseTime: 24 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabaseUrl = "https://nhpwomtzjxejihenglpb.supabase.co";
        const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ocHdvbXR6anhlamloZW5nbHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODEzODcsImV4cCI6MjA5NTQ1NzM4N30.mRV5tG00t9fWAHe2xQjEN8ybm5MoqUbQPfZJrQkBpv8";
        const res = await fetch(`${supabaseUrl}/functions/v1/get_public_stats`, {
          headers: { 'Authorization': `Bearer ${anonKey}` },
        });
        const data = await res.json();
        setStats({ facilities: data.facilities || 0, inventory: data.inventory || 0, goodCondition: data.goodCondition || 0, avgResponseTime: data.avgResponseTime || 24 });
      } catch { /* use defaults */ }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      <AnimatedBackground />
      <Navbar />

      <section className="relative pt-20 pb-24 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20">
          <div className="flex items-center justify-between mb-12">
            <RealtimeClock />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100/70 dark:bg-green-900/30 border border-green-200/50 dark:border-green-700/50">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-700 dark:text-green-400 font-medium">System Online</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100/70 dark:bg-blue-900/30 border border-blue-200/50 dark:border-blue-700/50">
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Secure</span>
              </div>
            </div>
          </div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/30">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">{brandConfig.system.name}</h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">{brandConfig.system.description}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/facilities" className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg hover:shadow-xl transition-all">
                <Building2 className="w-5 h-5" />Lihat Fasilitas
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/inventory" className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border-2 border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 font-medium hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 transition-all">
                <Package className="w-5 h-5" />Cek Inventaris
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <AnimatedStats value={stats.facilities} label="Fasilitas Terdata" suffix=" Unit" icon={Building2} color="blue" />
            <AnimatedStats value={stats.inventory} label="Inventaris Terdaftar" suffix="+" icon={Package} color="cyan" />
            <AnimatedStats value={stats.goodCondition} label="Kondisi Baik" suffix="%" icon={CheckCircle2} color="green" />
            <AnimatedStats value={stats.avgResponseTime} label="Response Time" suffix=" jam" icon={Clock} color="orange" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Fasilitas', icon: Building2, href: '/facilities', color: 'from-blue-500 to-blue-600' },
                  { label: 'Inventaris', icon: Package, href: '/inventory', color: 'from-cyan-500 to-cyan-600' },
                  { label: 'Peminjaman', icon: ClipboardList, href: '/borrow', color: 'from-green-500 to-green-600' },
                  { label: 'Laporan', icon: AlertTriangle, href: '/report', color: 'from-orange-500 to-orange-600' },
                ].map((action, i) => (
                  <Link key={i} to={action.href} className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-50/70 dark:bg-slate-700/30 border-2 border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-lg">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                      <action.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
            <AnnouncementFeed />
          </div>
        </div>
      </section>

      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Fitur Utama</h2>
            <p className="text-slate-600 dark:text-slate-400">Sistem terintegrasi untuk pengelolaan sarpras yang efisien</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div key={i} className="group relative bg-white/70 dark:bg-slate-800/70 rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative bg-gradient-to-r from-blue-500/90 to-cyan-500/90 rounded-3xl p-8 lg:p-12 overflow-hidden">
            <div className="relative text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Siap Mengelola Sarpras Lebih Baik?</h2>
              <p className="text-blue-100 mb-8 max-w-2xl mx-auto">Akses dashboard admin untuk mengelola fasilitas, inventaris, dan peminjaman secara terintegrasi</p>
              <Link to="/admin" className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-blue-600 font-medium shadow-xl hover:shadow-2xl transition-all">
                Buka Dashboard Admin
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

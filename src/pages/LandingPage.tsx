import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Package, ClipboardList, AlertTriangle, QrCode, BarChart3, Shield, Search, ArrowRight, Clock, CheckCircle2, TrendingUp, Activity, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import AnimatedStats from '../components/AnimatedStats';
import AnnouncementFeed from '../components/AnnouncementFeed';
import RealtimeClock from '../components/RealtimeClock';
import { brandConfig } from '../brand/config';

const features = [
  {
    icon: Building2,
    title: 'Fasilitas Digital',
    desc: 'Database fasilitas lengkap dengan foto, lokasi, dan kapasitas real-time',
    gradient: 'from-blue-500 to-blue-600',
    color: 'blue'
  },
  {
    icon: Package,
    title: 'Inventaris Cerdas',
    desc: 'Tracking inventaris dengan QR code dan monitoring kondisi barang',
    gradient: 'from-cyan-500 to-cyan-600',
    color: 'cyan'
  },
  {
    icon: ClipboardList,
    title: 'Peminjaman Terintegrasi',
    desc: 'Sistem peminjaman digital dengan approval workflow otomatis',
    gradient: 'from-green-500 to-green-600',
    color: 'green'
  },
  {
    icon: AlertTriangle,
    title: 'Laporan Kerusakan',
    desc: 'Pelaporan dan tracking kerusakan dengan prioritas dan status update',
    gradient: 'from-orange-500 to-orange-600',
    color: 'orange'
  },
  {
    icon: QrCode,
    title: 'QR Code Tracking',
    desc: 'Setiap fasilitas dan inventaris memiliki QR code unik untuk tracking',
    gradient: 'from-purple-500 to-purple-600',
    color: 'purple'
  },
  {
    icon: BarChart3,
    title: 'Monitoring Real-time',
    desc: 'Dashboard monitoring kondisi dan utilisasi sarpras secara real-time',
    gradient: 'from-pink-500 to-pink-600',
    color: 'purple'
  },
];

export default function LandingPage() {
  const [stats, setStats] = useState({
    facilities: 0,
    inventory: 0,
    goodCondition: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabaseUrl = "https://nhpwomtzjxejihenglpb.supabase.co";
        const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ocHdvbXR6anhlamloZW5nbHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODEzODcsImV4cCI6MjA5NTQ1NzM4N30.mRV5tG00t9fWAHe2xQjEN8ybm5MoqUbQPfZJrQkBpv8";

        const apiUrl = `${supabaseUrl}/functions/v1/get_public_stats`;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        setStats({
          facilities: data.facilities || 0,
          inventory: data.inventory || 0,
          goodCondition: data.goodCondition || 0,
          avgResponseTime: data.avgResponseTime || 24,
        });
      } catch (error) {
        console.error('Stats fetch error:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      <AnimatedBackground />
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20">
          {/* Top Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-12"
          >
            <RealtimeClock />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100/70 dark:bg-green-900/30 backdrop-blur-sm border border-green-200/50 dark:border-green-700/50">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-green-500"
                />
                <span className="text-xs text-green-700 dark:text-green-400 font-medium">System Online</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100/70 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Secure</span>
              </div>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-3 mb-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/30">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
              {brandConfig.system.name}
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
              {brandConfig.system.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/facilities"
                className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all transform hover:scale-105"
              >
                <Building2 className="w-5 h-5" />
                Lihat Fasilitas
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/inventory"
                className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-2 border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 font-medium hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 transition-all"
              >
                <Package className="w-5 h-5" />
                Cek Inventaris
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
          >
            <AnimatedStats
              value={stats.facilities}
              label="Fasilitas Terdata"
              suffix=" Unit"
              icon={Building2}
              color="blue"
              delay={0.4}
            />
            <AnimatedStats
              value={stats.inventory}
              label="Inventaris Terdaftar"
              suffix="+"
              icon={Package}
              color="cyan"
              delay={0.5}
            />
            <AnimatedStats
              value={stats.goodCondition}
              label="Kondisi Baik"
              suffix="%"
              icon={CheckCircle2}
              color="green"
              delay={0.6}
            />
            <AnimatedStats
              value={stats.avgResponseTime}
              label="Response Time"
              suffix=" jam"
              icon={Clock}
              color="orange"
              delay={0.7}
            />
          </motion.div>

          {/* Quick Actions & Live Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50"
            >
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Fasilitas', icon: Building2, href: '/facilities', color: 'blue' },
                  { label: 'Inventaris', icon: Package, href: '/inventory', color: 'cyan' },
                  { label: 'Peminjaman', icon: ClipboardList, href: '/borrow', color: 'green' },
                  { label: 'Laporan', icon: AlertTriangle, href: '/report', color: 'orange' },
                ].map((action, i) => (
                  <Link
                    key={i}
                    to={action.href}
                    className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-50/70 dark:bg-slate-700/30 border-2 border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-lg"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
                        action.color === 'blue' ? 'from-blue-500 to-blue-600' :
                        action.color === 'cyan' ? 'from-cyan-500 to-cyan-600' :
                        action.color === 'green' ? 'from-green-500 to-green-600' :
                        'from-orange-500 to-orange-600'
                      } flex items-center justify-center shadow-lg`}
                    >
                      <action.icon className="w-7 h-7 text-white" />
                    </motion.div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {action.label}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Announcement Feed */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
            >
              <AnnouncementFeed />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Fitur Utama
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Sistem terintegrasi untuk pengelolaan sarpras yang efisien
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
                  style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
                />
                <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-2xl transition-all">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-r from-blue-500/90 to-cyan-500/90 backdrop-blur-xl rounded-3xl p-8 lg:p-12 overflow-hidden"
          >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute -top-24 -right-24 w-48 h-48 bg-white/20 rounded-full blur-2xl"
              />
              <motion.div
                animate={{ x: [0, -100, 0], y: [0, 50, 0] }}
                transition={{ duration: 15, repeat: Infinity }}
                className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/20 rounded-full blur-2xl"
              />
            </div>

            <div className="relative text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6"
              >
                <Activity className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Real-time Management</span>
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-4">
                Siap Mengelola Sarpras Lebih Baik?
              </h2>
              <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
                Akses dashboard admin untuk mengelola fasilitas, inventaris, dan peminjaman secara terintegrasi
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/admin"
                  className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-blue-600 font-medium shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  Buka Dashboard Admin
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

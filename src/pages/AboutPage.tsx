import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Package,
  Building2,
  ClipboardList,
  AlertTriangle,
  ShieldCheck,
  Target,
  Eye,
  Zap,
  Users,
  BarChart3,
  Bell,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export default function AboutPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const { data } = await supabase
          .from('organizations')
          .select('id, name, description, address, phone, email')
          .limit(1)
          .single();
        setOrg((data as unknown as Organization) ?? null);
      } catch {
        setOrg(null);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  const features = [
    { icon: Building2, title: 'Manajemen Fasilitas', desc: 'Kelola dan pantau seluruh fasilitas yang tersedia dengan informasi lengkap.' },
    { icon: Package, title: 'Inventaris Terpadu', desc: ' Lacak ketersediaan, kondisi, dan lokasi setiap barang inventaris.' },
    { icon: ClipboardList, title: 'Peminjaman Online', desc: 'Ajukan peminjaman barang dan fasilitas secara online dengan approval workflow.' },
    { icon: AlertTriangle, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan sarana dengan cepat untuk ditindaklanjuti.' },
    { icon: BarChart3, title: 'Statistik & Rekap', desc: 'Pantau statistik peminjaman dan laporan dalam satu dashboard.' },
    { icon: Bell, title: 'Notifikasi Real-time', desc: 'Dapatkan notifikasi status peminjaman dan laporan secara real-time.' },
    { icon: ShieldCheck, title: 'Akses Aman', desc: 'Sistem autentikasi yang aman dengan role-based access control.' },
    { icon: Zap, title: 'Proses Cepat', desc: 'Workflow persetujuan otomatis untuk peminjaman dan laporan.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Tentang {brandConfig.system.name}
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {brandConfig.system.fullName}
          </p>
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 mb-8">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            SMART SARPRAS adalah sistem manajemen sarana dan prasarana terpadu yang dirancang
            untuk mempermudah pengelolaan fasilitas, inventaris, peminjaman, dan pelaporan kerusakan.
            Dengan platform ini, pengguna dapat dengan mudah mengajukan peminjaman, melaporkan kerusakan,
            dan memantau status permohonan mereka secara real-time. Sistem ini mendukung workflow
            persetujuan multi-level untuk memastikan setiap permohonan ditinjau oleh pihak yang berwenang.
          </p>
        </div>

        {/* Organization info */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 mb-8 flex justify-center">
            <Loader2 className="w-6 h-6 text-slate-300 dark:text-slate-600 animate-spin" />
          </div>
        ) : org ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Informasi Organisasi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Nama</p>
                <p className="font-medium text-slate-900 dark:text-white">{org.name}</p>
              </div>
              {org.address && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Alamat</p>
                  <p className="font-medium text-slate-900 dark:text-white">{org.address}</p>
                </div>
              )}
              {org.phone && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Telepon</p>
                  <p className="font-medium text-slate-900 dark:text-white">{org.phone}</p>
                </div>
              )}
              {org.email && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                  <p className="font-medium text-slate-900 dark:text-white">{org.email}</p>
                </div>
              )}
              {org.description && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Deskripsi</p>
                  <p className="text-slate-700 dark:text-slate-300 mt-1">{org.description}</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Features */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Fitur Unggulan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-cyan-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Visi</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Menjadi sistem manajemen sarana dan prasarana terdepan yang mengintegrasikan
              teknologi digital untuk efisiensi, transparansi, dan akuntabilitas pengelolaan
              fasilitas secara berkelanjutan.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Misi</h3>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                Mempermudah pengelolaan fasilitas dan inventaris secara digital
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                Menyediakan proses peminjaman yang transparan dan efisien
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                Mempercepat penanganan laporan kerusakan sarana
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                Meningkatkan akuntabilitas pengelolaan sarana dan prasarana
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

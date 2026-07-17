import { useEffect, useState } from 'react';
import {
  Info, Target, Eye, ShieldCheck, Zap, BarChart3, Users, Smartphone,
  CheckCircle2, Building2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

const features = [
  { icon: Zap, title: 'Peminjaman Cepat', desc: 'Ajukan peminjaman barang dan fasilitas dengan mudah dalam hitungan menit.' },
  { icon: ShieldCheck, title: 'Alur Persetujuan', desc: 'Sistem persetujuan multi-langkah yang transparan dan dapat dilacak.' },
  { icon: BarChart3, title: 'Pelaporan Kerusakan', desc: 'Laporkan kerusakan sarana dengan detail dan tingkat keparahan yang jelas.' },
  { icon: Users, title: 'Manajemen Tim', desc: 'Kelola peran dan akses tim untuk pengelolaan yang terorganisir.' },
  { icon: Smartphone, title: 'Responsif', desc: 'Akses dari berbagai perangkat dengan tampilan yang menyesuaikan layar.' },
  { icon: CheckCircle2, title: 'Notifikasi Otomatis', desc: 'Pemberitahuan otomatis untuk status peminjaman dan laporan.' },
];

export default function AboutPage() {
  const [org, setOrg] = useState<Organization | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('organizations').select('id, name, description, address, phone, email').limit(1).single();
        if (data) setOrg(data as unknown as Organization);
      } catch { /* table may not exist */ }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{brandConfig.system.name}</span>
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{brandConfig.system.fullName}</p>
        </div>

        {/* Org info */}
        {org && (
          <div className="card p-6 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{org.name}</h2>
            </div>
            {org.description && <p className="text-sm text-slate-600 dark:text-slate-300">{org.description}</p>}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {org.address && <div><p className="text-slate-400">Alamat</p><p className="text-slate-700 dark:text-slate-200">{org.address}</p></div>}
              {org.phone && <div><p className="text-slate-400">Telepon</p><p className="text-slate-700 dark:text-slate-200">{org.phone}</p></div>}
              {org.email && <div><p className="text-slate-400">Email</p><p className="text-slate-700 dark:text-slate-200">{org.email}</p></div>}
            </div>
          </div>
        )}

        {/* About text */}
        <div className="card p-6 mt-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Tentang Sistem</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {brandConfig.system.name} adalah platform terpadu untuk pengelolaan sarana dan prasarana.
            Sistem ini memungkinkan pengguna untuk meminjam barang dan fasilitas, melaporkan kerusakan,
            serta memantau status persetujuan secara real-time. Dengan alur kerja yang transparan dan
            notifikasi otomatis, {brandConfig.system.name} membantu menjaga inventaris tetap terorganisir
            dan dapat dilacak oleh semua pihak yang berkepentingan.
          </p>
        </div>

        {/* Features */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Fitur Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="card p-5 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Visi</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Menjadi sistem manajemen sarana dan prasarana yang terdepan, transparan, dan
              mudah diakses oleh seluruh warga sekolah untuk mendukung kegiatan belajar mengajar.
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-500" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Misi</h3>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Mempermudah proses peminjaman sarana.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Menjamin transparansi alur persetujuan.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Mempercepat pelaporan dan penanganan kerusakan.</li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

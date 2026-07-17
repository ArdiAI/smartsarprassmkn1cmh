import { useEffect, useState } from 'react';
import { Info, CheckCircle, Users, Building, Package, ClipboardList, Shield, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

const FEATURES = [
  { icon: Building, title: 'Manajemen Fasilitas', description: 'Kelola semua fasilitas sekolah dengan informasi lokasi, kapasitas, dan kategori yang terorganisir.' },
  { icon: Package, title: 'Inventaris Terpadu', description: 'Pantau seluruh inventaris dengan status kondisi barang dan kategori yang jelas.' },
  { icon: ClipboardList, title: 'Peminjaman Online', description: 'Ajukan peminjaman barang dengan sistem keranjang dan alur persetujuan multi-langkah.' },
  { icon: Shield, title: 'Laporan Kerusakan', description: 'Laporkan kerusakan fasilitas atau inventaris dengan tingkat keparahan yang terukur.' },
  { icon: Zap, title: 'Notifikasi Otomatis', description: 'Pemberitahuan otomatis untuk setiap perubahan status peminjaman dan laporan.' },
  { icon: Users, title: 'Transparansi', description: 'Riwayat peminjaman dan laporan dapat dipantau oleh seluruh warga sekolah.' },
];

export default function AboutPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, description, address, phone, email')
        .limit(1)
        .single();
      setOrganization((data as unknown as Organization) || null);
      setLoading(false);
    };
    fetchOrg().catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium mb-4">
            <Info className="w-4 h-4" />
            Tentang Kami
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            SMART SARPRAS
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Sistem Manajemen Sarana dan Prasarana — platform terpadu untuk pengelolaan fasilitas,
            inventaris, peminjaman, dan pelaporan kerusakan di lingkungan sekolah.
          </p>
        </div>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Fitur Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Organization info */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-center">Informasi Organisasi</h2>
          {loading ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 animate-pulse h-48" />
          ) : organization ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 max-w-3xl mx-auto animate-slide-up">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{organization.name}</h3>
                  {organization.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{organization.description}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                {organization.address && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Alamat</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{organization.address}</p>
                  </div>
                )}
                {organization.phone && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Telepon</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{organization.phone}</p>
                  </div>
                )}
                {organization.email && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Email</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{organization.email}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <EmptyState icon={Building} title="Informasi organisasi belum tersedia" description="Data organisasi akan ditampilkan di sani setelah dikonfigurasi." />
            </div>
          )}
        </section>

        {/* Mission */}
        <section className="mt-12">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-8 text-center text-white max-w-3xl mx-auto">
            <CheckCircle className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Misi Kami</h2>
            <p className="text-blue-50">
              Menciptakan ekosistem pengelolaan sarana dan prasarana sekolah yang efisien, transparan,
              dan akuntabel melalui teknologi digital.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

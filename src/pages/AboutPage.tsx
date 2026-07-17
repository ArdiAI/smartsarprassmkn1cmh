import { useState, useEffect } from 'react';
import {
  Info, Users, Target, Eye, Award, Calendar, Phone, Mail,
  Building2, ShieldCheck, Zap, ClipboardList, BarChart3, Loader2, Sparkles
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import { cn } from '../utils/cn';

interface Organization {
  id: string;
  name: string;
  type: string;
  advisor: string;
  leader: string;
  description: string;
  schedule: string;
  contact: string;
  logo_url: string;
  order: number;
  created_at: string;
}

interface AboutSetting {
  id: string;
  section: string;
  content: any;
  updated_at: string;
}

const features = [
  { icon: ClipboardList, title: 'Manajemen Peminjaman', description: 'Sistem peminjaman barang dan fasilitas yang terpadu dengan alur persetujuan multi-level.' },
  { icon: Building2, title: 'Inventaris & Fasilitas', description: 'Pelacakan inventaris dan fasilitas secara real-time dengan informasi ketersediaan.' },
  { icon: ShieldCheck, title: 'Laporan Kerusakan', description: 'Pelaporan kerusakan sarana prasarana yang cepat dan mudah dengan tracking status.' },
  { icon: BarChart3, title: 'Statistik & Rekap', description: 'Dashboard statistik untuk memantau penggunaan dan ketersediaan sarana prasarana.' },
  { icon: Zap, title: 'Notifikasi Otomatis', description: 'Email notifikasi otomatis untuk setiap peminjaman dan update status.' },
  { icon: Award, title: 'Transparansi', description: 'Sistem yang transparan untuk seluruh warga sekolah dengan akses informasi yang mudah.' },
];

export default function AboutPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [settings, setSettings] = useState<AboutSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [orgRes, setRes] = await Promise.all([
          supabase.from('organizations').select('*').order('order', { ascending: true }),
          supabase.from('about_settings').select('*'),
        ]);

        if (orgRes.data) setOrganizations(orgRes.data as unknown as Organization[]);
        if (setRes.data) setSettings(setRes.data as unknown as AboutSetting[]);
      } catch (e) {
        console.error('Error fetching about data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const visionSetting = settings.find((s) => s.section === 'vision');
  const missionSetting = settings.find((s) => s.section === 'mission');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Tentang Sistem
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {brandConfig.system.name}
            </span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {brandConfig.system.fullName} — sebuah sistem terpadu untuk mengelola sarana dan prasarana sekolah dengan efisien, transparan, dan modern.
          </p>
        </div>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-500" />
            Fitur Utama
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vision */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Visi</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {visionSetting?.content?.text ||
                  'Menjadi sistem manajemen sarana dan prasarana terpadu yang unggul, transparan, dan mendukung optimalisasi pembelajaran di sekolah.'}
              </p>
            </div>

            {/* Mission */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Misi</h3>
              </div>
              {missionSetting?.content?.items ? (
                <ul className="space-y-2">
                  {(missionSetting.content.items as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  <li className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Menyediakan sistem manajemen sarana prasarana yang efisien dan mudah digunakan.</span>
                  </li>
                  <li className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Memastikan transparansi dalam pengelolaan peminjaman dan pelaporan.</span>
                  </li>
                  <li className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Mendukung optimalisasi pemanfaatan sarana prasarana sekolah.</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Organizations */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Organisasi & Ekstrakurikuler
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada data organisasi" description="Data organisasi akan muncul di sini" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-4">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{org.name}</h3>
                      {org.type && <span className="text-xs text-slate-400 dark:text-slate-500">{org.type}</span>}
                    </div>
                  </div>
                  {org.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">{org.description}</p>
                  )}
                  <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                    {org.leader && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Ketua: {org.leader}</span>
                      </div>
                    )}
                    {org.advisor && (
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        <span>Pembina: {org.advisor}</span>
                      </div>
                    )}
                    {org.schedule && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{org.schedule}</span>
                      </div>
                    )}
                    {org.contact && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{org.contact}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact / Info */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-6 h-6" />
              <h2 className="text-xl font-bold">Informasi Kontak</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-100 mb-1">Sekolah</p>
                <p className="font-medium">{brandConfig.school.name}</p>
              </div>
              <div>
                <p className="text-blue-100 mb-1">Alamat</p>
                <p className="font-medium">{brandConfig.school.address}</p>
              </div>
              {brandConfig.school.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{brandConfig.school.email}</span>
                </div>
              )}
              {brandConfig.school.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{brandConfig.school.phone}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Info, Target, Eye, Users, Mail, Phone, Zap, ShieldCheck,
  BarChart3, ClipboardList, Building2, Package, Bell,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  role: string;
  photo_url: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
}

interface AboutSettings {
  id: string;
  section: string;
  content: Record<string, any>;
  updated_at: string;
}

const features = [
  { icon: Package, title: 'Manajemen Inventaris', desc: 'Kelola semua barang inventaris dengan pelacakan stok real-time dan kondisi barang.' },
  { icon: Building2, title: 'Pengelolaan Fasilitas', desc: 'Daftar dan kelola fasilitas dengan informasi kapasitas dan lokasi yang lengkap.' },
  { icon: ClipboardList, title: 'Sistem Peminjaman', desc: 'Ajukan peminjaman barang atau fasilitas dengan alur persetujuan berjenjang.' },
  { icon: ShieldCheck, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan sarana prasarana dengan tingkat keparahan dan pelacakan status.' },
  { icon: BarChart3, title: 'Rekap & Statistik', desc: 'Pantau statistik peminjaman, inventaris, dan fasilitas dalam satu dashboard.' },
  { icon: Bell, title: 'Pengumuman', desc: 'Sampaikan informasi penting kepada seluruh pengguna melalui sistem pengumuman.' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AboutPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [aboutSettings, setAboutSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamRes, settingsRes] = await Promise.all([
          supabase
            .from('team_members')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true }),
          supabase.from('about_settings').select('*'),
        ]);

        if (teamRes.error) throw teamRes.error;
        setTeamMembers((teamRes.data as unknown as TeamMember[]) || []);

        const settingsMap: Record<string, any> = {};
        (settingsRes.data as unknown as AboutSettings[] || []).forEach((s) => {
          settingsMap[s.section] = s.content;
        });
        setAboutSettings(settingsMap);
      } catch (err) {
        console.error('Error fetching about data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const vision = aboutSettings.vision?.text || 'Menjadi sistem manajemen sarana dan prasarana terdepan yang terintegrasi, transparan, dan efisien untuk mendukung seluruh kegiatan operasional.';
  const mission = aboutSettings.mission?.text || aboutSettings.mission?.items || [
    'Menyediakan platform terpadu untuk pengelolaan sarana dan prasarana',
    'Memastikan transparansi dan akuntabilitas dalam setiap peminjaman',
    'Meningkatkan efisiensi pengelolaan inventaris dan fasilitas',
    'Memberikan kemudahan akses informasi bagi seluruh pengguna',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1">
        {/* Hero / Intro */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
              <Info className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-300">Tentang Sistem</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">SMART SARPRAS</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Sistem Manajemen Sarana dan Prasarana Terpadu — platform digital yang mengintegrasikan pengelolaan inventaris, fasilitas, peminjaman, dan pelaporan kerusakan dalam satu sistem yang efisien dan transparan.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-blue-500" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Fitur Utama</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400">Berbagai fitur untuk pengelolaan sarana dan prasarana</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision / Mission */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vision */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Visi</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{vision}</p>
            </div>

            {/* Mission */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Misi</h2>
              </div>
              {Array.isArray(mission) ? (
                <ul className="space-y-3">
                  {mission.map((m: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 flex-shrink-0" />
                      <span className="leading-relaxed">{m}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{mission}</p>
              )}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tim</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400">Tim pengelola SMART SARPRAS</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mx-auto mb-2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : teamMembers.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada anggota tim" description="Anggota tim akan ditampilkan di sini" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((m) => (
                <div key={m.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-white">{getInitials(m.name)}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{m.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">{m.position}</p>
                  {m.role && <p className="text-xs text-slate-400 mb-3">{m.role}</p>}
                  {m.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">{m.description}</p>
                  )}
                  <div className="flex flex-col gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {m.email && (
                      <div className="flex items-center justify-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{m.email}</span>
                      </div>
                    )}
                    {m.phone && (
                      <div className="flex items-center justify-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{m.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

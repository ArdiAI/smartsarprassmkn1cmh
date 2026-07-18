import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import {
  Info, Users, Target, Eye, Shield, Zap, Database, Smartphone,
  Bell, BarChart3, Mail, Phone, Loader2, CheckCircle,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  role: string | null;
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
  content: any;
  updated_at: string;
}

const features = [
  { icon: Database, title: 'Manajemen Inventaris', desc: 'Kelola semua sarana dan prasarana dalam satu sistem terpusat dengan pelacakan stok real-time.' },
  { icon: Smartphone, title: 'Akses Mobile-Friendly', desc: 'Akses sistem dari perangkat apa pun dengan antarmuka yang responsif dan modern.' },
  { icon: Bell, title: 'Notifikasi Otomatis', desc: 'Pemberitahuan otomatis untuk status peminjaman dan laporan kerusakan melalui email.' },
  { icon: BarChart3, title: 'Statistik & Rekap', desc: 'Pantau aktivitas peminjaman dan laporan dengan statistik yang mudah dipahami.' },
  { icon: Shield, title: 'Alur Persetujuan', desc: 'Sistem persetujuan multi-level dengan workflow yang dapat dikustomisasi.' },
  { icon: Zap, title: 'Proses Cepat', desc: 'Pengajuan peminjaman dan laporan kerusakan yang cepat dan efisien.' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AboutPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [aboutSettings, setAboutSettings] = useState<AboutSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
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
        setAboutSettings((settingsRes.data as unknown as AboutSettings[]) || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visionSetting = aboutSettings.find(s => s.section === 'vision' || s.section === 'visi');
  const missionSetting = aboutSettings.find(s => s.section === 'mission' || s.section === 'misi');
  const visionContent = visionSetting?.content;
  const missionContent = missionSetting?.content;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
            <Info className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Tentang <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{brandConfig.system.name}</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {brandConfig.system.fullName}
          </p>
        </div>

        {/* Intro */}
        <div className="card p-8 mb-8">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-center">
            {brandConfig.system.name} adalah sistem manajemen sarana dan prasarana terpadu yang dirancang
            untuk mempermudah pengelolaan, peminjaman, dan pelaporan kerusakan fasilitas.
            Dengan teknologi modern dan antarmuka yang intuitif, sistem ini membantu
            seluruh warga sekolah dalam mengakses dan memanfaatkan sarana prasarana
            secara efisien dan transparan.
          </p>
        </div>

        {/* Features */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">Fitur Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Visi</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {visionContent?.text || visionContent?.vision || visionContent ||
                'Menjadi sistem manajemen sarana dan prasarana yang terdepan, efisien, dan terpercaya untuk mendukung kegiatan pembelajaran yang optimal.'}
            </p>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Misi</h3>
            </div>
            {Array.isArray(missionContent?.items || missionContent?.mission) ? (
              <ul className="space-y-2">
                {(missionContent.items || missionContent.mission).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                    <CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {missionContent?.text || missionContent?.mission || missionContent ||
                  'Menyediakan platform terpadu untuk pengelolaan sarana prasarana, memastikan transparansi peminjaman, mempermudah pelaporan kerusakan, dan memberikan layanan terbaik bagi seluruh warga sekolah.'}
              </p>
            )}
          </div>
        </div>

        {/* Team */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center flex items-center justify-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> Tim
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
            Tim pengelola {brandConfig.system.name}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="card p-6">
              <EmptyState icon={Users} title="Belum ada anggota tim" description="Anggota tim akan ditampilkan di sini" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map(member => (
                <div key={member.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.textContent = getInitials(member.name);
                          }}
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">{getInitials(member.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{member.name}</h3>
                      <p className="text-sm text-blue-600 dark:text-blue-400">{member.position}</p>
                      {member.role && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{member.role}</p>
                      )}
                    </div>
                  </div>
                  {member.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 line-clamp-3">{member.description}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors">
                        <Mail className="w-3.5 h-3.5" /> {member.email}
                      </a>
                    )}
                    {member.phone && (
                      <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5" /> {member.phone}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

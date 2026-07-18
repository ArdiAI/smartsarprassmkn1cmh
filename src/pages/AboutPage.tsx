import { useEffect, useState } from 'react';
import {
  Users, Target, Eye, Zap, ShieldCheck, BarChart3, Mail, Phone,
  Award, Briefcase, UserCircle, Sparkles, Info,
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

interface AboutSetting {
  id: string;
  section: string;
  content: Record<string, unknown>;
  updated_at: string;
}

const features = [
  { icon: Zap, title: 'Peminjaman Cepat', description: 'Ajukan peminjaman barang dan fasilitas dalam hitungan menit dengan alur yang mudah.' },
  { icon: ShieldCheck, title: 'Persetujuan Bertingkat', description: 'Sistem workflow persetujuan multi-level untuk akuntabilitas penuh setiap peminjaman.' },
  { icon: BarChart3, title: 'Pelacakan Real-time', description: 'Pantau status peminjaman dan ketersediaan inventaris secara real-time.' },
  { icon: Award, title: 'Manajemen Inventaris', description: 'Kelola seluruh sarana dan prasarana sekolah dalam satu platform terpadu.' },
  { icon: Info, title: 'Laporan Kerusakan', description: 'Laporkan kerusakan dengan cepat dan lacak proses perbaikannya.' },
  { icon: Target, title: 'Transparansi Penuh', description: 'Semua aktivitas tercatat untuk audit dan transparansi pengelolaan sarpras.' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [visionMission, setVisionMission] = useState<{ vision?: string; mission?: string }>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamRes, settingsRes] = await Promise.all([
          supabase
            .from('team_members')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true }),
          supabase
            .from('about_settings')
            .select('id, section, content, updated_at')
            .in('section', ['vision', 'mission', 'vision_mission']),
        ]);

        setTeam((teamRes.data as unknown as TeamMember[]) || []);

        const settings = (settingsRes.data as unknown as AboutSetting[]) || [];
        const vm: { vision?: string; mission?: string } = {};
        for (const s of settings) {
          const content = s.content;
          if (s.section === 'vision' || s.section === 'vision_mission') {
            const vision = content?.vision as string | undefined;
            if (vision) vm.vision = vision;
          }
          if (s.section === 'mission' || s.section === 'vision_mission') {
            const mission = content?.mission as string | undefined;
            if (mission) vm.mission = mission;
          }
        }
        setVisionMission(vm);
      } catch (err) {
        console.error('Error fetching about data:', err);
      } finally {
        setLoadingTeam(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1">
        {/* Hero / Intro */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Tentang Sistem</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">SMART SARPRAS</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">
              Sistem Manajemen Sarana dan Prasarana Terpadu — Platform digital terpadu untuk pengelolaan sarana, prasarana, peminjaman, dan pelaporan kerusakan di lingkungan sekolah.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              SMART SARPRAS dirancang untuk meningkatkan efisiensi, transparansi, dan akuntabilitas dalam pengelolaan sarana dan prasarana, sehingga seluruh warga sekolah dapat memanfaatkan fasilitas dengan optimal.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white text-center mb-2">Fitur Unggulan</h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8 max-w-xl mx-auto">
            Berbagai fitur yang membuat pengelolaan sarpras menjadi lebih mudah dan efisien
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="group rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision / Mission */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vision */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Visi</h3>
              <p className="text-blue-50 leading-relaxed">
                {visionMission.vision ||
                  'Menjadi sistem manajemen sarana dan prasarana terdepan yang mendukung terciptanya lingkungan belajar yang nyaman, aman, dan produktif bagi seluruh warga sekolah.'}
              </p>
            </div>
            {/* Mission */}
            <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-8 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Misi</h3>
              <p className="text-cyan-50 leading-relaxed">
                {visionMission.mission ||
                  'Mengelola sarana dan prasarana sekolah secara terpadu, transparan, dan akuntabel melalui sistem digital yang efisien, serta memastikan ketersediaan dan kelayakan fasilitas untuk mendukung kegiatan pembelajaran.'}
              </p>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">Tim Kami</h2>
            <p className="text-slate-500 dark:text-slate-400">Tim pengelola sarana dan prasarana sekolah</p>
          </div>

          {loadingTeam ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4 animate-pulse" />
                  <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto mb-2" />
                  <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          ) : team.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada anggota tim" description="Anggota tim akan ditampilkan di sini" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all text-center"
                >
                  {/* Photo or initials */}
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.textContent = getInitials(member.name);
                        }}
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">{getInitials(member.name)}</span>
                    )}
                  </div>

                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-0.5">{member.position}</p>
                  {member.role && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-300">
                      {member.role}
                    </span>
                  )}

                  {member.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-3">{member.description}</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    )}
                    {member.phone && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{member.phone}</span>
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

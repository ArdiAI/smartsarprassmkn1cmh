import { useEffect, useState } from 'react';
import {
  Users,
  Target,
  Eye,
  Zap,
  Shield,
  BarChart3,
  Smartphone,
  Mail,
  Phone,
  Award,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
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
}

interface AboutSettings {
  id: string;
  section: string;
  content: any;
}

const features = [
  {
    icon: Zap,
    title: 'Peminjaman Cepat',
    description: 'Ajukan peminjaman barang dan fasilitas dengan mudah dalam hitungan menit.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: BarChart3,
    title: 'Pelaporan Otomatis',
    description: 'Sistem pelaporan kerusakan terintegrasi dengan notifikasi otomatis.',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    icon: Shield,
    title: 'Aman & Transparan',
    description: 'Setiap peminjaman tercatat dengan alur persetujuan yang jelas dan transparan.',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    icon: Smartphone,
    title: 'Akses Mobile',
    description: 'Akses sistem dari mana saja melalui perangkat mobile atau desktop.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: Users,
    title: 'Manajemen Tim',
    description: 'Kelola penanggung jawab sarana prasarana dengan sistem role-based.',
    color: 'from-rose-500 to-rose-600',
  },
  {
    icon: Award,
    title: 'Audit Trail',
    description: 'Setiap aktivitas tercatat untuk keperluan audit dan evaluasi.',
    color: 'from-amber-500 to-amber-600',
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AboutPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [aboutSettings, setAboutSettings] = useState<AboutSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamResult, settingsResult] = await Promise.all([
          supabase
            .from('team_members')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true }),
          supabase.from('about_settings').select('*'),
        ]);

        if (teamResult.error) throw teamResult.error;
        setTeamMembers((teamResult.data as unknown as TeamMember[]) || []);

        if (settingsResult.error) throw settingsResult.error;
        setAboutSettings((settingsResult.data as unknown as AboutSettings[]) || []);
      } catch (err) {
        console.error('Error fetching about data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const visionSetting = aboutSettings.find((s) => s.section === 'vision');
  const missionSetting = aboutSettings.find((s) => s.section === 'mission');

  const defaultVision = 'Menjadi sistem manajemen sarana dan prasarana terdepan yang mengintegrasikan teknologi digital untuk menciptakan tata kelola yang efisien, transparan, dan akuntabel.';
  const defaultMission = [
    'Mempermudah proses peminjaman dan pengembalian sarana prasarana',
    'Meningkatkan transparansi dalam pengelolaan inventaris',
    'Mempercepat respons terhadap laporan kerusakan',
    'Menyediakan data akurat untuk pengambilan keputusan',
  ];

  const visionText = visionSetting?.content?.text || defaultVision;
  const missionItems: string[] = missionSetting?.content?.items || defaultMission;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Navbar />
      <main className="flex-1">
        {/* Hero / Intro */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium mb-6">
              <Award className="w-4 h-4" />
              Tentang Kami
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {brandConfig.system.name}
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              {brandConfig.system.fullName}
            </p>
            <p className="mt-6 text-slate-600 dark:text-slate-400 leading-relaxed">
              SMART SARPRAS adalah sistem terpadu yang dirancang untuk memudahkan pengelolaan sarana dan prasarana.
              Dengan teknologi modern, sistem ini mengintegrasikan peminjaman, pelaporan, dan manajemen inventaris
              dalam satu platform yang mudah diakses dan digunakan.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Fitur Unggulan</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Berbagai fitur yang membuat pengelolaan sarana prasarana lebih mudah
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', feature.color)}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision / Mission */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vision */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Visi</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{visionText}</p>
            </div>

            {/* Mission */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Misi</h2>
              </div>
              <ul className="space-y-3">
                {missionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Tim</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Tim pengelola sarana dan prasarana
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 animate-pulse">
                  <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mx-auto mb-2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : teamMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ada anggota tim"
              description="Anggota tim akan ditampilkan di sini."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all text-center"
                >
                  {/* Photo or initials */}
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">{getInitials(member.name)}</span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{member.position}</p>
                  {member.role && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{member.role}</p>
                  )}

                  {member.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 line-clamp-3">
                      {member.description}
                    </p>
                  )}

                  {(member.email || member.phone) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          {member.email}
                        </a>
                      )}
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          {member.phone}
                        </a>
                      )}
                    </div>
                  )}
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

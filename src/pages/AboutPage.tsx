import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import {
  Shield, Target, Eye, Users, Mail, Phone, Loader2, Award, Zap, HeartHandshake,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  role: string | null;
  photo_url: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  order: number;
}

interface AboutSettings {
  id: string;
  section: string;
  content: any;
}

const features = [
  { icon: Zap, title: 'Cepat & Efisien', desc: 'Ajukan peminjaman dan laporan kerusakan dalam hitungan menit.', color: 'from-blue-500 to-cyan-500' },
  { icon: Shield, title: 'Transparan', desc: 'Pantau status peminjaman dan laporan secara real-time.', color: 'from-cyan-500 to-teal-500' },
  { icon: Award, title: 'Terorganisir', desc: 'Data sarana dan prasarana tercatat secara sistematis.', color: 'from-indigo-500 to-blue-500' },
  { icon: HeartHandshake, title: 'Kolaboratif', desc: 'Memudahkan koordinasi antar warga sekolah.', color: 'from-emerald-500 to-teal-500' },
];

const avatarFallback = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&size=200`;

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [teamRes, settingsRes] = await Promise.all([
        supabase
          .from('team_members')
          .select('*')
          .eq('is_active', true)
          .order('order', { ascending: true }),
        supabase.from('about_settings').select('*'),
      ]);
      setTeam((teamRes.data as unknown as TeamMember[]) || []);
      const settingsMap: Record<string, any> = {};
      ((settingsRes.data as unknown as AboutSettings[]) || []).forEach((s) => {
        settingsMap[s.section] = s.content;
      });
      setSettings(settingsMap);
      setLoading(false);
    })();
  }, []);

  const vision = settings.visi?.text || 'Menjadi sistem manajemen sarana dan prasarana terdepan yang transparan, efisien, dan terintegrasi.';
  const mission: string[] = settings.misi?.items || [
    'Mempermudah proses peminjaman sarana dan prasarana',
    'Meningkatkan transparansi dan akuntabilitas pengelolaan',
    'Mempercepat penanganan laporan kerusakan',
    'Menyediakan data yang akurat dan terkini',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
              Tentang{' '}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {brandConfig.system.name}
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              {brandConfig.system.fullName}
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="card p-5 text-center">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mx-auto mb-3`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Visi</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{vision}</p>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Misi</h2>
              </div>
              <ul className="space-y-2">
                {mission.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tim Pengembang</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : team.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada anggota tim" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {team.map((m) => (
                <div key={m.id} className="card p-5 text-center hover:shadow-lg transition-shadow">
                  <img
                    src={m.photo_url || avatarFallback(m.name)}
                    alt={m.name}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = avatarFallback(m.name);
                    }}
                  />
                  <h3 className="font-semibold text-slate-900 dark:text-white">{m.name}</h3>
                  {m.position && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{m.position}</p>
                  )}
                  {m.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">{m.description}</p>
                  )}
                  <div className="mt-3 space-y-1">
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500">
                        <Mail className="w-3.5 h-3.5" />
                        {m.email}
                      </a>
                    )}
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500">
                        <Phone className="w-3.5 h-3.5" />
                        {m.phone}
                      </a>
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

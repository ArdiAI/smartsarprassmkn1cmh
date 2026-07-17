import { useEffect, useState } from 'react';
import {
  Info,
  Target,
  Eye,
  Zap,
  Shield,
  Users,
  Mail,
  Phone,
  Calendar,
  Building2,
  Award,
  Layers,
  Sparkles,
  Heart,
  BookOpen,
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
  photo_url: string;
  description: string;
  email: string;
  phone: string;
  order: number;
  is_active: boolean;
}

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
}

interface AboutSettings {
  id: string;
  section: string;
  content: Record<string, any>;
}

const features = [
  { icon: Zap, title: 'Peminjaman Cepat', desc: 'Ajukan peminjaman barang dan fasilitas secara online dengan mudah' },
  { icon: Shield, title: 'Pelacakan Terpadu', desc: 'Pantau status peminjaman dan persetujuan secara real-time' },
  { icon: Layers, title: 'Inventaris Terorganisir', desc: 'Kelola data barang dan fasilitas dalam satu sistem' },
  { icon: Heart, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan dengan cepat dan mudah' },
  { icon: Users, title: 'Manajemen Tim', desc: 'Koordinasi antar pengelola sarana prasarana' },
  { icon: BookOpen, title: 'Aspirasi & Saran', desc: 'Salurkan aspirasi untuk peningkatan layanan' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');
}

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [settings, setSettings] = useState<AboutSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [teamRes, orgRes, settingsRes] = await Promise.all([
          supabase
            .from('team_members')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true }),
          supabase
            .from('organizations')
            .select('*')
            .order('order', { ascending: true }),
          supabase
            .from('about_settings')
            .select('*'),
        ]);

        setTeam((teamRes.data as unknown as TeamMember[]) || []);
        setOrganizations((orgRes.data as unknown as Organization[]) || []);
        setSettings((settingsRes.data as unknown as AboutSettings[]) || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visionSetting = settings.find((s) => s.section === 'vision' || s.section === 'visi');
  const missionSetting = settings.find((s) => s.section === 'mission' || s.section === 'misi');
  const aboutSetting = settings.find((s) => s.section === 'about' || s.section === 'tentang');

  const visionText: string = visionSetting?.content?.text || visionSetting?.content?.vision || '';
  const missionText: string = missionSetting?.content?.text || missionSetting?.content?.mission || '';
  const missionList: string[] = missionSetting?.content?.list || missionSetting?.content?.missions || [];
  const aboutText: string = aboutSetting?.content?.text || aboutSetting?.content?.description || '';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Tentang <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{brandConfig.system.name}</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {aboutText || brandConfig.system.fullName}
          </p>
        </div>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Fitur Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Visi</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {visionText || 'Menjadi sistem manajemen sarana dan prasarana yang terdepan, efisien, dan terpadu untuk mendukung kegiatan belajar mengajar yang optimal.'}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Misi</h3>
              </div>
              {missionList.length > 0 ? (
                <ul className="space-y-2">
                  {missionList.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <Sparkles className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {missionText || 'Menyediakan platform digital yang memudahkan pengelolaan, peminjaman, dan pelaporan sarana prasarana secara transparan dan akuntabel.'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tim Pengelola</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4 animate-pulse" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
                </div>
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <EmptyState icon={Users} title="Belum ada anggota tim" description="Anggota tim akan ditampilkan di sini" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map((m) => (
                <div
                  key={m.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-center"
                >
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-white">{getInitials(m.name)}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{m.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">{m.position}</p>
                  {m.role && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{m.role}</p>
                  )}
                  {m.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-3">{m.description}</p>
                  )}
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {m.email && (
                      <div className="flex items-center justify-center gap-1.5">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{m.email}</span>
                      </div>
                    )}
                    {m.phone && (
                      <div className="flex items-center justify-center gap-1.5">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{m.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Organizations */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Organisasi</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <EmptyState icon={Building2} title="Belum ada organisasi" description="Data organisasi akan ditampilkan di sini" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {organizations.map((o) => (
                <div
                  key={o.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {o.logo_url ? (
                        <img src={o.logo_url} alt={o.name} className="w-full h-full object-cover" />
                      ) : (
                        <Award className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{o.name}</h3>
                      {o.type && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {o.type}
                        </span>
                      )}
                      {o.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{o.description}</p>
                      )}
                      <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {o.leader && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 flex-shrink-0" />
                            <span>Ketua: {o.leader}</span>
                          </div>
                        )}
                        {o.advisor && (
                          <div className="flex items-center gap-1.5">
                            <Award className="w-3 h-3 flex-shrink-0" />
                            <span>Pembina: {o.advisor}</span>
                          </div>
                        )}
                        {o.schedule && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span>{o.schedule}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Info,
  Users,
  Target,
  Eye,
  CheckCircle2,
  Package,
  ClipboardList,
  Wrench,
  BarChart3,
  Building2,
  Mail,
  Phone,
  Calendar,
  User as UserIcon,
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
  content: any;
}

const features = [
  { icon: Package, title: 'Manajemen Inventaris', desc: 'Kelola seluruh barang inventaris dengan pelacakan kondisi dan ketersediaan real-time.' },
  { icon: Building2, title: 'Peminjaman Fasilitas', desc: 'Sistem peminjaman fasilitas dengan alur persetujuan multi-level.' },
  { icon: ClipboardList, title: 'Pengajuan Online', desc: 'Ajukan peminjaman barang kapan saja, di mana saja secara online.' },
  { icon: Wrench, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan sarana dengan cepat dan mudah dengan pelacakan status.' },
  { icon: BarChart3, title: 'Rekap & Statistik', desc: 'Pantau statistik peminjaman dan inventaris dalam satu dashboard.' },
  { icon: CheckCircle2, title: 'Alur Persetujuan', desc: 'Workflow persetujuan bertingkat dengan notifikasi otomatis via email.' },
];

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [aboutSettings, setAboutSettings] = useState<Record<string, AboutSettings>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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
          supabase.from('about_settings').select('*'),
        ]);

        setTeam((teamRes.data as unknown as TeamMember[]) || []);
        setOrgs((orgRes.data as unknown as Organization[]) || []);

        const settingsMap: Record<string, AboutSettings> = {};
        ((settingsRes.data as unknown as AboutSettings[]) || []).forEach((s) => {
          settingsMap[s.section] = s;
        });
        setAboutSettings(settingsMap);
      } catch (e) {
        console.error('Failed to fetch about data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const visionContent = aboutSettings['vision']?.content;
  const missionContent = aboutSettings['mission']?.content;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-4">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Tentang Kami</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">SMART SARPRAS</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Sistem Manajemen Sarana dan Prasarana Terpadu — Platform digital terpadu untuk pengelolaan sarana, prasarana, inventaris, dan peminjaman secara efisien dan transparan.
          </p>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">Fitur Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="card p-6 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vision */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-700/50 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Visi</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {visionContent?.text || visionContent?.vision || 'Menjadi sistem manajemen sarana dan prasarana yang terdepan, efisien, dan transparan untuk mendukung seluruh kegiatan operasional dengan teknologi digital.'}
              </p>
            </div>
            {/* Mission */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-slate-700/50 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Misi</h2>
              </div>
              {Array.isArray(missionContent?.missions) && missionContent.missions.length > 0 ? (
                <ul className="space-y-2">
                  {missionContent.missions.map((m: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {[
                    'Menyediakan platform digital untuk pengelolaan sarana dan prasarana.',
                    'Meningkatkan efisiensi dan transparansi proses peminjaman.',
                    'Memfasilitasi pelaporan kerusakan secara cepat dan akurat.',
                    'Mengoptimalkan pemanfaatan sumber daya yang tersedia.',
                  ].map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tim</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mx-auto mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : team.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada anggota tim" description="Anggota tim akan muncul di sini." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.map((m) => (
                <div key={m.id} className="card p-6 text-center hover:shadow-md transition-all">
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    {m.photo_url ? (
                      <img
                        src={m.photo_url}
                        alt={m.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">{initials(m.name)}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{m.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">{m.position}</p>
                  {m.role && (
                    <p className="text-xs text-slate-400 mb-3">{m.role}</p>
                  )}
                  {m.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{m.description}</p>
                  )}
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
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

        {/* Organizations */}
        {orgs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Organisasi</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orgs.map((o) => (
                <div key={o.id} className="card p-6 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {o.logo_url ? (
                        <img src={o.logo_url} alt={o.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{o.name}</h3>
                      {o.type && <span className="text-xs text-emerald-600 dark:text-emerald-400">{o.type}</span>}
                    </div>
                  </div>
                  {o.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{o.description}</p>
                  )}
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {o.advisor && (
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Pembina: {o.advisor}</span>
                      </div>
                    )}
                    {o.leader && (
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Ketua: {o.leader}</span>
                      </div>
                    )}
                    {o.schedule && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{o.schedule}</span>
                      </div>
                    )}
                    {o.contact && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{o.contact}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

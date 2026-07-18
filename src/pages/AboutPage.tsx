import { useEffect, useState, useCallback } from 'react';
import {
  Info, Target, Eye, Users, Mail, Phone, Award, Zap, ShieldCheck,
  LayoutGrid, Calendar, User as UserIcon, Loader2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';
import { brandConfig } from '../brand/config';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  role: string | null;
  photo_url: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  order: number | null;
  is_active: boolean;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  type: string | null;
  advisor: string | null;
  leader: string | null;
  description: string | null;
  schedule: string | null;
  contact: string | null;
  logo_url: string | null;
  order: number | null;
  created_at: string;
}

interface AboutSetting {
  id: string;
  section: string;
  content: Record<string, unknown>;
  updated_at: string;
}

const features = [
  { icon: LayoutGrid, title: 'Manajemen Terpadu', desc: 'Kelola inventaris, fasilitas, dan peminjaman dalam satu sistem terpadu yang mudah digunakan.' },
  { icon: Zap, title: 'Real-time & Cepat', desc: 'Data diperbarui secara real-time, sehingga selalu mendapatkan informasi terkini.' },
  { icon: ShieldCheck, title: 'Aman & Terpercaya', desc: 'Sistem otentikasi dan otorisasi yang aman dengan tingkat akses berbasis peran.' },
  { icon: Award, title: 'Laporan & Analitik', desc: 'Pantau statistik peminjaman dan kondisi barang dengan laporan yang komprehensif.' },
];

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('') || '?';
}

const avatarColors = [
  'from-blue-500 to-cyan-500',
  'from-indigo-500 to-blue-500',
  'from-cyan-500 to-teal-500',
  'from-violet-500 to-indigo-500',
  'from-sky-500 to-blue-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function AboutPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [aboutSettings, setAboutSettings] = useState<AboutSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, orgRes, settingsRes] = await Promise.all([
        supabase.from('team_members').select('*').eq('is_active', true).order('order', { ascending: true }),
        supabase.from('organizations').select('*').order('order', { ascending: true }),
        supabase.from('about_settings').select('*'),
      ]);

      setTeamMembers((teamRes.data as unknown as TeamMember[]) || []);
      setOrganizations((orgRes.data as unknown as Organization[]) || []);
      setAboutSettings((settingsRes.data as unknown as AboutSetting[]) || []);
    } catch (err) {
      console.error('Error fetching about data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const visionSetting = aboutSettings.find((s) => s.section === 'vision');
  const missionSetting = aboutSettings.find((s) => s.section === 'mission');
  const visionText = (visionSetting?.content?.text as string) || 'Menjadi sistem manajemen sarana dan prasarana terdepan yang mengintegrasikan teknologi digital untuk efisiensi dan transparansi pengelolaan fasilitas.';
  const missionText = (missionSetting?.content?.text as string) || 'Menyediakan platform terpadu untuk pengelolaan inventaris, fasilitas, dan peminjaman yang mudah, cepat, dan akurat bagi seluruh warga sekolah.';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
            <Info className="w-4 h-4" />
            Tentang Kami
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {brandConfig.system.name}
            </span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {brandConfig.system.fullName} — platform digital untuk pengelolaan sarana dan prasarana secara efisien, transparan, dan terpadu.
          </p>
        </div>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Fitur Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Visi</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{visionText}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Misi</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{missionText}</p>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tim</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : teamMembers.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada anggota tim" description="Anggota tim akan muncul di sini" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {teamMembers.map((member) => (
                <div key={member.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow text-center">
                  <div className="w-20 h-20 rounded-2xl mx-auto mb-4 overflow-hidden flex items-center justify-center">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" onError={(e) => {
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="w-full h-full rounded-2xl bg-gradient-to-br ${getAvatarColor(member.name)} flex items-center justify-center text-white text-2xl font-bold">${getInitials(member.name)}</div>`;
                        }
                      }} />
                    ) : (
                      <div className={cn('w-full h-full rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-2xl font-bold', getAvatarColor(member.name))}>
                        {getInitials(member.name)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{member.position}</p>
                  {member.role && <p className="text-xs text-slate-400 mt-0.5">{member.role}</p>}
                  {member.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{member.description}</p>}
                  <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {member.email && (
                      <div className="flex items-center justify-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center justify-center gap-1.5">
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

        {/* Organizations */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Organisasi</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState icon={LayoutGrid} title="Belum ada organisasi" description="Data organisasi akan muncul di sini" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {organizations.map((org) => (
                <div key={org.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <LayoutGrid className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white">{org.name}</h3>
                      {org.type && <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{org.type}</p>}
                      {org.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{org.description}</p>}
                      <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {org.leader && <div className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" />Ketua: {org.leader}</div>}
                        {org.advisor && <div className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" />Pembina: {org.advisor}</div>}
                        {org.schedule && <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{org.schedule}</div>}
                        {org.contact && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{org.contact}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
}

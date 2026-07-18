import { useEffect, useState } from 'react';
import {
  Info, Target, Eye, ShieldCheck, Zap, Users, Mail, Phone, Loader2, Building2, Calendar, User as UserIcon, FileText,
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
}

interface AboutSettings {
  id: string;
  section: string;
  content: Record<string, unknown>;
}

const features = [
  { icon: Zap, title: 'Peminjaman Cepat', desc: 'Ajukan peminjaman barang atau fasilitas hanya dalam beberapa langkah.' },
  { icon: ShieldCheck, title: 'Pelacakan Status', desc: 'Pantau status pengajuan secara real-time dengan alur persetujuan.' },
  { icon: FileText, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan sarana dengan mudah dan terdokumentasi.' },
  { icon: Building2, title: 'Manajemen Inventaris', desc: 'Kelola stok, kondisi, dan lokasi barang dalam satu sistem.' },
  { icon: Users, title: 'Kolaborasi Tim', desc: 'Koordinasi antar pengelola dengan informasi tim yang transparan.' },
  { icon: Eye, title: 'Transparansi Data', desc: 'Akses informasi fasilitas dan inventaris secara terbuka.' },
];

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [settings, setSettings] = useState<AboutSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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
        setTeam((teamRes.data as unknown as TeamMember[]) ?? []);
        setOrganizations((orgRes.data as unknown as Organization[]) ?? []);
        setSettings((settingsRes.data as unknown as AboutSettings[]) ?? []);
      } catch (e) {
        console.error('Failed to fetch about data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const visionSetting = settings.find((s) => s.section === 'vision');
  const missionSetting = settings.find((s) => s.section === 'mission');
  const visionText = (visionSetting?.content?.text as string) || brandConfig.system.fullName;
  const missionText = (missionSetting?.content?.text as string) ||
    'Memberikan layanan manajemen sarana dan prasarana yang cepat, transparan, dan akuntabel untuk seluruh warga sekolah.';

  function initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tentang {brandConfig.system.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl mx-auto">
            {brandConfig.system.fullName}
          </p>
        </div>

        {/* Intro */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-white">{brandConfig.system.name}</strong> adalah sistem
            terpadu untuk mengelola sarana dan prasarana. Dengan sistem ini, pengguna dapat melakukan peminjaman
            barang atau fasilitas, melaporkan kerusakan, memantau status pengajuan, serta mengakses informasi
            inventaris secara transparan.
          </p>
        </section>

        {/* Features */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" /> Fitur Utama
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision / Mission */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white">Visi</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{visionText}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-500" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white">Misi</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{missionText}</p>
          </div>
        </section>

        {/* Team */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> Tim
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : team.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <EmptyState icon={Users} title="Belum ada anggota tim" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.map((m) => (
                <div
                  key={m.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {m.photo_url ? (
                      <img
                        src={m.photo_url}
                        alt={m.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold">{initials(m.name)}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{m.name}</h3>
                      <p className="text-sm text-blue-500 dark:text-blue-400 truncate">{m.position}</p>
                    </div>
                  </div>
                  {m.role && (
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mb-2">
                      {m.role}
                    </span>
                  )}
                  {m.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{m.description}</p>
                  )}
                  <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                    {m.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" /> <span className="truncate">{m.email}</span>
                      </div>
                    )}
                    {m.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-cyan-400 flex-shrink-0" /> {m.phone}
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" /> Organisasi
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : organizations.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <EmptyState icon={Building2} title="Belum ada organisasi" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {organizations.map((o) => (
                <div
                  key={o.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {o.logo_url ? (
                      <img src={o.logo_url} alt={o.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{o.name}</h3>
                      {o.type && (
                        <span className="text-xs font-medium text-blue-500 dark:text-blue-400">{o.type}</span>
                      )}
                    </div>
                  </div>
                  {o.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{o.description}</p>
                  )}
                  <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {o.leader && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-blue-400" /> Ketua: {o.leader}
                      </div>
                    )}
                    {o.advisor && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-cyan-400" /> Pembina: {o.advisor}
                      </div>
                    )}
                    {o.schedule && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" /> {o.schedule}
                      </div>
                    )}
                    {o.contact && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-amber-400" /> {o.contact}
                      </div>
                    )}
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

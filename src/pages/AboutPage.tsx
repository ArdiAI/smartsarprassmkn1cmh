import { useEffect, useState } from 'react';
import {
  Info,
  Target,
  Eye,
  Users,
  Mail,
  Phone,
  Building2,
  Calendar,
  Loader2,
  ShieldCheck,
  Zap,
  BarChart3,
  Bell,
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
  content: any;
  updated_at: string;
}

const features = [
  { icon: Building2, title: 'Manajemen Fasilitas', desc: 'Kelola dan pantau seluruh fasilitas dengan terstruktur.' },
  { icon: ShieldCheck, title: 'Inventaris Terpadu', desc: 'Pelacakan barang inventaris beserta kondisinya secara real-time.' },
  { icon: Zap, title: 'Peminjaman Cepat', desc: 'Alur peminjaman berbasis keranjang dengan approval bertingkat.' },
  { icon: BarChart3, title: 'Rekap & Statistik', desc: 'Ringkasan data peminjaman dan inventaris dalam satu tampilan.' },
  { icon: Bell, title: 'Notifikasi Otomatis', desc: 'Pemberitahuan otomatis ke peminjam dan approver via email.' },
  { icon: Target, title: 'Laporan Kerusakan', desc: 'Pelaporan kerusakan sarana dengan tingkat keparahan terperinci.' },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [settings, setSettings] = useState<Record<string, AboutSetting>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [teamRes, orgRes, setRes] = await Promise.all([
          supabase.from('team_members').select('*').eq('is_active', true).order('order', { ascending: true }),
          supabase.from('organizations').select('*').order('order', { ascending: true }),
          supabase.from('about_settings').select('*'),
        ]);

        setTeam((teamRes.data as unknown as TeamMember[]) || []);
        setOrgs((orgRes.data as unknown as Organization[]) || []);
        const setMap: Record<string, AboutSetting> = {};
        ((setRes.data as unknown as AboutSetting[]) || []).forEach((s) => {
          setMap[s.section] = s;
        });
        setSettings(setMap);
      } catch (e) {
        console.error('Failed to load about data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const vision = settings['vision']?.content;
  const mission = settings['mission']?.content;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
            <Info className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Tentang {brandConfig.system.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-2xl mx-auto">{brandConfig.system.fullName}</p>
        </div>

        {/* Intro */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {brandConfig.system.name} adalah sistem manajemen sarana dan prasarana terpadu yang dirancang
            untuk mempermudah pengelolaan fasilitas, inventaris, peminjaman, dan pelaporan kerusakan.
            Dengan sistem ini, seluruh proses administrasi sarpras menjadi lebih transparan, cepat, dan akuntabel.
          </p>
        </section>

        {/* Features */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Fitur Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision / Mission */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Visi</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {typeof vision === 'string' ? vision : vision?.text || 'Menjadi sistem sarpras yang terdepan, transparan, dan efisien dalam mendukung kegiatan operasional.'}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Misi</h2>
            </div>
            {Array.isArray(mission) ? (
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                {mission.map((m, i) => (
                  <li key={i}>{typeof m === 'string' ? m : m?.text}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {typeof mission === 'string' ? mission : mission?.text || 'Menyediakan sistem yang mempermudah pengelolaan sarpras dengan akuntabel dan responsif.'}
              </p>
            )}
          </div>
        </section>

        {/* Team */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> Tim
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : team.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada anggota tim" description="Data tim akan tampil di sini." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.map((m) => (
                <div key={m.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                  <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-white">{initials(m.name)}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{m.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{m.position}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.role}</p>
                  {m.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{m.description}</p>}
                  <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {m.email && <div className="flex items-center justify-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {m.email}</div>}
                    {m.phone && <div className="flex items-center justify-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {m.phone}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Organizations */}
        <section className="mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" /> Organisasi
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : orgs.length === 0 ? (
            <EmptyState icon={Building2} title="Belum ada organisasi" description="Data organisasi akan tampil di sini." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {orgs.map((o) => (
                <div key={o.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {o.logo_url ? (
                        <img src={o.logo_url} alt={o.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{o.name}</h3>
                      {o.type && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">{o.type}</span>}
                      {o.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{o.description}</p>}
                      <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {o.leader && <div>Pembina: {o.leader}</div>}
                        {o.advisor && <div>Advisor: {o.advisor}</div>}
                        {o.schedule && <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {o.schedule}</div>}
                        {o.contact && <div>Kontak: {o.contact}</div>}
                      </div>
                    </div>
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

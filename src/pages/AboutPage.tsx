import { useEffect, useState } from 'react';
import {
  Info, Target, Eye, Users, Mail, Phone, Calendar, Building2,
  Sparkles, ShieldCheck, Boxes, ClipboardList, BarChart3, Loader2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  role: string | null;
  photo_url: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  order: number | null;
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
  content: any;
}

const features = [
  { icon: Boxes, title: 'Manajemen Inventaris', description: 'Kelola seluruh barang inventaris dengan pelacakan kondisi, lokasi, dan ketersediaan secara real-time.' },
  { icon: Building2, title: 'Pengelolaan Fasilitas', description: 'Katalog fasilitas lengkap dengan informasi kapasitas, lokasi, dan penanggung jawab.' },
  { icon: ClipboardList, title: 'Sistem Peminjaman', description: 'Pengajuan peminjaman barang dan fasilitas dengan alur persetujuan multi-langkah.' },
  { icon: ShieldCheck, title: 'Laporan Kerusakan', description: 'Laporkan kerusakan sarana dengan tingkat keparahan dan pelacakan status penanganan.' },
  { icon: BarChart3, title: 'Rekap & Statistik', description: 'Ringkasan data inventaris, fasilitas, dan peminjaman dalam satu dashboard.' },
  { icon: Sparkles, title: 'Notifikasi Otomatis', description: 'Email otomatis untuk pengajuan, persetujuan, dan status peminjaman.' },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tm, og, st] = await Promise.all([
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
        setTeam((tm.data as unknown as TeamMember[]) || []);
        setOrgs((og.data as unknown as Organization[]) || []);
        const settingsMap: Record<string, any> = {};
        ((st.data as unknown as AboutSettings[]) || []).forEach((s) => {
          settingsMap[s.section] = s.content;
        });
        setSettings(settingsMap);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const vision = settings.visi?.text || settings.visi || 'Menjadi sistem manajemen sarana dan prasarana terdepan yang terintegrasi, transparan, dan efisien untuk mendukung kegiatan belajar mengajar yang optimal.';
  const mission = settings.misi?.text || settings.misi || [
    'Menyediakan platform terpadu untuk pengelolaan sarana dan prasarana.',
    'Memastikan transparansi dan akuntabilitas dalam setiap peminjaman.',
    'Meningkatkan efisiensi pengelolaan inventaris dan fasilitas.',
    'Memberikan layanan yang cepat dan responsif kepada seluruh warga sekolah.',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
            <Info className="w-4 h-4" />
            Tentang Kami
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            SMART SARPRAS
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Sistem Manajemen Sarana dan Prasarana Terpadu — platform digital untuk
            mengelola inventaris, fasilitas, peminjaman, dan pelaporan kerusakan dalam
            satu sistem yang terintegrasi.
          </p>
        </div>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Fitur Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="card p-5 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Visi</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {typeof vision === 'string' ? vision : JSON.stringify(vision)}
              </p>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Misi</h2>
              </div>
              {Array.isArray(mission) ? (
                <ul className="space-y-2">
                  {mission.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{typeof m === 'string' ? m : JSON.stringify(m)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {typeof mission === 'string' ? mission : JSON.stringify(mission)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tim</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : team.length === 0 ? (
            <div className="card">
              <EmptyState icon={Users} title="Belum ada anggota tim" description="Anggota tim akan ditampilkan di sini." />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.map((m) => (
                <div key={m.id} className="card p-5 text-center">
                  <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
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
                      <span className="text-white font-bold text-2xl">{getInitials(m.name)}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{m.name}</h3>
                  {m.position && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">{m.position}</p>
                  )}
                  {m.role && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{m.role}</p>
                  )}
                  {m.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{m.description}</p>
                  )}
                  <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="flex items-center justify-center gap-1.5 hover:text-blue-500">
                        <Mail className="w-3.5 h-3.5" />
                        {m.email}
                      </a>
                    )}
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="flex items-center justify-center gap-1.5 hover:text-blue-500">
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

        {/* Organizations */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Organisasi</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : orgs.length === 0 ? (
            <div className="card">
              <EmptyState icon={Building2} title="Belum ada organisasi" description="Data organisasi akan ditampilkan di sini." />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {orgs.map((o) => (
                <div key={o.id} className="card p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {o.logo_url ? (
                        <img src={o.logo_url} alt={o.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{o.name}</h3>
                      {o.type && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{o.type}</p>
                      )}
                      {o.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{o.description}</p>
                      )}
                      <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {o.leader && <p>Ketua: {o.leader}</p>}
                        {o.advisor && <p>Pembina: {o.advisor}</p>}
                        {o.schedule && <p>Jadwal: {o.schedule}</p>}
                        {o.contact && <p>Kontak: {o.contact}</p>}
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

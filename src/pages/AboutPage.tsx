import { useEffect, useState } from 'react';
import {
  Info, Target, Eye, Users, Shield, Zap, Database, Clock, Loader2, Mail, Phone, Award,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { brandConfig } from '../brand/config';

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
  is_active: boolean;
  created_at: string;
}

interface AboutSettings {
  id: string;
  section: string;
  content: any;
  updated_at: string;
}

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<AboutSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [tm, st] = await Promise.all([
        supabase.from('team_members').select('*').eq('is_active', true).order('order', { ascending: true }),
        supabase.from('about_settings').select('*'),
      ]);
      if (!tm.error) setTeam((tm.data as unknown as TeamMember[]) || []);
      if (!st.error) setSettings((st.data as unknown as AboutSettings[]) || []);
      setLoading(false);
    })();
  }, []);

  const getSetting = (section: string) => settings.find(s => s.section === section)?.content;

  const vision = getSetting('vision');
  const mission = getSetting('mission');

  const features = [
    { icon: Database, title: 'Manajemen Inventaris', desc: 'Kelola seluruh sarana dan prasarana sekolah dalam satu sistem terpadu.' },
    { icon: Zap, title: 'Peminjaman Cepat', desc: 'Ajukan peminjaman barang dan fasilitas dengan proses yang mudah dan cepat.' },
    { icon: Shield, title: 'Pelaporan Kerusakan', desc: 'Laporkan kerusakan dengan upload foto dan pelacakan status real-time.' },
    { icon: Clock, title: 'Riwayat & Rekap', desc: 'Pantau seluruh aktivitas peminjaman dan agenda dalam satu tempat.' },
    { icon: Users, title: 'Tim Terorganisir', desc: 'Penanggung jawab yang jelas untuk setiap barang dan fasilitas.' },
    { icon: Award, title: 'Transparan & Akuntabel', desc: 'Sistem yang transparan dengan alur persetujuan yang jelas.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium mb-4">
            <Info className="w-3.5 h-3.5" /> Tentang Kami
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
            SMART <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">SARPRAS</span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-300">
            {brandConfig.system.fullName}. Sebuah sistem informasi terpadu untuk mengelola sarana dan prasarana sekolah secara efisien, transparan, dan akuntabel.
          </p>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">Fitur Utama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Visi</h2>
              </div>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
              ) : vision ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {typeof vision === 'string' ? vision : vision.text || vision.content || JSON.stringify(vision)}
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Menjadi sistem manajemen sarana dan prasarana sekolah yang terdepan, terpadu, dan tepercaya.</p>
              )}
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Misi</h2>
              </div>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
              ) : mission ? (
                typeof mission === 'string' ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{mission}</p>
                ) : Array.isArray(mission) ? (
                  <ul className="space-y-2">
                    {mission.map((m: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{typeof m === 'string' ? m : m.text || m.content || JSON.stringify(m)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {mission.text || mission.content || JSON.stringify(mission)}
                  </p>
                )
              ) : (
                <ul className="space-y-2">
                  {[
                    'Menyediakan sistem informasi yang terpadu untuk pengelolaan sarana dan prasarana.',
                    'Meningkatkan efisiensi dan transparansi dalam proses peminjaman dan pelaporan.',
                    'Mendorong partisipasi seluruh warga sekolah dalam menjaga sarana dan prasarana.',
                  ].map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="text-blue-500 mt-0.5">•</span><span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tim Kami</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
          ) : team.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada anggota tim" description="Anggota tim akan tampil di sini." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {team.map(m => (
                <div key={m.id} className="card p-5 text-center hover:shadow-md transition-shadow">
                  <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <span className="text-2xl font-bold text-slate-400">{m.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{m.name}</h3>
                  {m.position && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{m.position}</p>}
                  {m.role && <p className="text-xs text-slate-400 mt-0.5">{m.role}</p>}
                  {m.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{m.description}</p>}
                  <div className="mt-3 space-y-1">
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600">
                        <Mail className="w-3.5 h-3.5" /> <span className="truncate">{m.email}</span>
                      </a>
                    )}
                    {m.phone && (
                      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5" /> {m.phone}
                      </p>
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

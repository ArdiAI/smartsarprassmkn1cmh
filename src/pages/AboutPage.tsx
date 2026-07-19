import { useEffect, useState } from 'react';
import {
  Building2, Shield, Zap, ClipboardList, CalendarRange, Users,
  Target, Eye, Mail, Phone, Loader2, Info,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { brand } from '../brand/config';
import { cn } from '../utils/cn';

interface TeamMember {
  id: string;
  name: string;
  position: string;
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
  { icon: ClipboardList, title: 'Pengajuan Peminjaman', desc: 'Ajukan peminjaman barang & fasilitas dengan alur persetujuan.' },
  { icon: Building2, title: 'Manajemen Fasilitas', desc: 'Kelola pemesanan ruangan, lapangan, dan area sekolah.' },
  { icon: CalendarRange, title: 'Agenda & Timeline', desc: 'Catat kegiatan sekolah dan lihat kalender terpadu.' },
  { icon: Zap, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan dengan foto dan tingkat keparahan.' },
  { icon: Shield, title: 'Alur Persetujuan', desc: 'Workflow persetujuan bertingkat dengan notifikasi email.' },
  { icon: Users, title: 'Manajemen Tim', desc: 'Kelola anggota tim dan peran dengan kontrol akses.' },
];

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<AboutSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [teamRes, settingsRes] = await Promise.all([
          supabase.from('team_members').select('id, name, position, role, photo_url, description, email, phone, order').eq('is_active', true).order('order', { ascending: true }),
          supabase.from('about_settings').select('id, section, content'),
        ]);
        if (teamRes.error) throw teamRes.error;
        setTeam((teamRes.data as unknown as TeamMember[]) ?? []);
        setSettings((settingsRes.data as unknown as AboutSettings[]) ?? []);
      } catch {
        showToast('Gagal memuat data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const vision = settings.find((s) => s.section === 'vision')?.content;
  const mission = settings.find((s) => s.section === 'mission')?.content;
  const intro = settings.find((s) => s.section === 'intro')?.content;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20">
        <AnimatedBackground />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Tentang {brand.name}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            {typeof intro === 'string' ? intro : brand.description}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-white">Fitur Utama</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-slate-800">
                <f.icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-slate-800">
                <Eye className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Visi</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {vision?.text ?? vision ?? 'Menjadi sistem manajemen sarana dan prasarana sekolah yang terintegrasi, transparan, dan efisien.'}
            </p>
          </div>
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-slate-800">
                <Target className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Misi</h2>
            </div>
            {Array.isArray(mission?.items) ? (
              <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                {mission.items.map((m: string, i: number) => <li key={i}>{m}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {mission?.text ?? mission ?? 'Menyediakan platform terpadu untuk pengelolaan sarana dan prasarana sekolah yang efisien dan transparan.'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-600" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tim Kami</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
        ) : team.length === 0 ? (
          <EmptyState title="Belum ada anggota tim" description="Data anggota tim akan muncul di sini." icon={<Info className="h-8 w-8 text-slate-400" />} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {team.map((m) => (
              <div key={m.id} className="card text-center">
                <div className="mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{m.name}</h3>
                <p className="text-sm text-brand-600 dark:text-brand-400">{m.position}</p>
                {m.role && <p className="mt-0.5 text-xs text-slate-400">{m.role}</p>}
                {m.description && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{m.description}</p>}
                <div className="mt-3 flex justify-center gap-3 text-xs text-slate-400">
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="flex items-center gap-1 hover:text-brand-600"><Mail className="h-3.5 w-3.5" /></a>
                  )}
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="flex items-center gap-1 hover:text-brand-600"><Phone className="h-3.5 w-3.5" /></a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

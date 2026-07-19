import { useEffect, useState } from 'react';
import {
  Package,
  Building2,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  ShieldCheck,
  Users,
  Target,
  Eye,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { brand } from '../brand/config';

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

interface AboutContent {
  vision?: string;
  mission?: string[];
  description?: string;
}

const features = [
  { icon: Package, title: 'Inventaris', desc: 'Kelola barang dan inventaris sekolah dengan mudah.' },
  { icon: Building2, title: 'Fasilitas', desc: 'Pemesanan dan manajemen fasilitas sekolah.' },
  { icon: ClipboardList, title: 'Peminjaman', desc: 'Ajukan peminjaman barang dengan sistem approval.' },
  { icon: CalendarDays, title: 'Agenda', desc: 'Catat kegiatan sekolah yang terjadwal.' },
  { icon: CalendarRange, title: 'Timeline', desc: 'Lihat semua kegiatan dan peminjaman dalam satu kalender.' },
  { icon: ShieldCheck, title: 'Laporan', desc: 'Laporkan kerusakan sarana dengan cepat.' },
];

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [about, setAbout] = useState<AboutContent>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [teamRes, aboutRes] = await Promise.all([
          supabase
            .from('team_members')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true }),
          supabase
            .from('about_settings')
            .select('section, content')
            .in('section', ['vision', 'mission', 'description']),
        ]);

        if (teamRes.data) {
          setTeam(teamRes.data as unknown as TeamMember[]);
        }

        const content: AboutContent = {};
        (aboutRes.data ?? []).forEach((item: any) => {
          if (item.section === 'vision') content.vision = item.content?.text ?? '';
          if (item.section === 'mission') content.mission = item.content?.items ?? [];
          if (item.section === 'description') content.description = item.content?.text ?? '';
        });
        setAbout(content);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-cyan-700 py-20">
        <AnimatedBackground />
        <div className="relative mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Tentang {brand.name}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100">
            {about.description ?? brand.description}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Fitur Utama</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Berbagai fitur untuk pengelolaan sarana dan prasarana sekolah.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40">
                <f.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-slate-100 py-16 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40">
                  <Eye className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Visi</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {about.vision ??
                  'Menjadi platform pengelolaan sarana dan prasarana sekolah yang terintegrasi, transparan, dan efisien.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/40">
                  <Target className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Misi</h3>
              </div>
              {about.mission && about.mission.length > 0 ? (
                <ul className="space-y-2">
                  {about.mission.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                      {m}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {[
                    'Memberikan kemudahan akses informasi sarana dan prasarana sekolah.',
                    'Menyediakan sistem peminjaman yang transparan dan akuntabel.',
                    'Meningkatkan efisiensi pengelolaan fasilitas sekolah.',
                    'Membangun budaya responsibility dalam penggunaan sarana.',
                  ].map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-center gap-3">
          <Users className="h-6 w-6 text-brand-600 dark:text-brand-400" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tim Kami</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : team.length === 0 ? (
          <EmptyState title="Belum ada anggota tim" description="Tim akan ditampilkan di sini." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {team.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{member.name}</h3>
                <p className="mt-1 text-sm font-medium text-brand-600 dark:text-brand-400">
                  {member.position}
                </p>
                {member.description && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{member.description}</p>
                )}
                <div className="mt-4 flex justify-center gap-3">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-brand-100 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  {member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-brand-100 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

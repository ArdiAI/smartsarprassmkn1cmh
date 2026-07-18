import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  Package,
  ClipboardList,
  CalendarDays,
  Phone,
  Target,
  Eye,
  Mail,
  Phone as PhoneIcon,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { brand } from '../brand/config';
import { showToast } from '../components/Toast';
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
  is_active: boolean;
}

interface AboutSettings {
  id: string;
  section: string;
  content: any;
  updated_at: string;
}

const features = [
  { icon: Package, title: 'Manajemen Inventaris', desc: 'Pantau ketersediaan dan kondisi barang sekolah secara real-time.' },
  { icon: Building2, title: 'Pemesanan Fasilitas', desc: 'Ajukan penggunaan fasilitas sekolah dengan mudah dan cepat.' },
  { icon: ClipboardList, title: 'Pengajuan Peminjaman', desc: 'Sistem peminjaman barang dengan alur persetujuan terstruktur.' },
  { icon: CalendarDays, title: 'Agenda Kegiatan', desc: 'Catat dan kelola agenda kegiatan sekolah dalam satu kalender.' },
  { icon: Phone, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan sarana dengan foto bukti secara online.' },
  { icon: Users, title: 'Tim Sarpras', desc: 'Tim sarpras yang siap membantu kebutuhan sarana dan prasarana.' },
];

const pexelsFallback = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/400`;

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<AboutSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [teamRes, settingsRes] = await Promise.all([
          supabase
            .from('team_members')
            .select('id, name, position, role, photo_url, description, email, phone, order, is_active')
            .eq('is_active', true)
            .order('order', { ascending: true }),
          supabase.from('about_settings').select('id, section, content, updated_at'),
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

  const visionSetting = settings.find((s) => s.section === 'vision');
  const missionSetting = settings.find((s) => s.section === 'mission');
  const visionText: string = visionSetting?.content?.text ?? 'Menjadi sistem manajemen sarana dan prasarana sekolah terdepan yang terintegrasi, transparan, dan efisien.';
  const missionText: string | string[] = missionSetting?.content?.text ?? [
    'Menyediakan platform terpadu untuk pengelolaan sarana dan prasarana sekolah.',
    'Mempermudah proses peminjaman, pemesanan, dan pelaporan secara online.',
    'Meningkatkan transparansi dan akuntabilitas pengelolaan sarpras.',
    'Mendukung kegiatan belajar mengajar dengan sarana yang memadai.',
  ];

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <AnimatedBackground />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
            Tentang {brand.name}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
            {brand.description}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="flex items-center justify-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            Fitur Utama
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Berbagai fitur untuk pengelolaan sarana dan prasarana sekolah.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card flex flex-col gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                <Eye className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Visi</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{visionText}</p>
          </div>
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Misi</h2>
            </div>
            {Array.isArray(missionText) ? (
              <ul className="space-y-2">
                {missionText.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">{missionText}</p>
            )}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="flex items-center justify-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <Users className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            Tim Sarpras
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tim yang bertanggung jawab atas sarana dan prasarana sekolah.
          </p>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="mx-auto mb-3 h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="mx-auto h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : team.length === 0 ? (
          <EmptyState
            title="Belum ada anggota tim"
            description="Tim sarpras belum memiliki anggota yang ditampilkan."
            icon={<Users className="h-8 w-8 text-slate-400" />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <div key={m.id} className="card text-center">
                <div className="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt={m.name}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = pexelsFallback(m.name); }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Users className="h-10 w-10 text-slate-400" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{m.name}</h3>
                <p className="text-sm text-brand-600 dark:text-brand-400">{m.position}</p>
                {m.role && (
                  <p className="text-xs text-slate-400">{m.role}</p>
                )}
                {m.description && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3">{m.description}</p>
                )}
                <div className="mt-3 flex justify-center gap-3">
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400" title={m.email}>
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400" title={m.phone}>
                      <PhoneIcon className="h-4 w-4" />
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

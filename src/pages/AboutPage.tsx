import { useEffect, useState } from 'react';
import {
  Info,
  Target,
  Eye,
  Users,
  Mail,
  Phone,
  Sparkles,
  ShieldCheck,
  CalendarRange,
  ClipboardList,
  Package,
  Building2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
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
  is_active: boolean;
}

interface AboutSettings {
  id: string;
  section: string;
  content: unknown;
}

const features = [
  { icon: Package, title: 'Manajemen Inventaris', desc: 'Kelola semua barang sekolah dengan pelacakan kondisi dan ketersediaan real-time.' },
  { icon: Building2, title: 'Pemesanan Fasilitas', desc: 'Pesan dan jadwalkan penggunaan fasilitas sekolah dengan mudah.' },
  { icon: ClipboardList, title: 'Pengajuan Peminjaman', desc: 'Ajukan peminjaman barang dengan alur persetujuan yang jelas.' },
  { icon: CalendarRange, title: 'Timeline Kegiatan', desc: 'Pantau seluruh kegiatan dan peminjaman dalam satu kalender terpadu.' },
  { icon: AlertCircle, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan sarana dengan upload foto sebagai bukti.' },
  { icon: ShieldCheck, title: 'Sistem Workflow', desc: 'Alur persetujuan bertingkat untuk setiap pengajuan peminjaman.' },
];

const AVATAR_FALLBACK = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400';

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [vision, setVision] = useState<string>('');
  const [mission, setMission] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: teamData, error: teamErr }, { data: settingsData, error: settingsErr }] = await Promise.all([
          supabase
            .from('team_members')
            .select('id, name, position, role, photo_url, description, email, phone, order, is_active')
            .eq('is_active', true)
            .order('order', { ascending: true }),
          supabase.from('about_settings').select('id, section, content'),
        ]);
        if (teamErr) throw teamErr;
        if (settingsErr) throw settingsErr;

        setTeam((teamData as unknown as TeamMember[]) ?? []);

        const settings = (settingsData as unknown as AboutSettings[]) ?? [];
        const visionSetting = settings.find((s) => s.section === 'vision');
        const missionSetting = settings.find((s) => s.section === 'mission');
        if (visionSetting && typeof visionSetting.content === 'object' && visionSetting.content) {
          const c = visionSetting.content as Record<string, unknown>;
          setVision((c.text as string) ?? (c.value as string) ?? '');
        }
        if (missionSetting && typeof missionSetting.content === 'object' && missionSetting.content) {
          const c = missionSetting.content as Record<string, unknown>;
          const items = c.items ?? c.list ?? c.points;
          if (Array.isArray(items)) {
            setMission(items.map((i) => String(i)));
          }
        }
      } catch {
        showToast('Gagal memuat data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <AnimatedBackground />

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
            <Sparkles className="h-4 w-4" />
            Tentang Kami
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            <span className="bg-gradient-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">
              {brand.name}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            {brand.description}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="relative mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-white">Fitur Utama</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card group transition hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
                <f.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="relative mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-900/30">
                <Eye className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Visi</h3>
            </div>
            {vision ? (
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{vision}</p>
            ) : (
              <p className="text-sm text-slate-400">Menjadi platform terdepan dalam manajemen sarana dan prasarana sekolah yang efisien, transparan, dan terpadu.</p>
            )}
          </div>
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
                <Target className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Misi</h3>
            </div>
            {mission.length > 0 ? (
              <ul className="space-y-2">
                {mission.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  Memberikan platform terpadu untuk seluruh kebutuhan sarana dan prasarana sekolah.
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  Meningkatkan efisiensi dan transparansi pengelolaan peminjaman dan pelaporan.
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  Memfasilitasi komunikasi yang baik antara warga sekolah dan pengelola sarana.
                </li>
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="relative mx-auto max-w-7xl px-4 py-8 pb-16">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-brand-600" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tim Pengembang</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : team.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8 text-slate-400" />} title="Belum ada anggota tim" description="Anggota tim akan ditampilkan di sini." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {team.map((m) => (
              <div key={m.id} className="card text-center">
                <img
                  src={m.photo_url || AVATAR_FALLBACK}
                  alt={m.name}
                  className="mx-auto mb-3 h-24 w-24 rounded-full object-cover border-2 border-brand-200 dark:border-brand-800"
                  onError={(e) => { (e.target as HTMLImageElement).src = AVATAR_FALLBACK; }}
                />
                <h3 className="font-bold text-slate-900 dark:text-white">{m.name}</h3>
                <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{m.position}</p>
                {m.role && <p className="text-xs text-slate-400">{m.role}</p>}
                {m.description && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3">{m.description}</p>
                )}
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                      {m.email}
                    </a>
                  )}
                  {m.phone && (
                    <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Phone className="h-3.5 w-3.5" />
                      {m.phone}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

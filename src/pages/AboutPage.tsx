import { useEffect, useState } from 'react';
import {
  Info,
  Target,
  Eye,
  Users,
  Mail,
  Phone,
  Loader2,
  ShieldCheck,
  Package,
  Building2,
  ClipboardList,
  CalendarRange,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { brand } from '../brand/config';
import AnimatedBackground from '../components/AnimatedBackground';
import EmptyState from '../components/EmptyState';
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
}

interface AboutSettings {
  id: string;
  section: string;
  content: { visi?: string; misi?: string[]; [key: string]: unknown } | null;
}

const features = [
  { icon: Package, title: 'Manajemen Inventaris', desc: 'Kelola semua barang sekolah dengan pelacakan stok dan kondisi real-time.' },
  { icon: Building2, title: 'Pemesanan Fasilitas', desc: 'Pesan fasilitas sekolah seperti aula, lapangan, dan ruang kelas dengan mudah.' },
  { icon: ClipboardList, title: 'Pengajuan Peminjaman', desc: 'Ajukan peminjaman barang dengan alur persetujuan yang transparan.' },
  { icon: CalendarRange, title: 'Agenda & Timeline', desc: 'Catat kegiatan sekolah dan lihat semua agenda dalam kalender interaktif.' },
  { icon: ShieldCheck, title: 'Pelaporan Kerusakan', desc: 'Laporkan kerusakan sarana dengan foto dan tingkat keparahan.' },
  { icon: Sparkles, title: 'Notifikasi Otomatis', desc: 'Pemberitahuan otomatis untuk status pengajuan dan persetujuan.' },
];

const FALLBACK_AVATAR = 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400';

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
            .select('id, name, position, role, photo_url, description, email, phone')
            .eq('is_active', true)
            .order('order', { ascending: true }),
          supabase.from('about_settings').select('id, section, content'),
        ]);
        setTeam((teamRes.data as unknown as TeamMember[]) ?? []);
        setSettings((settingsRes.data as unknown as AboutSettings[]) ?? []);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visiSetting = settings.find((s) => s.section === 'visi' || s.section === 'vision');
  const misiSetting = settings.find((s) => s.section === 'misi' || s.section === 'mission');
  const visi: string | undefined = (visiSetting?.content as { visi?: string } | null)?.visi ?? (visiSetting?.content as { vision?: string } | null)?.vision ?? undefined;
  const misi: string[] | undefined = (misiSetting?.content as { misi?: string[] } | null)?.misi ?? (misiSetting?.content as { mission?: string[] } | null)?.mission ?? undefined;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <AnimatedBackground />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            <Info className="h-4 w-4" />
            Tentang Kami
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            <span className="bg-gradient-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">
              {brand.name}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-300">
            {brand.description}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-center text-xl font-bold text-slate-900 dark:text-white">Fitur Utama</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                <Eye className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Visi</h3>
            </div>
            {loading ? (
              <div className="flex items-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            ) : visi ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">{visi}</p>
            ) : (
              <p className="text-sm text-slate-400">Menjadi platform terdepan dalam pengelolaan sarana dan prasarana sekolah yang efisien dan transparan.</p>
            )}
          </div>
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Misi</h3>
            </div>
            {loading ? (
              <div className="flex items-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            ) : misi && misi.length > 0 ? (
              <ul className="space-y-2">
                {misi.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2">
                {[
                  'Menyediakan sistem terpadu untuk pengelolaan sarana dan prasarana sekolah.',
                  'Meningkatkan efisiensi dan transparansi dalam peminjaman dan pemesanan.',
                  'Mempermudah pelaporan dan penanganan kerusakan sarana.',
                ].map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-brand-600" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tim Kami</h2>
        </div>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="mx-auto mb-3 h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="mx-auto mb-2 h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mx-auto h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : team.length === 0 ? (
          <EmptyState
            title="Belum ada anggota tim"
            description="Anggota tim akan ditampilkan di sini."
            icon={<Users className="h-8 w-8 text-slate-400" />}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <div key={m.id} className="card text-center">
                <div className="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-full border-2 border-brand-100 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <img
                    src={m.photo_url || FALLBACK_AVATAR}
                    alt={m.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR; }}
                  />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{m.name}</h3>
                {m.position && (
                  <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{m.position}</p>
                )}
                {m.role && (
                  <p className="text-xs text-slate-400">{m.role}</p>
                )}
                {m.description && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{m.description}</p>
                )}
                <div className="mt-3 flex justify-center gap-3 text-xs text-slate-400">
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="flex items-center gap-1 hover:text-brand-600">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                  )}
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="flex items-center gap-1 hover:text-brand-600">
                      <Phone className="h-3.5 w-3.5" />
                      Telepon
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

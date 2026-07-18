import { useEffect, useState } from 'react';
import {
  Info, Boxes, Building2, ClipboardList, FileText, History, ShieldCheck,
  Target, Eye, Users, Mail, Phone, Sparkles, Zap, BarChart3, Clock,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase';
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

interface AboutSettings {
  id: string;
  section: string;
  content: any;
}

const features = [
  { icon: Boxes, title: 'Manajemen Inventaris', desc: 'Pantau stok, kondisi, dan lokasi barang secara real-time dengan kategori yang terorganisir.' },
  { icon: Building2, title: 'Pemesanan Fasilitas', desc: 'Lihat dan pesan fasilitas yang tersedia dengan informasi kapasitas dan lokasi yang jelas.' },
  { icon: ClipboardList, title: 'Peminjaman Terpadu', desc: 'Ajukan peminjaman barang atau fasilitas dengan alur persetujuan multi-level dan notifikasi otomatis.' },
  { icon: FileText, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan sarana dengan tingkat keparahan dan foto, lalu pantau status perbaikan.' },
  { icon: History, title: 'Riwayat & Lacak', desc: 'Akses riwayat peminjaman lengkap dengan status, tanggal, dan detail item yang dipinjam.' },
  { icon: BarChart3, title: 'Rekap & Statistik', desc: 'Visualisasi data peminjaman, inventaris, dan fasilitas untuk pengambilan keputusan.' },
  { icon: Zap, title: 'Notifikasi Otomatis', desc: 'Email otomatis untuk pengajuan, persetujuan, dan penolakan peminjaman.' },
  { icon: ShieldCheck, title: 'Akses Aman', desc: 'Sistem peran dan izin untuk admin, penanggung jawab, dan pengguna umum.' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const avatarColors = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-blue-500',
  'from-rose-500 to-red-500',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return avatarColors[hash % avatarColors.length];
}

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<AboutSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [teamRes, settingsRes] = await Promise.all([
          supabase
            .from('team_members')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true }),
          supabase.from('about_settings').select('*'),
        ]);
        if (teamRes.error) throw teamRes.error;
        setTeam((teamRes.data as unknown as TeamMember[]) || []);
        setSettings((settingsRes.data as unknown as AboutSettings[]) || []);
      } catch (e) {
        console.error('Failed to load about data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visionSetting = settings.find((s) => s.section === 'vision');
  const missionSetting = settings.find((s) => s.section === 'mission');

  const defaultVision = 'Menjadi sistem manajemen sarana dan prasarana terdepan yang mengintegrasikan teknologi untuk menciptakan efisiensi, transparansi, dan akuntabilitas dalam pengelolaan sarpras sekolah.';
  const defaultMission = [
    'Mempermudah pengelolaan inventaris dan fasilitas sekolah secara terpusat.',
    'Menyediakan alur peminjaman yang jelas, transparan, dan dapat dilacak.',
    'Mempercepat respons terhadap laporan kerusakan sarana dan prasarana.',
    'Meningkatkan akuntabilitas melalui rekam jejak peminjaman dan laporan.',
    'Mendukung pengambilan keputusan berbasis data melalui statistik dan rekap.',
  ];

  const vision: string =
    (typeof visionSetting?.content === 'string' ? visionSetting.content : visionSetting?.content?.text) || defaultVision;
  const mission: string[] =
    (Array.isArray(missionSetting?.content) ? missionSetting.content : missionSetting?.content?.items) || defaultMission;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="flex-1">
        {/* Hero / Intro */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Tentang Kami
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              SMART SARPRAS
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Sistem Manajemen Sarana dan Prasarana Terpadu — platform digital untuk mengelola
              inventaris, fasilitas, peminjaman, dan pelaporan kerusakan dalam satu sistem terpadu.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Fitur Utama</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">Semua yang Anda butuhkan untuk mengelola sarana dan prasarana</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Vision / Mission */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vision */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Eye className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold">Visi</h2>
              </div>
              <p className="text-blue-50 leading-relaxed">{vision}</p>
            </div>

            {/* Mission */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Misi</h2>
              </div>
              <ul className="space-y-3">
                {Array.isArray(mission) ? (
                  mission.map((m, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{m}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-700 dark:text-slate-300">{String(mission)}</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Tim</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400">Orang-orang di balik SMART SARPRAS</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 text-center">
                  <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse mx-auto mb-4" />
                  <div className="h-5 w-2/3 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse mx-auto mb-2" />
                  <div className="h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <EmptyState icon={Users} title="Belum ada anggota tim" description="Anggota tim akan muncul di sini ketika tersedia." />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {team.map((m) => {
                const color = getAvatarColor(m.id);
                return (
                  <div
                    key={m.id}
                    className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 text-center hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                  >
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      {m.photo_url ? (
                        <img
                          src={m.photo_url}
                          alt={m.name}
                          className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 dark:border-slate-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={cn('w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xl font-bold', color)}>
                          {getInitials(m.name)}
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{m.name}</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{m.position}</p>
                    {m.role && (
                      <p className="text-xs text-slate-400 mt-0.5">{m.role}</p>
                    )}
                    {m.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 line-clamp-3">{m.description}</p>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-sm">
                      {m.email && (
                        <a href={`mailto:${m.email}`} className="flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate">{m.email}</span>
                        </a>
                      )}
                      {m.phone && (
                        <a href={`tel:${m.phone}`} className="flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{m.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Info banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Info className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-white">Butuh Bantuan?</h3>
              <p className="text-slate-400 mt-1">
                Hubungi tim SMART SARPRAS untuk pertanyaan, bantuan teknis, atau saran pengembangan sistem.
              </p>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-5 h-5" />
              <span className="text-sm">Senin - Jumat, 08.00 - 16.00</span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Info, Target, Eye, Users, Mail, Phone, Sparkles, ShieldCheck,
  Zap, BarChart3, Layers, Calendar, Building2,
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
  role: string | null;
  photo_url: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  order: number;
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
  { icon: Layers, title: 'Manajemen Inventaris', desc: 'Kelola seluruh inventaris barang dengan kategori, kondisi, dan lokasi yang terstruktur.' },
  { icon: Building2, title: 'Peminjaman Fasilitas', desc: 'Sistem peminjaman fasilitas dengan alur persetujuan yang transparan.' },
  { icon: ShieldCheck, title: 'Laporan Kerusakan', desc: 'Laporkan kerusakan sarana prasarana dengan mudah dan lacak status perbaikan.' },
  { icon: Zap, title: 'Notifikasi Otomatis', desc: 'Notifikasi otomatis via email untuk setiap tahap peminjaman dan laporan.' },
  { icon: BarChart3, title: 'Rekap & Statistik', desc: 'Pantau statistik peminjaman dan laporan secara real-time.' },
  { icon: Calendar, title: 'Riwayat Terlacak', desc: 'Semua aktivitas peminjaman tercatat dan dapat ditelusuri kapan saja.' },
];

const orgTypeColors: Record<string, string> = {
  ekstrakurikuler: 'from-blue-500 to-cyan-500',
  osis: 'from-amber-500 to-orange-500',
  klub: 'from-emerald-500 to-green-500',
  default: 'from-slate-500 to-slate-600',
};

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [settings, setSettings] = useState<AboutSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [teamRes, orgRes, setRes] = await Promise.all([
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
        setTeam((teamRes.data as unknown as TeamMember[]) || []);
        setOrgs((orgRes.data as unknown as Organization[]) || []);
        setSettings((setRes.data as unknown as AboutSettings[]) || []);
      } catch (err) {
        console.error('Failed to fetch about data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const getSetting = (section: string) => settings.find((s) => s.section === section)?.content;
  const visionContent = getSetting('vision');
  const missionContent = getSetting('mission');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            Tentang <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{brandConfig.system.name}</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {brandConfig.system.fullName} — platform terpadu untuk pengelolaan sarana dan prasarana yang efisien, transparan, dan akuntabel.
          </p>
        </div>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" /> Fitur Utama
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="card p-5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">Visi</h3>
              </div>
              {visionContent ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {typeof visionContent === 'string' ? visionContent : visionContent?.text || JSON.stringify(visionContent)}
                </p>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Menjadi sistem manajemen sarana prasarana yang terdepan dan terpercaya untuk menciptakan lingkungan yang nyaman, aman, dan kondusif.
                </p>
              )}
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-500" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">Misi</h3>
              </div>
              {missionContent ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {typeof missionContent === 'string' ? missionContent : missionContent?.text || JSON.stringify(missionContent)}
                </p>
              ) : (
                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Menyediakan sistem pengelolaan sarana prasarana yang transparan.</li>
                  <li>Mempermudah proses peminjaman dan pelaporan kerusakan.</li>
                  <li>Meningkatkan akuntabilitas pengelolaan inventaris.</li>
                  <li>Mendorong partisipasi aktif seluruh warga sekolah.</li>
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> Tim Pengembang
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-3" />
                  <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-2" />
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                </div>
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="card p-8">
              <EmptyState icon={Users} title="Belum ada anggota tim" description="Data tim akan muncul di sani setelah ditambahkan oleh admin." />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.map((m) => {
                const initials = m.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <div key={m.id} className="card p-5 text-center hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      {m.photo_url ? (
                        <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <span className="text-2xl font-bold text-white">{initials}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{m.name}</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{m.position}</p>
                    {m.role && <p className="text-xs text-slate-400 mt-0.5">{m.role}</p>}
                    {m.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{m.description}</p>}
                    <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      {m.email && (
                        <a href={`mailto:${m.email}`} className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500 inline-flex items-center justify-center gap-1">
                          <Mail className="w-3 h-3" /> {m.email}
                        </a>
                      )}
                      {m.phone && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center justify-center gap-1">
                          <Phone className="w-3 h-3" /> {m.phone}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Organizations */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" /> Organisasi
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-5 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : orgs.length === 0 ? (
            <div className="card p-8">
              <EmptyState icon={Building2} title="Belum ada organisasi" description="Data organisasi akan muncul di sini setelah ditambahkan." />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {orgs.map((o) => {
                const colorClass = o.type ? (orgTypeColors[o.type.toLowerCase()] ?? orgTypeColors.default) : orgTypeColors.default;
                return (
                  <div key={o.id} className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold flex-shrink-0', colorClass)}>
                        {o.logo_url ? (
                          <img src={o.logo_url} alt={o.name} className="w-full h-full object-cover rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          o.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{o.name}</h3>
                        {o.type && <span className="text-xs text-slate-400 capitalize">{o.type}</span>}
                      </div>
                    </div>
                    {o.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{o.description}</p>}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {o.leader && <p className="text-slate-500 dark:text-slate-400"><span className="font-medium text-slate-600 dark:text-slate-300">Ketua:</span> {o.leader}</p>}
                      {o.advisor && <p className="text-slate-500 dark:text-slate-400"><span className="font-medium text-slate-600 dark:text-slate-300">Pembina:</span> {o.advisor}</p>}
                      {o.schedule && <p className="text-slate-500 dark:text-slate-400"><span className="font-medium text-slate-600 dark:text-slate-300">Jadwal:</span> {o.schedule}</p>}
                      {o.contact && <p className="text-slate-500 dark:text-slate-400"><span className="font-medium text-slate-600 dark:text-slate-300">Kontak:</span> {o.contact}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="flex-1" />
      <Footer />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Megaphone, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
export default function AnnouncementFeed() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.from('announcements').select('id, title, content, created_at').order('created_at', { ascending: false }).limit(5).then(({ data }) => { setAnnouncements(data || []); setLoading(false); }); }, []);
  return (
    <div className="bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
      <div className="flex items-center gap-2 mb-4"><Megaphone className="w-5 h-5 text-blue-500" /><h2 className="text-lg font-bold text-slate-900 dark:text-white">Pengumuman</h2></div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div> :
       announcements.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">Belum ada pengumuman</p> :
       <div className="space-y-3">{announcements.map(a => <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"><ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" /><div className="min-w-0"><p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.title}</p><p className="text-xs text-slate-500 line-clamp-2">{a.content}</p><p className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div></div>)}</div>}
    </div>
  );
}

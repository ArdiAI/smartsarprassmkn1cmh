import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Calendar, AlertCircle, AlertTriangle, Info, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';
import type { Announcement } from '../types';
import { ANNOUNCEMENT_PRIORITY_LABELS, ANNOUNCEMENT_PRIORITY_COLORS } from '../types';

interface AnnouncementFeedProps {
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export default function AnnouncementFeed({ maxItems = 10, showHeader = true, compact = false }: AnnouncementFeedProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('status', 'aktif')
          .order('published_at', { ascending: false })
          .limit(maxItems);

        if (error) throw error;
        setAnnouncements(data || []);
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('announcements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [maxItems]);

  const getPriorityIcon = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'tinggi': return AlertTriangle;
      case 'sedang': return AlertCircle;
      case 'rendah': return Info;
      default: return Megaphone;
    }
  };

  const getPriorityBg = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'tinggi': return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'sedang': return 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
      case 'rendah': return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      default: return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    }
  };

  const getPriorityIconColor = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'tinggi': return 'text-red-600 dark:text-red-400';
      case 'sedang': return 'text-amber-600 dark:text-amber-400';
      case 'rendah': return 'text-green-600 dark:text-green-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Hari ini';
    } else if (days === 1) {
      return 'Kemarin';
    } else if (days < 7) {
      return `${days} hari lalu`;
    } else {
      return format(date, 'dd MMMM yyyy', { locale: id });
    }
  };

  if (loading) {
    return (
      <div className={cn(
        "bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden",
        compact && "rounded-xl"
      )}>
        {showHeader && (
          <div className="px-5 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center animate-pulse" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        )}
        <div className="p-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden",
      compact && "rounded-xl"
    )}>
      {showHeader && (
        <div className="px-5 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Pengumuman</h3>
            {announcements.length > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
                {announcements.length} aktif
              </span>
            )}
          </div>
        </div>
      )}

      <div className={cn("divide-y divide-slate-200/50 dark:divide-slate-700/50", compact ? "max-h-[300px]" : "max-h-[400px]", "overflow-y-auto")}>
        <AnimatePresence initial={false}>
          {announcements.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 px-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-4">
                <BellOff className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Belum ada pengumuman</p>
              <p className="text-xs text-slate-500 dark:text-slate-500">Pengumuman baru akan muncul di sini</p>
            </motion.div>
          ) : (
            announcements.map((announcement, index) => {
              const PriorityIcon = getPriorityIcon(announcement.priority);
              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    "px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors",
                    compact && "px-4 py-3"
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                      getPriorityBg(announcement.priority)
                    )}>
                      <PriorityIcon className={cn("w-5 h-5", getPriorityIconColor(announcement.priority))} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={cn(
                          "font-semibold text-slate-900 dark:text-white",
                          compact ? "text-sm" : "text-base"
                        )}>
                          {announcement.title}
                        </h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
                          ANNOUNCEMENT_PRIORITY_COLORS[announcement.priority]
                        )}>
                          {ANNOUNCEMENT_PRIORITY_LABELS[announcement.priority]}
                        </span>
                      </div>
                      <p className={cn(
                        "text-slate-600 dark:text-slate-400 mb-2 line-clamp-2",
                        compact ? "text-xs" : "text-sm"
                      )}>
                        {announcement.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(announcement.published_at)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

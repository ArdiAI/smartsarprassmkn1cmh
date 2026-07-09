import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, AlertTriangle, CheckCircle, Clock, User, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../utils/cn';

interface Activity {
  id: string;
  type: 'borrowing' | 'report' | 'inventory' | 'admin';
  action: string;
  item: string;
  user: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'warning' | 'info';
}

const mockActivities: Omit<Activity, 'id' | 'timestamp'>[] = [
  { type: 'borrowing', action: 'Peminjaman baru', item: 'Proyektor Epson EB-X51', user: 'Guru TKJ', status: 'pending' },
  { type: 'inventory', action: 'Inventaris diperbarui', item: 'Laptop Asus ROG (5 unit)', user: 'Admin', status: 'success' },
  { type: 'report', action: 'Laporan kerusakan', item: 'AC Ruang Lab Komputer', user: 'Teknisi', status: 'warning' },
  { type: 'borrowing', action: 'Pengembalian', item: 'Sound System Portable', user: 'Guru BK', status: 'success' },
  { type: 'admin', action: 'Approval peminjaman', item: 'Ruang Aula Lt.2', user: 'Kepala Sekolah', status: 'info' },
  { type: 'inventory', action: 'QR Code digenerate', item: 'Meja Lab (25 unit)', user: 'Admin', status: 'success' },
  { type: 'report', action: 'Perbaikan selesai', item: 'Printer Epson L3150', user: 'Teknisi', status: 'success' },
  { type: 'borrowing', action: 'Peminjaman disetujui', item: 'Kamera Sony A6400', user: 'Guru Multimedia', status: 'success' },
];

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Initial load
    const initial: Activity[] = mockActivities.slice(0, 5).map((a, i) => ({
      ...a,
      id: `initial-${i}`,
      timestamp: new Date(Date.now() - i * 60000 * Math.random() * 10),
    }));
    setActivities(initial);

    if (!isLive) return;

    // Simulate live updates
    const interval = setInterval(() => {
      const randomActivity = mockActivities[Math.floor(Math.random() * mockActivities.length)];
      const newActivity: Activity = {
        ...randomActivity,
        id: `live-${Date.now()}`,
        timestamp: new Date(),
      };

      setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
    }, 8000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'borrowing': return Package;
      case 'report': return AlertTriangle;
      case 'inventory': return RefreshCw;
      case 'admin': return User;
      default: return CheckCircle;
    }
  };

  const getStatusColor = (status: Activity['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'warning': return 'bg-orange-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={cn('w-2 h-2 rounded-full', isLive ? 'bg-green-500' : 'bg-slate-400')}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isLive ? 'Live Activity' : 'Paused'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsLive(!isLive)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            isLive
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          )}
        >
          {isLive ? 'Live' : 'Paused'}
        </button>
      </div>

      {/* Activities */}
      <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50 max-h-[400px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {activities.map((activity, index) => {
            const Icon = getIcon(activity.type);
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    activity.type === 'borrowing' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    activity.type === 'report' ? 'bg-orange-100 dark:bg-orange-900/30' :
                    activity.type === 'inventory' ? 'bg-cyan-100 dark:bg-cyan-900/30' :
                    'bg-purple-100 dark:bg-purple-900/30'
                  )}>
                    <Icon className={cn(
                      'w-5 h-5',
                      activity.type === 'borrowing' ? 'text-blue-600 dark:text-blue-400' :
                      activity.type === 'report' ? 'text-orange-600 dark:text-orange-400' :
                      activity.type === 'inventory' ? 'text-cyan-600 dark:text-cyan-400' :
                      'text-purple-600 dark:text-purple-400'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {activity.action}
                      </span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs',
                        activity.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        activity.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        activity.status === 'warning' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      )}>
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {activity.item}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {activity.user}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Helper function
function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  return format(date, 'dd MMM', { locale: id });
}

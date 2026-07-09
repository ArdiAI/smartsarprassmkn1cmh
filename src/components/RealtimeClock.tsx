import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function RealtimeClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-xl px-4 py-3 border border-slate-200/50 dark:border-slate-700/50"
    >
      <div className="flex items-center gap-4">
        {/* Live Indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"
          />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Live
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-300 dark:bg-slate-600" />

        {/* Time */}
        <div className="flex flex-col">
          <motion.span
            key={time.getSeconds()}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-lg font-mono font-bold text-slate-900 dark:text-white tabular-nums"
          >
            {formatTime(time)}
          </motion.span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(time)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Lightweight static clock — updates once per second, no framer-motion.
import { useEffect, useState } from 'react';

export default function RealtimeClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Live</span>
        </div>
        <div className="w-px h-8 bg-slate-300 dark:bg-slate-600" />
        <div className="flex flex-col">
          <span className="text-lg font-mono font-bold text-slate-900 dark:text-white tabular-nums">
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {time.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}

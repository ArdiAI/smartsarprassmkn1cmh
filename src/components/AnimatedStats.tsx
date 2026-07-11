// Lightweight static stats card — no framer-motion counter animation.
// Displays the value directly with a simple CSS fade-in on mount.

import { useEffect, useState } from 'react';
import { cn } from '../utils/cn';

interface AnimatedStatsProps {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  icon?: React.ElementType;
  color?: 'blue' | 'cyan' | 'green' | 'orange' | 'purple';
  delay?: number;
}

const colorClasses = {
  blue: { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  cyan: { gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400' },
  green: { gradient: 'from-green-500 to-green-600', bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  orange: { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  purple: { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
};

export default function AnimatedStats({ value, label, suffix = '', prefix = '', icon: Icon, color = 'blue' }: AnimatedStatsProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  const c = colorClasses[color];
  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')}>
      {Icon && (
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br', c.gradient)}>
          {Icon && <Icon className="w-6 h-6 text-white" />}
        </div>
      )}
      <div className="mb-2">
        <span className="text-sm text-slate-500">{prefix}</span>
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{value}</span>
        <span className="text-sm text-slate-500 ml-1">{suffix}</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{label}</p>
    </div>
  );
}

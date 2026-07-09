import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils/cn';

interface AnimatedStatsProps {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  icon?: React.ElementType;
  trend?: { value: number; isUp: boolean };
  color?: 'blue' | 'cyan' | 'green' | 'orange' | 'purple';
  delay?: number;
}

export default function AnimatedStats({
  value,
  label,
  suffix = '',
  prefix = '',
  icon: Icon,
  trend,
  color = 'blue',
  delay = 0,
}: AnimatedStatsProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return () => unsubscribe();
  }, [rounded]);

  useEffect(() => {
    const animation = animate(count, value, {
      duration: 2,
      delay,
      ease: 'easeOut',
    });

    return () => animation.stop();
  }, [value, count, delay]);

  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      glow: 'shadow-blue-500/20',
    },
    cyan: {
      gradient: 'from-cyan-500 to-cyan-600',
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      text: 'text-cyan-600 dark:text-cyan-400',
      glow: 'shadow-cyan-500/20',
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      glow: 'shadow-green-500/20',
    },
    orange: {
      gradient: 'from-orange-500 to-orange-600',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      glow: 'shadow-orange-500/20',
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      glow: 'shadow-purple-500/20',
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        'group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden transition-all hover:shadow-2xl',
        colors.glow
      )}
    >
      {/* Glow Effect */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10',
          colors.bg
        )}
        style={{ transform: 'scale(1.5)' }}
      />

      {/* Icon */}
      {Icon && (
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br', colors.gradient)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      )}

      {/* Value */}
      <div className="mb-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">{prefix}</span>
        <motion.span className="text-3xl font-bold text-slate-900 dark:text-white">
          {displayValue}
        </motion.span>
        <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{suffix}</span>
      </div>

      {/* Label */}
      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{label}</p>

      {/* Trend */}
      {trend && (
        <div className="flex items-center gap-1 mt-3">
          {trend.isUp ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={cn('text-xs font-medium', trend.isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {trend.value}%
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">vs bulan lalu</span>
        </div>
      )}
    </motion.div>
  );
}

import { useEffect, useState } from 'react';
import { cn } from '../utils/cn';

interface Props { value: number; label: string; suffix?: string; icon?: React.ElementType; color?: 'blue' | 'cyan' | 'green' | 'orange'; }
const colors = { blue: 'from-blue-500 to-blue-600', cyan: 'from-cyan-500 to-cyan-600', green: 'from-green-500 to-green-600', orange: 'from-orange-500 to-orange-600' };

export default function AnimatedStats({ value, label, suffix = '', icon: Icon, color = 'blue' }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);
  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')}>
      {Icon && <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br', colors[color])}><Icon className="w-6 h-6 text-white" /></div>}
      <div className="mb-2"><span className="text-3xl font-bold text-slate-900 dark:text-white">{value}</span><span className="text-sm text-slate-500 ml-1">{suffix}</span></div>
      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{label}</p>
    </div>
  );
}

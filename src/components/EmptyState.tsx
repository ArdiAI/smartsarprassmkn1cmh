import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title = 'Tidak ada data',
  description = 'Belum ada data untuk ditampilkan.',
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-3 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
        {icon ?? <Inbox className="h-8 w-8 text-slate-400" />}
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

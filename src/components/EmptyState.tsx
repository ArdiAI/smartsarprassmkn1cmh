import { Package } from 'lucide-react';

interface Props { title?: string; message?: string; }

export default function EmptyState({ title = 'Tidak ada data', message = 'Data belum tersedia' }: Props) {
  return (
    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
      <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
      <p className="text-slate-600 dark:text-slate-400 font-medium">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{message}</p>
    </div>
  );
}

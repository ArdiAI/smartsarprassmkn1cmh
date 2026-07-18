import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { brand } from '../brand/config';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{brand.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{brand.tagline}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
            <Link to="/fasilitas" className="hover:text-brand-600">Fasilitas</Link>
            <Link to="/inventaris" className="hover:text-brand-600">Inventaris</Link>
            <Link to="/agenda" className="hover:text-brand-600">Agenda</Link>
            <Link to="/timeline" className="hover:text-brand-600">Timeline</Link>
            <Link to="/tentang" className="hover:text-brand-600">Tentang</Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {brand.name}. {brand.school}
        </p>
      </div>
    </footer>
  );
}

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Home,
  Package,
  Building2,
  ClipboardList,
  CalendarDays,
  History,
  Phone,
  Info,
  LogIn,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { brand } from '../brand/config';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

const navItems = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/fasilitas', label: 'Fasilitas', icon: Building2 },
  { to: '/inventaris', label: 'Inventaris', icon: Package },
  { to: '/pinjam', label: 'Pengajuan', icon: ClipboardList },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/timeline', label: 'Timeline', icon: CalendarDays },
  { to: '/history', label: 'Riwayat', icon: History },
  { to: '/laporan', label: 'Laporan', icon: Phone },
  { to: '/tentang', label: 'Tentang', icon: Info },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">{brand.name}</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:flex"
          >
            <LogIn className="h-4 w-4" />
            Masuk
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
                    active
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                setOpen(false);
                navigate('/auth');
              }}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white"
            >
              <LogIn className="h-4 w-4" />
              Masuk
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

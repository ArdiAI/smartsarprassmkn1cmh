import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Building2, Menu, X, Moon, Sun, LayoutDashboard, ClipboardList, Package, Building, FileText, BarChart3, LogOut, Home, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/', label: 'Beranda', icon: Home },
    { to: '/facilities', label: 'Fasilitas', icon: Building },
    { to: '/inventory', label: 'Inventaris', icon: Package },
    { to: '/borrow', label: 'Peminjaman', icon: ClipboardList },
    { to: '/report', label: 'Laporan', icon: FileText },
    { to: '/about', label: 'Tentang', icon: Building2 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white hidden sm:block">SISARPRAS</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(link.to) ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                )}>
                <link.icon className="w-4 h-4" />{link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            {user && (
              <Link to="/admin" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                <LayoutDashboard className="w-4 h-4" />Dashboard
              </Link>
            )}
            {user ? (
              <button onClick={async () => { await signOut(); navigate('/'); }} className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <Link to="/auth" className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Login</Link>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 dark:border-slate-800">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium',
                  isActive(link.to) ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                )}>
                <link.icon className="w-4 h-4" />{link.label}
              </Link>
            ))}
            {user && (
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-600">
                <LayoutDashboard className="w-4 h-4" />Dashboard
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Building2, Sun, Moon, Users, Trophy, LogOut, FileBox, List, FilePlus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brandConfig } from '../brand/config';
import { cn } from '../utils/cn';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [kavlingMenuOpen, setKavlingMenuOpen] = useState(false);
  const { isDark, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    navigate('/auth');
  };

  const navLinks = [
    { label: 'Fasilitas', path: '/facilities' },
    { label: 'Inventaris', path: '/inventory' },
    { label: 'Peminjaman', path: '/borrow' },
    { label: 'Rekap', path: '/rekap' },
    { label: 'Riwayat', path: '/history' },
    { label: 'Laporan', path: '/report' },
  ];

  const moreLinks = [
    { label: 'Prestasi', path: '/achievements', icon: Trophy },
    { label: 'Tim', path: '/team', icon: Users },
  ];

  const kavlingLinks = [
    { label: 'Daftar Data Kavling', path: '/kavling', icon: List },
    { label: 'Input Data Kavling', path: '/kavling/input', icon: FilePlus },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isKavlingActive = () => location.pathname.startsWith('/kavling');

  const userInitial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pengguna';

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-sm border-b border-slate-200 dark:border-slate-800'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-slate-900 dark:text-white">{brandConfig.system.name}</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}
                className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive(link.path)
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                )}>{link.label}</Link>
            ))}

            {/* Kavling Dropdown */}
            <div className="relative group">
              <button className={cn('px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-all',
                isKavlingActive()
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              )}>
                <FileBox className="w-4 h-4" />
                Kavling
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {kavlingLinks.map((link) => (
                  <Link key={link.path} to={link.path}
                    className={cn('flex items-center gap-2 px-4 py-2.5 text-sm first:rounded-t-xl last:rounded-b-xl transition-colors',
                      isActive(link.path)
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    )}>
                    <link.icon className="w-4 h-4" />{link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* More Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">
                Lainnya
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {moreLinks.map((link) => (
                  <Link key={link.path} to={link.path}
                    className={cn('flex items-center gap-2 px-4 py-2.5 text-sm first:rounded-t-xl last:rounded-b-xl transition-colors',
                      isActive(link.path)
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    )}>
                    <link.icon className="w-4 h-4" />{link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Toggle theme">
              {isDark ? <Sun className="w-5 h-5 text-slate-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                    {userInitial}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">{displayName}</span>
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{user.user_metadata?.full_name || 'Pengguna'}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <button onClick={handleSignOut}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg w-full text-left">
                          <LogOut className="w-4 h-4" /> Keluar
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-slate-200 dark:border-slate-800">
              <div className="py-4 space-y-2 max-h-[70vh] overflow-y-auto">
                {navLinks.map((link) => (
                  <Link key={link.path} to={link.path} onClick={() => setIsMenuOpen(false)}
                    className={cn('block px-4 py-3 rounded-lg text-sm font-medium transition-all',
                      isActive(link.path) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                    )}>{link.label}</Link>
                ))}

                {/* Mobile Kavling Menu */}
                <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                <button
                  onClick={() => setKavlingMenuOpen(!kavlingMenuOpen)}
                  className={cn('flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium transition-all',
                    isKavlingActive() ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <FileBox className="w-4 h-4" /> Kavling
                  </span>
                  <svg className={cn("w-4 h-4 transition-transform", kavlingMenuOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {kavlingMenuOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pl-4 overflow-hidden"
                    >
                      {kavlingLinks.map((link) => (
                        <Link key={link.path} to={link.path} onClick={() => { setIsMenuOpen(false); setKavlingMenuOpen(false); }}
                          className={cn('flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                            isActive(link.path) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                          )}>
                          <link.icon className="w-4 h-4" />{link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                {moreLinks.map((link) => (
                  <Link key={link.path} to={link.path} onClick={() => setIsMenuOpen(false)}
                    className={cn('flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                      isActive(link.path) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                    )}>
                    <link.icon className="w-4 h-4" />{link.label}
                  </Link>
                ))}

                {user && (
                  <>
                    <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                    <button onClick={handleSignOut}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 w-full text-left">
                      <LogOut className="w-4 h-4" />Keluar
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

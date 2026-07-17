import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Package, Building2, FileText,
  BarChart3, Users, Megaphone, MessageSquare, UserCog, Shield,
  UserCheck, GitBranch, Mail, Settings, LogOut, Menu, X,
  Moon, Sun, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { brandConfig } from '../brand/config';
import { showToast } from '../components/Toast';
import { cn } from '../utils/cn';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/borrowings', label: 'Peminjaman', icon: ClipboardList },
  { to: '/admin/inventory', label: 'Inventaris', icon: Package },
  { to: '/admin/facilities', label: 'Fasilitas', icon: Building2 },
  { to: '/admin/reports', label: 'Laporan', icon: FileText },
  { to: '/admin/statistics', label: 'Statistik', icon: BarChart3 },
  { to: '/admin/team', label: 'Tim', icon: Users },
  { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone },
  { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare },
];

const superAdminItems = [
  { to: '/admin/super/users', label: 'Manajemen User', icon: UserCog },
  { to: '/admin/super/roles', label: 'Roles & Permissions', icon: Shield },
  { to: '/admin/super/facility-managers', label: 'PJ Fasilitas', icon: UserCheck },
  { to: '/admin/super/workflows', label: 'Approval Workflow', icon: GitBranch },
  { to: '/admin/super/approver-emails', label: 'Email Approver', icon: Mail },
  { to: '/admin/super/config', label: 'Konfigurasi', icon: Settings },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [loadingRole, setLoadingRole] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchAdmin() {
      if (!user) {
        setLoadingRole(false);
        return;
      }
      const { data, error } = await supabase
        .from('admin_users')
        .select('role, name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin role:', error);
        setLoadingRole(false);
        return;
      }
      if (data) {
        const a = data as unknown as { role: string; name: string; email: string };
        setAdminRole(a.role ?? '');
        setAdminName(a.name ?? '');
        setAdminEmail(a.email ?? user.email ?? '');
      } else {
        setAdminRole('');
        setAdminName(user.email ?? '');
        setAdminEmail(user.email ?? '');
      }
      setLoadingRole(false);
    }
    fetchAdmin();
  }, [user]);

  const isSuperAdmin = adminRole === 'superadmin';

  const handleLogout = async () => {
    await signOut();
    showToast('Anda telah keluar dari sistem', 'info');
    navigate('/auth');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transform transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">SS</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {brandConfig.system.shortName}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Admin Panel</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 h-[calc(100vh-4rem-5rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={linkClass}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Super Admin
                </p>
              </div>
              {superAdminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={linkClass}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {(adminName || adminEmail || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {adminName || adminEmail || 'Admin'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {adminRole ? adminRole : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-600 dark:text-slate-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                {brandConfig.system.fullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {(adminName || adminEmail || 'A').charAt(0).toUpperCase()}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 hidden sm:block" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 z-40 overflow-hidden">
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {adminName || 'Admin'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {adminEmail}
                      </p>
                      {adminRole && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-semibold uppercase">
                          {adminRole}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

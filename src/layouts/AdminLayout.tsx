import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PackageOpen,
  Boxes,
  Building2,
  FileWarning,
  BarChart3,
  Users,
  Megaphone,
  MessageSquare,
  UserCog,
  ShieldCheck,
  UserCheck,
  GitBranch,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import { cn } from '../utils/cn';
import { showToast } from '../components/Toast';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const mainNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/borrowings', label: 'Peminjaman', icon: PackageOpen },
  { to: '/admin/inventory', label: 'Inventaris', icon: Boxes },
  { to: '/admin/facilities', label: 'Fasilitas', icon: Building2 },
  { to: '/admin/reports', label: 'Laporan', icon: FileWarning },
  { to: '/admin/statistics', label: 'Statistik', icon: BarChart3 },
  { to: '/admin/team', label: 'Tim', icon: Users },
  { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone },
  { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare },
];

const superNav: NavItem[] = [
  { to: '/admin/super/users', label: 'Manajemen User', icon: UserCog },
  { to: '/admin/super/roles', label: 'Roles & Permissions', icon: ShieldCheck },
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

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('admin_users')
        .select('role, name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (data) {
        setAdminRole((data as { role?: string }).role ?? null);
        setAdminName((data as { name?: string }).name ?? '');
      }
    };
    fetchAdmin();
  }, [user]);

  const isSuperAdmin = adminRole === 'superadmin';

  const handleSignOut = async () => {
    await signOut();
    showToast('Anda telah keluar dari panel admin', 'info');
    navigate('/auth');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    );

  const displayName = adminName || user?.email || 'Admin';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{brandConfig.system.shortName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin Panel</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-500 dark:text-slate-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={linkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Super Admin
                </p>
              </div>
              {superNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-5 py-4">
            <button
              className="lg:hidden text-slate-600 dark:text-slate-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 lg:flex hidden">
              <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
                Selamat datang, {displayName.split(' ')[0]}
              </h1>
            </div>
            <button
              onClick={toggle}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

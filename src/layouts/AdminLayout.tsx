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
  ShieldCheck,
  UserCog,
  KeyRound,
  UserCheck,
  Workflow,
  MailCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import { cn } from '../utils/cn';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

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
  { to: '/admin/super/roles', label: 'Roles & Permissions', icon: KeyRound },
  { to: '/admin/super/facility-managers', label: 'PJ Fasilitas', icon: UserCheck },
  { to: '/admin/super/workflows', label: 'Approval Workflow', icon: Workflow },
  { to: '/admin/super/approver-emails', label: 'Email Approver', icon: MailCheck },
  { to: '/admin/super/config', label: 'Konfigurasi', icon: Settings },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('admin_users')
        .select('id, user_id, email, name, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (data) setAdminUser(data as unknown as AdminUser);
    };
    fetchAdmin();
  }, [user]);

  const isSuperAdmin = adminUser?.role === 'superadmin';

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
      isActive
        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
    );

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
              {brandConfig.system.shortName}
            </p>
            <p className="text-xs text-slate-400 truncate">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {mainNav.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={linkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}

        {isSuperAdmin && (
          <>
            <div className="pt-5 pb-2 px-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Super Admin
              </div>
            </div>
            {superNav.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {(adminUser?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {adminUser?.name ?? 'Admin'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {adminUser?.email ?? user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/50 flex-col z-30">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/50 flex flex-col z-50 lg:hidden animate-slide-in">
            {SidebarContent}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="hidden sm:inline">Admin</span>
                <ChevronRight className="w-4 h-4 hidden sm:inline" />
                <span className="text-slate-900 dark:text-white font-medium">
                  {brandConfig.system.shortName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                title="Ganti tema"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">
                    {(adminUser?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {adminUser?.name ?? 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

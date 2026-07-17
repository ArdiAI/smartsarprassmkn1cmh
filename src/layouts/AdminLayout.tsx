import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Building2,
  FileWarning,
  BarChart3,
  Users,
  Megaphone,
  MessageSquare,
  UserCog,
  ShieldCheck,
  UserCheck,
  Workflow,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import { cn } from '../utils/cn';

interface AdminUserRow {
  role: string;
}

const mainNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/borrowings', label: 'Peminjaman', icon: ClipboardList },
  { to: '/admin/inventory', label: 'Inventaris', icon: Package },
  { to: '/admin/facilities', label: 'Fasilitas', icon: Building2 },
  { to: '/admin/reports', label: 'Laporan', icon: FileWarning },
  { to: '/admin/statistics', label: 'Statistik', icon: BarChart3 },
  { to: '/admin/team', label: 'Tim', icon: Users },
  { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone },
  { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare },
];

const superNav = [
  { to: '/admin/super/users', label: 'Manajemen User', icon: UserCog },
  { to: '/admin/super/roles', label: 'Roles & Permissions', icon: ShieldCheck },
  { to: '/admin/super/facility-managers', label: 'PJ Fasilitas', icon: UserCheck },
  { to: '/admin/super/workflows', label: 'Approval Workflow', icon: Workflow },
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
        .select('role, name, email')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (data) {
        const row = data as unknown as { role: string; name: string; email: string };
        setAdminRole(row.role ?? '');
        setAdminName(row.name ?? row.email ?? '');
      }
    };
    fetchAdmin();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const isSuperAdmin = adminRole === 'superadmin';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
              SS
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                {brandConfig.system.shortName}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                Admin Panel
              </p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-500 dark:text-slate-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {mainNav.map(item => {
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
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Super Admin
                </p>
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
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* User info */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
              {(adminName || user?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                {adminName || user?.email}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {adminRole || 'admin'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6">
          <button
            className="lg:hidden text-slate-600 dark:text-slate-300"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {brandConfig.system.fullName}
            </p>
          </div>
          <button
            onClick={toggle}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

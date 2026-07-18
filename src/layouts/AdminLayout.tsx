import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Building2, ClipboardList, BarChart3,
  Users, Megaphone, MessageSquare, Settings, Shield, UserCog,
  Workflow, Mail, Cog, LogOut, Menu, X, Sun, Moon, Boxes,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import { cn } from '../utils/cn';
import { showToast } from '../components/Toast';

interface AdminUserRecord {
  role: string;
  name: string;
  email: string;
}

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/borrowings', label: 'Peminjaman', icon: ClipboardList },
  { to: '/admin/inventory', label: 'Inventaris', icon: Package },
  { to: '/admin/facilities', label: 'Fasilitas', icon: Building2 },
  { to: '/admin/reports', label: 'Laporan', icon: BarChart3 },
  { to: '/admin/statistics', label: 'Statistik', icon: BarChart3 },
  { to: '/admin/team', label: 'Tim', icon: Users },
  { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone },
  { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare },
];

const superNavItems = [
  { to: '/admin/super/users', label: 'Manajemen User', icon: UserCog },
  { to: '/admin/super/roles', label: 'Roles & Permissions', icon: Shield },
  { to: '/admin/super/facility-managers', label: 'PJ Fasilitas', icon: Users },
  { to: '/admin/super/workflows', label: 'Approval Workflow', icon: Workflow },
  { to: '/admin/super/approver-emails', label: 'Email Approver', icon: Mail },
  { to: '/admin/super/config', label: 'Konfigurasi', icon: Cog },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminRecord, setAdminRecord] = useState<AdminUserRecord | null>(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('admin_users')
        .select('role, name, email')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (data) setAdminRecord(data as unknown as AdminUserRecord);
    };
    fetchAdmin();
  }, [user]);

  const isSuperAdmin = adminRecord?.role === 'superadmin';

  const handleSignOut = async () => {
    await signOut();
    showToast('Berhasil logout', 'success');
    navigate('/auth');
  };

  const renderNavLink = (item: typeof navItems[number]) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
            isActive
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )
        }
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
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
          'fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">{brandConfig.system.shortName}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {navItems.map(renderNavLink)}

          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-2 px-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <Shield className="w-4 h-4" />
                  Super Admin
                </div>
              </div>
              {superNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )
                    }
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
              {(adminRecord?.name ?? user?.email ?? 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {adminRecord?.name ?? user?.email}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {adminRecord?.role ?? 'admin'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Menu className="w-6 h-6 text-slate-700 dark:text-slate-200" />
          </button>
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Admin Dashboard</h2>
          </div>
          <button
            onClick={toggle}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            ) : (
              <Sun className="w-5 h-5 text-slate-200" />
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import { cn } from '../utils/cn';
import { showToast } from '../components/Toast';
import {
  LayoutDashboard, Package, Building2, FileText, BarChart3, Users,
  Megaphone, MessageSquare, UserCog, ShieldCheck, UserPlus, Workflow,
  Mail, Settings, LogOut, Menu, X, Moon, Sun, ClipboardList,
} from 'lucide-react';

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
  { to: '/admin/borrowings', label: 'Peminjaman', icon: ClipboardList, end: false },
  { to: '/admin/inventory', label: 'Inventaris', icon: Package, end: false },
  { to: '/admin/facilities', label: 'Fasilitas', icon: Building2, end: false },
  { to: '/admin/reports', label: 'Laporan', icon: FileText, end: false },
  { to: '/admin/statistics', label: 'Statistik', icon: BarChart3, end: false },
  { to: '/admin/team', label: 'Tim', icon: Users, end: false },
  { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone, end: false },
  { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare, end: false },
];

const superNavItems = [
  { to: '/admin/super/users', label: 'Manajemen User', icon: UserCog, end: false },
  { to: '/admin/super/roles', label: 'Roles & Permissions', icon: ShieldCheck, end: false },
  { to: '/admin/super/facility-managers', label: 'PJ Fasilitas', icon: UserPlus, end: false },
  { to: '/admin/super/workflows', label: 'Approval Workflow', icon: Workflow, end: false },
  { to: '/admin/super/approver-emails', label: 'Email Approver', icon: Mail, end: false },
  { to: '/admin/super/config', label: 'Konfigurasi', icon: Settings, end: false },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, user_id, email, name, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setAdminUser(data as unknown as AdminUser);
      setLoading(false);
    };
    fetchAdmin();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    showToast('Berhasil keluar', 'success');
    navigate('/auth');
  };

  const isSuperAdmin = adminUser?.role === 'superadmin';

  const renderNavItems = (items: typeof navItems) =>
    items.map(item => {
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
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            )
          }
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      );
    });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar - desktop */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {brandConfig.system.shortName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {renderNavItems(navItems)}

          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-2 px-4">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Super Admin
                </p>
              </div>
              {renderNavItems(superNavItems)}
            </>
          )}
        </nav>

        {/* User info */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {(adminUser?.name || user?.email || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {adminUser?.name ?? 'Admin'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {adminUser?.email ?? user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 dark:text-slate-300"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {brandConfig.system.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Outlet */}
        <main className="flex-1 p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

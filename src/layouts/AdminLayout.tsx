import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Building2, FileText, BarChart3, Users,
  Megaphone, MessageSquare, ShieldCheck, UserCog, KeyRound, UserSquare,
  Workflow, MailCheck, Settings, LogOut, Menu, X, Moon, Sun, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { brandConfig } from '../brand/config';
import { cn } from '../utils/cn';
import { showToast } from '../components/Toast';

interface AdminUser {
  id: string;
  role: string;
  full_name?: string;
  email?: string;
}

const mainNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/borrowings', label: 'Peminjaman', icon: Package, end: false },
  { to: '/admin/inventory', label: 'Inventaris', icon: Building2, end: false },
  { to: '/admin/facilities', label: 'Fasilitas', icon: Building2, end: false },
  { to: '/admin/reports', label: 'Laporan', icon: FileText, end: false },
  { to: '/admin/statistics', label: 'Statistik', icon: BarChart3, end: false },
  { to: '/admin/team', label: 'Tim', icon: Users, end: false },
  { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone, end: false },
  { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare, end: false },
];

const superNav = [
  { to: '/admin/super/users', label: 'Manajemen User', icon: UserCog, end: false },
  { to: '/admin/super/roles', label: 'Roles & Permissions', icon: KeyRound, end: false },
  { to: '/admin/super/facility-managers', label: 'PJ Fasilitas', icon: UserSquare, end: false },
  { to: '/admin/super/workflows', label: 'Approval Workflow', icon: Workflow, end: false },
  { to: '/admin/super/approver-emails', label: 'Email Approver', icon: MailCheck, end: false },
  { to: '/admin/super/config', label: 'Konfigurasi', icon: Settings, end: false },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmin = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, role, full_name, email')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (error) {
        showToast('Gagal memuat data admin', 'error');
      } else if (data) {
        setAdminUser(data as unknown as AdminUser);
      }
      setLoading(false);
    };
    fetchAdmin();
  }, [user]);

  const isSuperAdmin = adminUser?.role === 'superadmin';

  const handleLogout = async () => {
    await signOut();
    showToast('Berhasil logout', 'success');
    navigate('/auth');
  };

  const navLinkClass = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
      isActive
        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <div>
          <p className="font-bold text-slate-900 dark:text-white text-sm">{brandConfig.system.shortName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Super Admin
              </p>
            </div>
            {superNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {(adminUser?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {adminUser?.full_name || user?.email || 'Admin'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {adminUser?.role || 'admin'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-800 shadow-xl animate-slide-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {brandConfig.system.shortName} <span className="text-slate-400 font-normal">Admin</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm">
                  {(adminUser?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-50 py-2">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {adminUser?.full_name || user?.email}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {adminUser?.role || 'admin'}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
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

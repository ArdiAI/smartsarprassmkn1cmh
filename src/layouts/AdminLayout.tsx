import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ClipboardList, AlertTriangle, Building2, BarChart3,
  Users, Menu, X, Sun, Moon, LogOut, Megaphone, MessageSquare,
  ShieldCheck, UserCog, KeyRound, UserCheck, GitBranch, Settings,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';
import { supabase } from '../lib/supabase';

const mainMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Megaphone, label: 'Pengumuman', path: '/admin/announcements' },
  { icon: MessageSquare, label: 'Aspirasi', path: '/admin/aspirasi' },
  { icon: Package, label: 'Inventaris', path: '/admin/inventory' },
  { icon: ClipboardList, label: 'Peminjaman', path: '/admin/borrowings' },
  { icon: AlertTriangle, label: 'Laporan', path: '/admin/reports' },
  { icon: Building2, label: 'Fasilitas', path: '/admin/facilities' },
  { icon: Users, label: 'Tim Pengelola', path: '/admin/team' },
  { icon: BarChart3, label: 'Statistik', path: '/admin/statistics' },
];

const superAdminItems = [
  { icon: UserCog, label: 'Manajemen Pengguna', path: '/admin/super/users' },
  { icon: KeyRound, label: 'Role & Permission', path: '/admin/super/roles' },
  { icon: UserCheck, label: 'PJ Fasilitas', path: '/admin/super/facility-managers' },
  { icon: GitBranch, label: 'Workflow Approval', path: '/admin/super/workflows' },
  { icon: Settings, label: 'Konfigurasi Sistem', path: '/admin/super/config' },
];

interface AdminUserInfo {
  id: string;
  name: string;
  roles?: { name: string; level: number }[];
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [superMenuOpen, setSuperMenuOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState<AdminUserInfo | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminInfo();
    // Open super menu if on super admin pages
    if (location.pathname.startsWith('/admin/super')) setSuperMenuOpen(true);
  }, [user]);

  async function fetchAdminInfo() {
    if (!user) return;
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminUser) return;

    const { data: roleAssignments } = await supabase
      .from('admin_user_roles')
      .select('roles(id, name, level)')
      .eq('admin_user_id', adminUser.id);

    const roles = (roleAssignments || []).map((a: any) => a.roles).filter(Boolean);
    const maxLevel = Math.max(0, ...roles.map((r: any) => r.level));

    setAdminInfo({ ...adminUser, roles });
    setIsSuperAdmin(maxLevel >= 100);
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const isActive = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);

  const isSuperActive = superAdminItems.some(i => isActive(i.path));

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 lg:translate-x-0 flex flex-col',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">SMART SARPRAS</span>
          </Link>
          {isSuperAdmin && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-500 font-semibold">Super Admin</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {mainMenuItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              )}>
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}

          {/* Super Admin Section */}
          {isSuperAdmin && (
            <div className="pt-2">
              <div className="px-3 py-1 mb-1">
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <button onClick={() => setSuperMenuOpen(!superMenuOpen)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  isSuperActive
                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}>
                <ShieldCheck className="w-5 h-5" />
                <span className="font-medium flex-1 text-left">Super Admin</span>
                {superMenuOpen
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />}
              </button>
              {superMenuOpen && (
                <div className="mt-1 ml-3 pl-3 border-l-2 border-rose-200 dark:border-rose-800 space-y-1">
                  {superAdminItems.map(item => (
                    <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm',
                        isActive(item.path)
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-400'
                      )}>
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">
                {(adminInfo?.name || user?.email)?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {adminInfo?.name || 'Admin'}
              </div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-4 ml-auto">
              <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                {theme === 'light'
                  ? <Moon className="w-5 h-5 text-slate-600" />
                  : <Sun className="w-5 h-5 text-slate-300" />}
              </button>
              <Link to="/" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Lihat Website
              </Link>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

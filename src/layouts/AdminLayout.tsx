import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Building2,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  FileText,
  Users,
  Megaphone,
  MessageSquare,
  BarChart3,
  UserCog,
  ShieldCheck,
  Workflow,
  Settings,
  Mail,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { brand } from '../brand/config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
}

const mainNav: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:read' },
  { to: '/admin/borrowings', label: 'Peminjaman', icon: ClipboardList, permission: 'borrowings:read' },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays, permission: 'agenda:read' },
  { to: '/admin/timeline', label: 'Timeline', icon: CalendarRange, permission: 'timeline:read' },
  { to: '/admin/inventory', label: 'Inventaris', icon: Package, permission: 'inventory:read' },
  { to: '/admin/facilities', label: 'Fasilitas', icon: Building2, permission: 'facilities:read' },
  { to: '/admin/reports', label: 'Laporan', icon: FileText, permission: 'reports:read' },
  { to: '/admin/team', label: 'Tim', icon: Users, permission: 'team:read' },
  { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone, permission: 'announcements:read' },
  { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare, permission: 'aspirasi:read' },
  { to: '/admin/statistics', label: 'Statistik', icon: BarChart3, permission: 'statistics:read' },
];

const superNav: NavItem[] = [
  { to: '/admin/users', label: 'Manajemen User', icon: UserCog, permission: 'users:read' },
  { to: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'roles:read' },
  { to: '/admin/facility-managers', label: 'PJ Fasilitas', icon: Building2, permission: 'facility_managers:read' },
  { to: '/admin/workflows', label: 'Workflow', icon: Workflow, permission: 'workflows:read' },
  { to: '/admin/system-config', label: 'Konfigurasi Sistem', icon: Settings, permission: 'system_config:read' },
  { to: '/admin/approver-emails', label: 'Email Approver', icon: Mail, permission: 'approver_emails:read' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminProfile, signOut, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const visibleMain = mainNav.filter((n) => !n.permission || hasPermission(n.permission.split(':')[0], n.permission.split(':')[1]));
  const visibleSuper = superNav.filter((n) => !n.permission || hasPermission(n.permission.split(':')[0], n.permission.split(':')[1]));

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            active
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      );
    });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">{brand.name}</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-xs font-semibold uppercase text-slate-400">Menu Utama</div>
          <div className="mb-4 flex flex-col gap-1">{renderNav(visibleMain)}</div>

          {visibleSuper.length > 0 && (
            <>
              <div className="mb-2 px-3 text-xs font-semibold uppercase text-slate-400">Superadmin</div>
              <div className="mb-4 flex flex-col gap-1">{renderNav(visibleSuper)}</div>
            </>
          )}

          <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="mb-3 px-3 text-sm">
              <p className="font-semibold text-slate-800 dark:text-slate-200">{adminProfile?.name ?? 'Admin'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{adminProfile?.email ?? ''}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-5 w-5" />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <button onClick={() => setOpen(true)} className="lg:hidden">
            <Menu className="h-6 w-6 text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Panel Admin
          </h1>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

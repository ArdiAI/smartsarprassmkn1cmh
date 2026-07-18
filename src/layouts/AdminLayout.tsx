import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Package, Building2, FileText, BarChart3, Users,
  Megaphone, MessageSquare, Menu, X, Moon, Sun, LogOut, Settings,
  Shield, UserCog, Workflow, Mail, ChevronDown, Calendar, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { brandConfig } from '../brand/config';

interface NavItem {
  to: string;
  label: string;
  icon: any;
  permission: { module: string; action: string };
  end?: boolean;
}

export default function AdminLayout() {
  const { user, adminProfile, permissions, hasPermission, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [superOpen, setSuperOpen] = useState(true);

  const navItems: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: { module: '', action: '' }, end: true },
    { to: '/admin/borrowings', label: 'Peminjaman', icon: Package, permission: { module: 'borrowings', action: 'read' } },
    { to: '/admin/agendas', label: 'Agenda', icon: Calendar, permission: { module: 'agendas', action: 'read' } },
    { to: '/admin/rekap-data', label: 'Rekap Data', icon: ClipboardList, permission: { module: 'rekap_data', action: 'read' } },
    { to: '/admin/inventory', label: 'Inventaris', icon: Package, permission: { module: 'inventory', action: 'read' } },
    { to: '/admin/facilities', label: 'Fasilitas', icon: Building2, permission: { module: 'facilities', action: 'read' } },
    { to: '/admin/reports', label: 'Laporan', icon: FileText, permission: { module: 'reports', action: 'read' } },
    { to: '/admin/statistics', label: 'Statistik', icon: BarChart3, permission: { module: 'statistics', action: 'read' } },
    { to: '/admin/team', label: 'Tim', icon: Users, permission: { module: 'team', action: 'read' } },
    { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone, permission: { module: 'announcements', action: 'read' } },
    { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare, permission: { module: 'aspirasi', action: 'read' } },
  ];

  const superItems: NavItem[] = [
    { to: '/admin/super/users', label: 'Manajemen User', icon: UserCog, permission: { module: 'users', action: 'read' } },
    { to: '/admin/super/roles', label: 'Roles & Permissions', icon: Shield, permission: { module: 'roles', action: 'read' } },
    { to: '/admin/super/facility-managers', label: 'PJ Fasilitas', icon: Users, permission: { module: 'facility_managers', action: 'read' } },
    { to: '/admin/super/workflows', label: 'Approval Workflow', icon: Workflow, permission: { module: 'workflows', action: 'read' } },
    { to: '/admin/super/approver-emails', label: 'Email Approver', icon: Mail, permission: { module: 'approver_emails', action: 'read' } },
    { to: '/admin/super/config', label: 'Konfigurasi', icon: Settings, permission: { module: 'system_config', action: 'read' } },
  ];

  const visibleNav = navItems.filter(item => !item.permission.module || hasPermission(item.permission.module, item.permission.action));
  const visibleSuper = superItems.filter(item => hasPermission(item.permission.module, item.permission.action));
  const hasSuper = visibleSuper.length > 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-40 transform transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } flex flex-col`}
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">{brandConfig.system.name}</p>
              <p className="text-xs text-slate-500">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleNav.map(item => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={() => setSidebarOpen(false)}>
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}

          {hasSuper && (
            <>
              <button
                onClick={() => setSuperOpen(!superOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
              >
                <Shield className="w-4 h-4" />
                Super Admin
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${superOpen ? 'rotate-180' : ''}`} />
              </button>
              {superOpen &&
                visibleSuper.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setSidebarOpen(false)}>
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {(adminProfile?.name || user?.email || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {adminProfile?.name || user?.email}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {permissions.size > 0 ? `${permissions.size} permissions` : 'admin'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white hidden md:block">Admin Panel</h1>
          <button onClick={toggle} className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 right-4 z-50 md:hidden p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

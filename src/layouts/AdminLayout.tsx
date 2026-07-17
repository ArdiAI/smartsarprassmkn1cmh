import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, Building, FileText, Users, Megaphone, Settings, Shield, Workflow, UserCog, BarChart3, MessageSquare, LogOut, Menu, X, Moon, Sun, Bell, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';
import { brandConfig } from '../brand/config';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      if (user) {
        const { data } = await supabase.from('admin_users').select('*, roles(name, level)').eq('user_id', user.id).single();
        if (data) setAdminUser(data);
        else navigate('/');
      }
    };
    check();
  }, [user, navigate]);

  if (!adminUser) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/borrowings', label: 'Peminjaman', icon: ClipboardList },
    { to: '/admin/inventory', label: 'Inventaris', icon: Package },
    { to: '/admin/facilities', label: 'Fasilitas', icon: Building },
    { to: '/admin/reports', label: 'Laporan', icon: FileText },
    { to: '/admin/statistics', label: 'Statistik', icon: BarChart3 },
    { to: '/admin/team', label: 'Tim', icon: Users },
    { to: '/admin/announcements', label: 'Pengumuman', icon: Megaphone },
    { to: '/admin/aspirasi', label: 'Aspirasi', icon: MessageSquare },
  ];
  const superItems = [
    { to: '/admin/super/users', label: 'Manajemen User', icon: UserCog },
    { to: '/admin/super/roles', label: 'Roles & Permissions', icon: Shield },
    { to: '/admin/super/facility-managers', label: 'PJ Fasilitas', icon: Users },
    { to: '/admin/super/workflows', label: 'Approval Workflow', icon: Workflow },
    { to: '/admin/super/approver-emails', label: 'Email Approver', icon: Mail },
    { to: '/admin/super/config', label: 'Konfigurasi', icon: Settings },
  ];
  const isSuper = adminUser?.role === 'superadmin';
  const linkCls = ({ isActive }: { isActive: boolean }) => cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex">
      <aside className={cn('fixed lg:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-50 transition-transform lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><LayoutDashboard className="w-4 h-4 text-white" /></div><span className="font-bold text-slate-900 dark:text-white">{brandConfig.system.name}</span></div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1"><X className="w-5 h-5" /></button>
        </div>
        <nav className="p-3 overflow-y-auto h-[calc(100vh-140px)]">
          <div className="space-y-1">{navItems.map(i => <NavLink key={i.to} to={i.to} end={i.end} onClick={() => setSidebarOpen(false)} className={linkCls}><i.icon className="w-4 h-4" /> {i.label}</NavLink>)}</div>
          {isSuper && (<div className="mt-6"><p className="text-xs font-semibold text-slate-400 uppercase px-3 mb-2">Super Admin</p><div className="space-y-1">{superItems.map(i => <NavLink key={i.to} to={i.to} onClick={() => setSidebarOpen(false)} className={linkCls}><i.icon className="w-4 h-4" /> {i.label}</NavLink>)}</div></div>)}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium text-blue-600">{adminUser?.name?.[0] || 'A'}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 dark:text-white truncate">{adminUser?.name || 'Admin'}</p><p className="text-xs text-slate-400 truncate">{adminUser?.email}</p></div></div>
          <button onClick={async () => { await signOut(); navigate('/'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><LogOut className="w-4 h-4" /> Keluar</button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={toggle} className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">{theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</button>
            <button className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 relative"><Bell className="w-5 h-5" /><span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" /></button>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}

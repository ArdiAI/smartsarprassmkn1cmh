import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import Toast from './components/Toast';
import AccessDenied from './components/AccessDenied';

import AuthPage from './pages/AuthPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import LandingPage from './pages/LandingPage';
import FacilitiesPage from './pages/FacilitiesPage';
import InventoryPage from './pages/InventoryPage';
import HistoryPage from './pages/HistoryPage';
import ReportPage from './pages/ReportPage';
import AboutPage from './pages/AboutPage';
import BorrowPage from './pages/BorrowPage';
import RekapPage from './pages/RekapPage';

import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import BorrowingsAdminPage from './pages/admin/BorrowingsAdminPage';
import InventoryAdminPage from './pages/admin/InventoryAdminPage';
import FacilitiesAdminPage from './pages/admin/FacilitiesAdminPage';
import ReportsAdminPage from './pages/admin/ReportsAdminPage';
import TeamAdminPage from './pages/admin/TeamAdminPage';
import AnnouncementsAdminPage from './pages/admin/AnnouncementsAdminPage';
import AspirasiAdminPage from './pages/admin/AspirasiAdminPage';
import StatisticsPage from './pages/admin/StatisticsPage';

import UserManagementPage from './pages/admin/superadmin/UserManagementPage';
import RolesPermissionsPage from './pages/admin/superadmin/RolesPermissionsPage';
import FacilityManagersPage from './pages/admin/superadmin/FacilityManagersPage';
import ApprovalWorkflowPage from './pages/admin/superadmin/ApprovalWorkflowPage';
import SystemConfigPage from './pages/admin/superadmin/SystemConfigPage';
import ApproverEmailsPage from './pages/admin/superadmin/ApproverEmailsPage';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// AdminRoute: access granted purely based on permissions (isAdmin = permissions.size > 0).
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, permissions } = useAuth();

  console.group('%c[DEBUG] AdminRoute CHECK', 'color:#dc2626;font-weight:bold;font-size:13px');
  console.log('[DEBUG] AdminRoute — loading:', loading);
  console.log('[DEBUG] AdminRoute — hasUser:', !!user);
  console.log('[DEBUG] AdminRoute — isAdmin:', isAdmin);
  console.log('[DEBUG] AdminRoute — permissions.size:', permissions.size);
  console.log('[DEBUG] AdminRoute — permissions content:', Array.from(permissions));
  console.log('[DEBUG] AdminRoute — permission yang sedang dicek: TIDAK ADA (AdminRoute hanya cek permissions.size > 0)');
  console.log('[DEBUG] AdminRoute — keputusan:', loading ? 'loading...' : !user ? 'redirect ke /auth' : !isAdmin ? `DITOLAK (permissions.size=${permissions.size}, harus > 0)` : 'DITERIMA (permissions.size > 0)');
  console.groupEnd();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return <AccessDenied message="Akun Anda tidak memiliki permission admin. Hubungi Super Admin untuk memberikan role." />;
  }
  return <>{children}</>;
}

// PermissionRoute: gate a single admin page by required permission(s).
function PermissionRoute({ permission, children }: { permission: { module: string; action: string }; children: ReactNode }) {
  const { hasPermission, permissions } = useAuth();
  const required = `${permission.module}:${permission.action}`;
  const granted = hasPermission(permission.module, permission.action);

  console.group('%c[DEBUG] PermissionRoute CHECK', 'color:#0891b2;font-weight:bold;font-size:13px');
  console.log('[DEBUG] PermissionRoute — permission yang sedang dicek:', required);
  console.log('[DEBUG] PermissionRoute — granted?', granted);
  console.log('[DEBUG] PermissionRoute — permissions.size:', permissions.size);
  console.log('[DEBUG] PermissionRoute — permissions content:', Array.from(permissions));
  console.log('[DEBUG] PermissionRoute — keputusan:', granted ? 'DITERIMA' : `DITOLAK (butuh ${required})`);
  console.groupEnd();

  if (!granted) {
    return <AccessDenied message={`Permission "${permission.module}:${permission.action}" diperlukan untuk membuka halaman ini.`} />;
  }
  return <>{children}</>;
}

function CatchAll() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return <Navigate to={user ? '/' : '/auth'} replace />;
}

export default function App() {
  return (
    <>
      <Toast />
      <Routes>
        <Route path="/auth" element={<RedirectIfAuth><AuthPage /></RedirectIfAuth>} />
        <Route path="/auth/confirm" element={<ConfirmEmailPage />} />

        <Route path="/" element={<RequireAuth><LandingPage /></RequireAuth>} />
        <Route path="/fasilitas" element={<RequireAuth><FacilitiesPage /></RequireAuth>} />
        <Route path="/inventaris" element={<RequireAuth><InventoryPage /></RequireAuth>} />
        <Route path="/riwayat" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/laporan" element={<RequireAuth><ReportPage /></RequireAuth>} />
        <Route path="/tentang" element={<RequireAuth><AboutPage /></RequireAuth>} />
        <Route path="/pinjam" element={<RequireAuth><BorrowPage /></RequireAuth>} />
        <Route path="/rekap" element={<RequireAuth><RekapPage /></RequireAuth>} />

        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="borrowings" element={<PermissionRoute permission={{ module: 'borrowings', action: 'read' }}><BorrowingsAdminPage /></PermissionRoute>} />
          <Route path="inventory" element={<PermissionRoute permission={{ module: 'inventory', action: 'read' }}><InventoryAdminPage /></PermissionRoute>} />
          <Route path="facilities" element={<PermissionRoute permission={{ module: 'facilities', action: 'read' }}><FacilitiesAdminPage /></PermissionRoute>} />
          <Route path="reports" element={<PermissionRoute permission={{ module: 'reports', action: 'read' }}><ReportsAdminPage /></PermissionRoute>} />
          <Route path="statistics" element={<PermissionRoute permission={{ module: 'statistics', action: 'read' }}><StatisticsPage /></PermissionRoute>} />
          <Route path="team" element={<PermissionRoute permission={{ module: 'team', action: 'read' }}><TeamAdminPage /></PermissionRoute>} />
          <Route path="announcements" element={<PermissionRoute permission={{ module: 'announcements', action: 'read' }}><AnnouncementsAdminPage /></PermissionRoute>} />
          <Route path="aspirasi" element={<PermissionRoute permission={{ module: 'aspirasi', action: 'read' }}><AspirasiAdminPage /></PermissionRoute>} />
          <Route path="super/users" element={<PermissionRoute permission={{ module: 'users', action: 'read' }}><UserManagementPage /></PermissionRoute>} />
          <Route path="super/roles" element={<PermissionRoute permission={{ module: 'roles', action: 'read' }}><RolesPermissionsPage /></PermissionRoute>} />
          <Route path="super/facility-managers" element={<PermissionRoute permission={{ module: 'facility_managers', action: 'read' }}><FacilityManagersPage /></PermissionRoute>} />
          <Route path="super/workflows" element={<PermissionRoute permission={{ module: 'workflows', action: 'read' }}><ApprovalWorkflowPage /></PermissionRoute>} />
          <Route path="super/approver-emails" element={<PermissionRoute permission={{ module: 'approver_emails', action: 'read' }}><ApproverEmailsPage /></PermissionRoute>} />
          <Route path="super/config" element={<PermissionRoute permission={{ module: 'system_config', action: 'read' }}><SystemConfigPage /></PermissionRoute>} />
        </Route>

        <Route path="*" element={<CatchAll />} />
      </Routes>
    </>
  );
}

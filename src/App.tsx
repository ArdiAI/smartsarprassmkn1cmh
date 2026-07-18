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

// AdminRoute: grants access to the admin shell only if the user has at least one permission.
// No more boolean isAdmin / string "superadmin" checks.
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading, permissions } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (permissions.size === 0) return <AccessDenied message="Akun Anda tidak memiliki permission admin. Hubungi Super Admin untuk memberikan role." />;
  return <>{children}</>;
}

// PermissionRoute: gate a single admin page by required permission(s).
// Renders AccessDenied (not a redirect) when the user lacks the permission.
function PermissionRoute({ permission, children }: { permission: { module: string; action: string }; children: ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission.module, permission.action)) {
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

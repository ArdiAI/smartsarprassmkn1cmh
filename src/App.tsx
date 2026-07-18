import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import Toast from './components/Toast';

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

// FIX: AdminRoute now reads `isAdmin` from AuthContext (which fetches admin_users at login)
// instead of re-querying admin_users itself. This ensures the role check is consistent
// with the session and refreshable via refreshAdminProfile().
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
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
          <Route path="borrowings" element={<BorrowingsAdminPage />} />
          <Route path="inventory" element={<InventoryAdminPage />} />
          <Route path="facilities" element={<FacilitiesAdminPage />} />
          <Route path="reports" element={<ReportsAdminPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="team" element={<TeamAdminPage />} />
          <Route path="announcements" element={<AnnouncementsAdminPage />} />
          <Route path="aspirasi" element={<AspirasiAdminPage />} />
          <Route path="super/users" element={<UserManagementPage />} />
          <Route path="super/roles" element={<RolesPermissionsPage />} />
          <Route path="super/facility-managers" element={<FacilityManagersPage />} />
          <Route path="super/workflows" element={<ApprovalWorkflowPage />} />
          <Route path="super/approver-emails" element={<ApproverEmailsPage />} />
          <Route path="super/config" element={<SystemConfigPage />} />
        </Route>

        <Route path="*" element={<CatchAll />} />
      </Routes>
    </>
  );
}

import { lazy, Suspense, useState, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import { supabase } from './lib/supabase';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const ConfirmEmailPage = lazy(() => import('./pages/ConfirmEmailPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const FacilitiesPage = lazy(() => import('./pages/FacilitiesPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const BorrowPage = lazy(() => import('./pages/BorrowPage'));
const RekapPage = lazy(() => import('./pages/RekapPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LoginPage = lazy(() => import('./pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const InventoryAdminPage = lazy(() => import('./pages/admin/InventoryAdminPage'));
const BorrowingsAdminPage = lazy(() => import('./pages/admin/BorrowingsAdminPage'));
const ReportsAdminPage = lazy(() => import('./pages/admin/ReportsAdminPage'));
const FacilitiesAdminPage = lazy(() => import('./pages/admin/FacilitiesAdminPage'));
const StatisticsPage = lazy(() => import('./pages/admin/StatisticsPage'));
const TeamAdminPage = lazy(() => import('./pages/admin/TeamAdminPage'));
const AnnouncementsAdminPage = lazy(() => import('./pages/admin/AnnouncementsAdminPage'));
const AspirasiAdminPage = lazy(() => import('./pages/admin/AspirasiAdminPage'));
const UserManagementPage = lazy(() => import('./pages/admin/superadmin/UserManagementPage'));
const RolesPermissionsPage = lazy(() => import('./pages/admin/superadmin/RolesPermissionsPage'));
const FacilityManagersPage = lazy(() => import('./pages/admin/superadmin/FacilityManagersPage'));
const ApprovalWorkflowPage = lazy(() => import('./pages/admin/superadmin/ApprovalWorkflowPage'));
const SystemConfigPage = lazy(() => import('./pages/admin/superadmin/SystemConfigPage'));
const ApproverEmailsPage = lazy(() => import('./pages/admin/superadmin/ApproverEmailsPage'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

function PageLoader() {
  return <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
}

/** Redirect to /auth if not logged in. Wraps all protected routes. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/** Redirect to / if already logged in (for /auth page). */
function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('admin_users').select('id').eq('user_id', session.user.id).single();
        setIsAdmin(!!data);
      }
      setChecking(false);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => check());
    return () => subscription.unsubscribe();
  }, []);
  if (checking) return <PageLoader />;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes - no auth required */}
      <Route path="/auth" element={<RedirectIfAuth><S><AuthPage /></S></RedirectIfAuth>} />
      <Route path="/auth/confirm" element={<S><ConfirmEmailPage /></S>} />

      {/* All other routes require authentication */}
      <Route path="/" element={<RequireAuth><S><LandingPage /></S></RequireAuth>} />
      <Route path="/facilities" element={<RequireAuth><S><FacilitiesPage /></S></RequireAuth>} />
      <Route path="/inventory" element={<RequireAuth><S><InventoryPage /></S></RequireAuth>} />
      <Route path="/borrow" element={<RequireAuth><S><BorrowPage /></S></RequireAuth>} />
      <Route path="/rekap" element={<RequireAuth><S><RekapPage /></S></RequireAuth>} />
      <Route path="/history" element={<RequireAuth><S><HistoryPage /></S></RequireAuth>} />
      <Route path="/report" element={<RequireAuth><S><ReportPage /></S></RequireAuth>} />
      <Route path="/about" element={<RequireAuth><S><AboutPage /></S></RequireAuth>} />

      <Route path="/admin/login" element={<RequireAuth><S><LoginPage /></S></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><AdminRoute><S><AdminLayout /></S></AdminRoute></RequireAuth>}>
        <Route index element={<S><DashboardPage /></S>} />
        <Route path="inventory" element={<S><InventoryAdminPage /></S>} />
        <Route path="borrowings" element={<S><BorrowingsAdminPage /></S>} />
        <Route path="reports" element={<S><ReportsAdminPage /></S>} />
        <Route path="facilities" element={<S><FacilitiesAdminPage /></S>} />
        <Route path="statistics" element={<S><StatisticsPage /></S>} />
        <Route path="team" element={<S><TeamAdminPage /></S>} />
        <Route path="announcements" element={<S><AnnouncementsAdminPage /></S>} />
        <Route path="aspirasi" element={<S><AspirasiAdminPage /></S>} />
        <Route path="super/users" element={<S><UserManagementPage /></S>} />
        <Route path="super/roles" element={<S><RolesPermissionsPage /></S>} />
        <Route path="super/facility-managers" element={<S><FacilityManagersPage /></S>} />
        <Route path="super/workflows" element={<S><ApprovalWorkflowPage /></S>} />
        <Route path="super/approver-emails" element={<S><ApproverEmailsPage /></S>} />
        <Route path="super/config" element={<S><SystemConfigPage /></S>} />
      </Route>

      {/* Catch-all: if not logged in, go to auth; if logged in, go to landing */}
      <Route path="*" element={<CatchAll />} />
    </Routes>
  );
}

function CatchAll() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? '/' : '/auth'} replace />;
}

function App() {
  return <ThemeProvider><AuthProvider><ToastProvider><BrowserRouter><AppRoutes /></BrowserRouter></ToastProvider></AuthProvider></ThemeProvider>;
}

export default App;

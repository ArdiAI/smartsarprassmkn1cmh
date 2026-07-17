import { lazy, Suspense, useState, useEffect } from 'react';
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

function AdminRoute({ children }: { children: React.ReactNode }) {
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Suspense fallback={<PageLoader />}><AuthPage /></Suspense>} />
      <Route path="/auth/confirm" element={<Suspense fallback={<PageLoader />}><ConfirmEmailPage /></Suspense>} />

      <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
      <Route path="/facilities" element={<Suspense fallback={<PageLoader />}><FacilitiesPage /></Suspense>} />
      <Route path="/inventory" element={<Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>} />
      <Route path="/borrow" element={<Suspense fallback={<PageLoader />}><BorrowPage /></Suspense>} />
      <Route path="/rekap" element={<Suspense fallback={<PageLoader />}><RekapPage /></Suspense>} />
      <Route path="/history" element={<Suspense fallback={<PageLoader />}><HistoryPage /></Suspense>} />
      <Route path="/report" element={<Suspense fallback={<PageLoader />}><ReportPage /></Suspense>} />
      <Route path="/about" element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />

      <Route path="/admin/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
      <Route path="/admin" element={<AdminRoute><Suspense fallback={<PageLoader />}><AdminLayout /></Suspense></AdminRoute>}>
        <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
        <Route path="inventory" element={<Suspense fallback={<PageLoader />}><InventoryAdminPage /></Suspense>} />
        <Route path="borrowings" element={<Suspense fallback={<PageLoader />}><BorrowingsAdminPage /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsAdminPage /></Suspense>} />
        <Route path="facilities" element={<Suspense fallback={<PageLoader />}><FacilitiesAdminPage /></Suspense>} />
        <Route path="statistics" element={<Suspense fallback={<PageLoader />}><StatisticsPage /></Suspense>} />
        <Route path="team" element={<Suspense fallback={<PageLoader />}><TeamAdminPage /></Suspense>} />
        <Route path="announcements" element={<Suspense fallback={<PageLoader />}><AnnouncementsAdminPage /></Suspense>} />
        <Route path="aspirasi" element={<Suspense fallback={<PageLoader />}><AspirasiAdminPage /></Suspense>} />
        <Route path="super/users" element={<Suspense fallback={<PageLoader />}><UserManagementPage /></Suspense>} />
        <Route path="super/roles" element={<Suspense fallback={<PageLoader />}><RolesPermissionsPage /></Suspense>} />
        <Route path="super/facility-managers" element={<Suspense fallback={<PageLoader />}><FacilityManagersPage /></Suspense>} />
        <Route path="super/workflows" element={<Suspense fallback={<PageLoader />}><ApprovalWorkflowPage /></Suspense>} />
        <Route path="super/approver-emails" element={<Suspense fallback={<PageLoader />}><ApproverEmailsPage /></Suspense>} />
        <Route path="super/config" element={<Suspense fallback={<PageLoader />}><SystemConfigPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return <ThemeProvider><AuthProvider><ToastProvider><BrowserRouter><AppRoutes /></BrowserRouter></ToastProvider></AuthProvider></ThemeProvider>;
}

export default App;

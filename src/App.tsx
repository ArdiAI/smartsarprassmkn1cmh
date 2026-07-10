import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import { supabase } from './lib/supabase';
import { useState, useEffect } from 'react';

// Public pages (protected - requires login)
import LandingPage from './pages/LandingPage';
import FacilitiesPage from './pages/FacilitiesPage';
import InventoryPage from './pages/InventoryPage';
import BorrowPage from './pages/BorrowPage';
import RekapPage from './pages/RekapPage';
import HistoryPage from './pages/HistoryPage';
import ReportPage from './pages/ReportPage';
import AboutPage from './pages/AboutPage';
import TeamPage from './pages/TeamPage';
import AuthPage from './pages/AuthPage';
import AgendaPage from './pages/AgendaPage';
import OrganizationsPage from './pages/OrganizationsPage';
import ProposalPage from './pages/ProposalPage';
import AspirasiPage from './pages/AspirasiPage';

// Admin pages
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import InventoryAdminPage from './pages/admin/InventoryAdminPage';
import BorrowingsAdminPage from './pages/admin/BorrowingsAdminPage';
import ReportsAdminPage from './pages/admin/ReportsAdminPage';
import FacilitiesAdminPage from './pages/admin/FacilitiesAdminPage';
import StatisticsPage from './pages/admin/StatisticsPage';
import TeamAdminPage from './pages/admin/TeamAdminPage';
import AnnouncementsAdminPage from './pages/admin/AnnouncementsAdminPage';
import AspirasiAdminPage from './pages/admin/AspirasiAdminPage';

// Super Admin pages
import UserManagementPage from './pages/admin/superadmin/UserManagementPage';
import RolesPermissionsPage from './pages/admin/superadmin/RolesPermissionsPage';
import FacilityManagersPage from './pages/admin/superadmin/FacilityManagersPage';
import ApprovalWorkflowPage from './pages/admin/superadmin/ApprovalWorkflowPage';
import SystemConfigPage from './pages/admin/superadmin/SystemConfigPage';

// Layouts
import AdminLayout from './layouts/AdminLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        setIsAdmin(!!data);
      }
      setChecking(false);
    };
    checkAdmin();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { checkAdmin(); });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Memverifikasi akses admin...</p>
      </div>
    </div>
  );
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />

      <Route path="/" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
      <Route path="/facilities" element={<ProtectedRoute><FacilitiesPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
      <Route path="/borrow" element={<ProtectedRoute><BorrowPage /></ProtectedRoute>} />
      <Route path="/rekap" element={<ProtectedRoute><RekapPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
      <Route path="/organizations" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />
      <Route path="/proposals" element={<ProtectedRoute><ProposalPage /></ProtectedRoute>} />
      <Route path="/aspirasi" element={<ProtectedRoute><AspirasiPage /></ProtectedRoute>} />
      <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />

      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryAdminPage />} />
        <Route path="borrowings" element={<BorrowingsAdminPage />} />
        <Route path="reports" element={<ReportsAdminPage />} />
        <Route path="facilities" element={<FacilitiesAdminPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="team" element={<TeamAdminPage />} />
        <Route path="announcements" element={<AnnouncementsAdminPage />} />
        <Route path="aspirasi" element={<AspirasiAdminPage />} />
        <Route path="super/users" element={<UserManagementPage />} />
        <Route path="super/roles" element={<RolesPermissionsPage />} />
        <Route path="super/facility-managers" element={<FacilityManagersPage />} />
        <Route path="super/workflows" element={<ApprovalWorkflowPage />} />
        <Route path="super/config" element={<SystemConfigPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

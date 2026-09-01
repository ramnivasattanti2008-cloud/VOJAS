import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout, ProtectedRoute } from "@/components/layout";
import { LoadingState, ErrorBoundary } from "@/components/ui";
import CommandPalette from "@/components/CommandPalette/CommandPalette";
import OpeningGate from "@/components/hero/OpeningGate";

// ── Lazy-loaded page bundles (code-split for faster initial load) ───────────

const LoginPage          = lazy(() => import("@/features/auth/LoginPage"));
const RegisterPage       = lazy(() => import("@/features/auth/RegisterPage"));
const DashboardPage      = lazy(() => import("@/features/dashboard/DashboardPage"));
const ProjectsPage       = lazy(() => import("@/features/projects/ProjectsPage"));
const ProjectDetailPage  = lazy(() => import("@/features/projects/ProjectDetailPage"));
const ProjectFormPage    = lazy(() => import("@/features/projects/ProjectFormPage"));
const MapViewPage        = lazy(() => import("@/features/map/MapViewPage"));
const ReportsPage        = lazy(() => import("@/features/reports/ReportsPage"));
const ReportDetailPage   = lazy(() => import("@/features/reports/ReportDetailPage"));
const CitizenReportPage  = lazy(() => import("@/features/reports/CitizenReportPage"));
const MPListPage         = lazy(() => import("@/features/mps/MPListPage"));
const MPDetailPage       = lazy(() => import("@/features/mps/MPDetailPage"));
const VendorListPage     = lazy(() => import("@/features/vendors/VendorListPage"));
const AnomaliesPage      = lazy(() => import("@/features/anomalies/AnomaliesPage"));
const AnomalyDetailPage  = lazy(() => import("@/features/anomalies/AnomalyDetailPage"));
const RiskDashboardPage  = lazy(() => import("@/features/risk/RiskDashboardPage"));
const AnalyticsPage      = lazy(() => import("@/features/analytics/AnalyticsPage"));
const MPAnalyticsPage    = lazy(() => import("@/features/analytics/MPAnalyticsPage"));
const VendorAnalyticsPage= lazy(() => import("@/features/analytics/VendorAnalyticsPage"));
const LongitudinalPage   = lazy(() => import("@/features/analytics/LongitudinalPage"));
const SettingsPage       = lazy(() => import("@/features/settings/SettingsPage"));
const NotificationsPage  = lazy(() => import("@/features/notifications/NotificationsPage"));

// ── Suspense fallback for lazy chunks ────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingState message="Loading page..." size="md" />
    </div>
  );
}

// ── Global ⌘K shortcut ──────────────────────────────────────────────────────

function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return <CommandPalette open={open} onClose={() => setOpen(false)} />;
}

// ── App routes (inside AuthProvider) ─────────────────────────────────────────

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <GlobalCommandPalette />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public routes */}
        <Route path="/login"    element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout user={user}>
                <OpeningGate>
                  <DashboardPage />
                </OpeningGate>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Layout user={user}><ProjectsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/new"
          element={
            <ProtectedRoute>
              <Layout user={user}><ProjectFormPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <Layout user={user}><ProjectDetailPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id/edit"
          element={
            <ProtectedRoute>
              <Layout user={user}><ProjectFormPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <Layout user={user}><MapViewPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Reports — officer review queue */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout user={user}><ReportsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/:id"
          element={
            <ProtectedRoute>
              <Layout user={user}><ReportDetailPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Citizens — public submission portal */}
        <Route
          path="/citizens"
          element={
            <Layout user={user}><CitizenReportPage /></Layout>
          }
        />

        {/* Anomaly Detection */}
        <Route
          path="/anomalies"
          element={
            <ProtectedRoute>
              <Layout user={user}><AnomaliesPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/anomalies/:id"
          element={
            <ProtectedRoute>
              <Layout user={user}><AnomalyDetailPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Risk Dashboard (Phase 10) */}
        <Route
          path="/risk"
          element={
            <ProtectedRoute>
              <Layout user={user}><RiskDashboardPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* MPs — open-data registry */}
        <Route
          path="/mps"
          element={
            <ProtectedRoute>
              <Layout user={user}><MPListPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mps/:id"
          element={
            <ProtectedRoute>
              <Layout user={user}><MPDetailPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Vendors — open-data registry */}
        <Route
          path="/vendors"
          element={
            <ProtectedRoute>
              <Layout user={user}><VendorListPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Analytics (Phase 13) — ADMIN/ANALYST only */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Layout user={user}><AnalyticsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/mp"
          element={
            <ProtectedRoute>
              <Layout user={user}><MPAnalyticsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/vendor"
          element={
            <ProtectedRoute>
              <Layout user={user}><VendorAnalyticsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/longitudinal"
          element={
            <ProtectedRoute>
              <Layout user={user}><LongitudinalPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Notifications */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout user={user}><NotificationsPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Settings (Phase 15) — ADMIN only */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout user={user}><SettingsPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

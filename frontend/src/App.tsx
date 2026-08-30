import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import PlaceholderPage from "./pages/PlaceholderPage";

const ROUTES = [
  {
    path: "/map",
    title: "Map View",
    desc: "Geographic visualization of project locations",
    phase: "Phase 5",
  },
  {
    path: "/anomalies",
    title: "Anomalies",
    desc: "AI-detected anomalies requiring review",
    phase: "Phase 9",
  },
  {
    path: "/reports",
    title: "Citizen Reports",
    desc: "Public complaints and feedback",
    phase: "Phase 6",
  },
  {
    path: "/citizens",
    title: "Citizens",
    desc: "Citizen engagement and participation",
    phase: "Phase 6",
  },
  {
    path: "/analytics",
    title: "Analytics",
    desc: "Statistical insights and trends",
    phase: "Phase 13",
  },
  {
    path: "/settings",
    title: "Settings",
    desc: "Application configuration and preferences",
    phase: "Phase 15",
  },
];

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout user={user}>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Layout user={user}>
              <ProjectsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      {ROUTES.map((r) => (
        <Route
          key={r.path}
          path={r.path}
          element={
            <ProtectedRoute>
              <Layout user={user}>
                <PlaceholderPage title={r.title} description={r.desc} phase={r.phase} />
              </Layout>
            </ProtectedRoute>
          }
        />
      ))}

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

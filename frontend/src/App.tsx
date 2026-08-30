import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import type { User } from "./types";

// Temporary guest user for Phase 2 (real auth in Phase 3)
const guestUser: User = {
  id: "guest",
  email: "guest@vojas.local",
  name: "Demo User",
  role: "ANALYST",
};

const ROUTES: Array<{ path: string; title: string; desc: string; phase: string }> = [
  {
    path: "/projects",
    title: "Projects",
    desc: "MPLAD Scheme project registry and management",
    phase: "Phase 4",
  },
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

function App() {
  return (
    <BrowserRouter>
      <Layout user={guestUser} onSignOut={() => console.log("Sign out — Phase 3")}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          {ROUTES.map((r) => (
            <Route
              key={r.path}
              path={r.path}
              element={
                <PlaceholderPage
                  title={r.title}
                  description={r.desc}
                  phase={r.phase}
                />
              }
            />
          ))}
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

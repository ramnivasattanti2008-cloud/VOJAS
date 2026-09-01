// Role dispatcher — / renders the right dashboard for each user type
import { useAuth } from "@/contexts/AuthContext";
import OfficerDashboard from "./OfficerDashboard";
import MPDashboard from "./MPDashboard";
import CitizenDashboard from "./CitizenDashboard";

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "MP") return <MPDashboard />;
  if (user?.role === "VIEWER") return <CitizenDashboard />;
  return <OfficerDashboard />;
}

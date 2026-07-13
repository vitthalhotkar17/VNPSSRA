import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, ScanFace, Users, FileBarChart2, User, LogOut, Lock, Bell } from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";

const items = [
  { to: "/faculty",               end: true, label: "Dashboard",    icon: LayoutDashboard },
  { to: "/faculty/students",                 label: "Students",      icon: Users },
  { to: "/faculty/start-session",            label: "Start Session", icon: ScanFace, badge: "Go" },
  { to: "/faculty/notifications",            label: "Notifications", icon: Bell },
  { to: "/faculty/reports",                  label: "Reports",       icon: FileBarChart2 },
  { to: "/faculty/profile",                  label: "Profile",       icon: User },
  { to: "/faculty/reset-password",           label: "Reset Password", icon: Lock },
  { action: "logout",                       label: "Logout",        icon: LogOut },
];
const titles = {
  "/faculty": "Faculty Dashboard", "/faculty/students": "Student List",
  "/faculty/start-session": "Start Session",
  "/faculty/reports": "Reports", "/faculty/profile": "Profile",
  "/faculty/notifications": "Notifications",
  "/faculty/reset-password": "Reset Password",
};

export default function FacultyLayout() {
  const { pathname } = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleRefresh = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener("app:refresh", handleRefresh);
    return () => window.removeEventListener("app:refresh", handleRefresh);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar items={items} brand="SAMS Faculty" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Navbar title={titles[pathname] || "Faculty"} />
        <main style={{ flex: 1, padding: 28 }}>
          <ErrorBoundary><Outlet key={`${pathname}-${refreshKey}`} /></ErrorBoundary>
        </main>
        <Footer />
      </div>
    </div>
  );
}

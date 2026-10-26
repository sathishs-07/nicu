// =============================================================
// App.jsx — NICU Command Center Master Shell
// Organizes the website around the 5 permanent navigation sections:
// Dashboard, Doctors, Alert Log, Analytics, and Settings
// =============================================================

import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetails = lazy(() => import("./pages/PatientDetails"));
const Doctors = lazy(() => import("./pages/Doctors"));
const AlertLog = lazy(() => import("./pages/AlertLog"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));

import { useApp } from "./context/AppContext";

function AppShell() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={{
        backgroundColor: "var(--bg-app)",
        color: "var(--text-primary)",
      }}
    >
      {/* ── Fixed Clinical Top Bar Header ── */}
      <Header />

      {/* ── Fixed Deep Navy Sidebar ── */}
      <Sidebar onWidthChange={setSidebarExpanded} />

      {/* ── Main Application Content Canvas ── */}
      <main
        className="transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8"
        style={{
          marginLeft: sidebarExpanded ? "230px" : "68px",
          marginTop: "60px",
          minHeight: "calc(100vh - 60px)",
        }}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span className="text-xs font-mono font-medium text-slate-400">Loading Clinical Module...</span>
              </div>
            </div>
          }
        >
          <Routes>
            {/* 1. Dashboard (Main Page) & 6-Bed Grid */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* 1.1 Neonatal Patients Management & Registry */}
            <Route path="/patients" element={<Patients />} />

            {/* 1.2 Patient Details Subpage */}
            <Route path="/patients/:patientId" element={<PatientDetails />} />

            {/* 2. Doctors — Staff Management */}
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/staff/:staffId" element={<Doctors />} />

            {/* 3. Alert Log — Event History & Response Tracking */}
            <Route path="/alerts" element={<AlertLog />} />
            <Route path="/alerts/:alertId" element={<AlertLog />} />

            {/* 4. Analytics — Reports & Operational Insights */}
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/analytics/reports" element={<Analytics />} />

            {/* 5. Settings — Complete System Configuration */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/devices" element={<Settings />} />
            <Route path="/settings/alert-rules" element={<Settings />} />
            <Route path="/settings/users" element={<Settings />} />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  const { currentUser, setCurrentUser } = useApp();
  const [authChecked, setAuthChecked] = useState(false);

  // Restore session on page reload
  useEffect(() => {
    const stored = sessionStorage.getItem("nicu_user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
      } catch {
        sessionStorage.removeItem("nicu_user");
      }
    }
    setAuthChecked(true);
  }, [setCurrentUser]);

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  // While checking session storage, show nothing (avoids flash)
  if (!authChecked) return null;

  // Not logged in → show login screen
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Authenticated → show full NICU command center
  return <AppShell />;
}

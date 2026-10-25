// =============================================================
// Sidebar.jsx — Deep Navy Clinical Sidebar
// 5 Core Navigation Sections with Teal Active Indicators
// =============================================================

import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Baby,
  Users,
  Bell,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Activity,
  HeartPulse,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const NAV_ITEMS = [
  { to: "/",          icon: LayoutDashboard, label: "Dashboard", end: true, moduleKey: "dashboard" },
  { to: "/patients",  icon: Baby,            label: "Patients",            moduleKey: "patients" },
  { to: "/doctors",   icon: Users,           label: "Doctors",             moduleKey: "doctors" },
  { to: "/alerts",    icon: Bell,            label: "Alert Log", hasBadge: true, moduleKey: "alerts" },
  { to: "/analytics", icon: BarChart3,       label: "Analytics",           moduleKey: "analytics" },
  { to: "/settings",  icon: Settings,        label: "Settings",            moduleKey: "settings" },
];

export default function Sidebar({ onWidthChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const { activeAlertsCount, devicesOnlineCount, totalBeds, canAccess } = useApp();

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.moduleKey && canAccess ? canAccess(item.moduleKey) : true
  );

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onWidthChange?.(!next);
  };

  return (
    <aside
      className="fixed left-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out"
      style={{
        top: "60px", // below header
        width: collapsed ? "68px" : "230px",
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Sidebar Control Bar — Clean, no duplicate NeoCare logo */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 dark:border-slate-800/80">
        {!collapsed && (
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-mono">
            Navigation
          </span>
        )}
        <button
          onClick={toggleCollapse}
          className={`text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors ${
            collapsed ? "mx-auto" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation Label */}
      {!collapsed && (
        <div className="px-5 pt-4 pb-1 text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
          Core Navigation
        </div>
      )}

      {/* Nav Items List */}
      <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ to, icon: Icon, label, end, hasBadge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="block text-decoration-none group"
          >
            {({ isActive }) => (
              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                }`}
              >
                {/* Active Teal Left Border Bar Indicator */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full"
                    style={{ backgroundColor: "var(--sidebar-active-indicator)" }}
                  />
                )}

                <Icon
                  size={20}
                  className={`flex-shrink-0 transition-colors ${
                    isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                  }`}
                />

                {!collapsed && (
                  <span className="text-[13px] tracking-wide truncate flex-1">
                    {label}
                  </span>
                )}

                {/* Unread Alert Count Badge */}
                {hasBadge && activeAlertsCount > 0 && (
                  <span
                    className={`flex items-center justify-center font-mono font-bold rounded-full ${
                      collapsed
                        ? "absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 animate-ping"
                        : "px-2 py-0.5 text-[11px] bg-red-500 text-white shadow-xs alert-pulse-red"
                    }`}
                  >
                    {!collapsed && activeAlertsCount}
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bed Telemetry Status Widget */}
      {!collapsed ? (
        <div className="p-3 mx-2.5 mb-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping inline-block" />
              ESP32 Telemetry
            </span>
            <span className="text-teal-600 dark:text-teal-400 font-bold">{devicesOnlineCount}/{totalBeds} Online</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalBeds > 0 ? (devicesOnlineCount / totalBeds) * 100 : 0}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 flex justify-between">
            <span>NICU Ward 3B</span>
            <span className="text-teal-600 dark:text-teal-400 font-semibold">HiveMQ / REST</span>
          </div>
        </div>
      ) : (
        <div className="p-2 flex justify-center mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500" title="ESP32 Telemetry Active" />
        </div>
      )}
    </aside>
  );
}

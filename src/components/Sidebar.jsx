// =============================================================
// Sidebar.jsx — Modern Clinical White & Blue Sidebar
// Core navigation with clean active indicators, structured sections & status badges
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
  Radio,
  Sliders,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const NAV_SECTIONS = [
  {
    title: "Clinical Monitoring",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Ward Overview", end: true },
      { to: "/patients", icon: Baby, label: "Patient Registry" },
      { to: "/doctors", icon: Users, label: "Care Team Roster" },
    ],
  },
  {
    title: "Diagnostics & Alarms",
    items: [
      { to: "/alerts", icon: Bell, label: "Critical Alarms", hasBadge: true },
      { to: "/analytics", icon: BarChart3, label: "Sensor Analytics" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { to: "/settings", icon: Settings, label: "Unit Settings" },
    ],
  },
];

export default function Sidebar({ onWidthChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const { activeAlertsCount, devicesOnlineCount, totalBeds } = useApp();

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onWidthChange?.(!next);
  };

  return (
    <aside
      className="fixed left-0 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out shadow-xs select-none"
      style={{
        top: "60px",
        width: collapsed ? "68px" : "240px",
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Sidebar Control Bar */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400 font-mono">
              NICU Telemetry
            </span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className={`text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
            collapsed ? "mx-auto" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav Items List by Categorized Clinical Sections */}
      <nav className="flex-1 px-2.5 py-2 space-y-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-mono">
                {section.title}
              </div>
            )}
            {section.items.map(({ to, icon: Icon, label, end, hasBadge }) => (
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
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs border-l-4 border-blue-600"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`flex-shrink-0 transition-colors ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                      }`}
                    />

                    {!collapsed && (
                      <span className="text-[12.5px] tracking-tight truncate flex-1">
                        {label}
                      </span>
                    )}

                    {/* Unread Alert Count Badge */}
                    {hasBadge && activeAlertsCount > 0 && (
                      <span
                        className={`flex items-center justify-center font-mono font-bold rounded-full ${
                          collapsed
                            ? "absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 animate-ping"
                            : "px-2 py-0.5 text-[10.5px] bg-rose-600 text-white shadow-xs alert-pulse-red"
                        }`}
                      >
                        {!collapsed && activeAlertsCount}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bed Telemetry Status Widget */}
      {!collapsed ? (
        <div className="p-3 mx-2.5 mb-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5 font-bold">
              <Radio size={12} className="text-blue-600 animate-pulse" />
              <span>Telemetry Stations</span>
            </span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400">
              {devicesOnlineCount}/{totalBeds} Active
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalBeds > 0 ? (devicesOnlineCount / totalBeds) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[9.5px] text-slate-400 mt-1.5 font-mono">
            <span>ESP32 Telemetry</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Connected</span>
          </div>
        </div>
      ) : (
        <div className="p-2 mb-3 text-center">
          <div
            className="w-2.5 h-2.5 mx-auto rounded-full bg-emerald-500 animate-pulse"
            title={`${devicesOnlineCount}/${totalBeds} online`}
          />
        </div>
      )}
    </aside>
  );
}

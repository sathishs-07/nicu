// =============================================================
// Header.jsx — Clinical Command Center Top Header
// Includes Unit Name, Live Clock, Global Bed Search,
// Notification Bell with Alert Dropdown, and Staff Profile Switcher
// =============================================================

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Clock,
  Calendar,
  Sun,
  Moon,
  ChevronDown,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Cpu,
  X,
  Send,
  LogOut,
  Shield,
} from "lucide-react";
import { useApp, ROLES } from "../context/AppContext";
import { api } from "../services/api";

export default function Header() {
  const navigate = useNavigate();
  const {
    theme,
    toggleTheme,
    currentUser,
    setCurrentUser,
    logout,
    activeAlertsCount,
    activeAlertsList,
    acknowledgeAlert,
    searchQuery,
    setSearchQuery,
    beds,
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMqttModalOpen, setIsMqttModalOpen] = useState(false);
  const [mqttTestBed, setMqttTestBed] = useState("");
  const [mqttTestDevice, setMqttTestDevice] = useState("ESP32-NICU-01");
  const [mqttTestStatus, setMqttTestStatus] = useState(null);

  const handlePublishTestMqtt = async () => {
    setMqttTestStatus("Broadcasting to broker.hivemq.com:1883...");
    try {
      const res = await api.testPublishMqtt({
        deviceId: mqttTestDevice,
        bedId: mqttTestBed,
        heartRate: Math.floor(Math.random() * 20) + 135,
        spo2: Math.floor(Math.random() * 3) + 97,
        temperature: +(36.7 + Math.random() * 0.4).toFixed(1),
      });
      setMqttTestStatus("Success! Live packet ingested & bed updated.");
      setTimeout(() => setMqttTestStatus(null), 4000);
    } catch (err) {
      setMqttTestStatus("Publish error: " + (err.message || "Failed"));
    }
  };

  const alertsRef = useRef(null);
  const profileRef = useRef(null);

  // Live Clock Tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setIsAlertsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-4 lg:px-6 transition-colors duration-200"
      style={{
        backgroundColor: "var(--header-bg)",
        borderBottom: "1px solid var(--header-border)",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
      }}
    >
      {/* ── Left: Unit Branding & Name ── */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 text-decoration-none">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
            NC
          </div>
          <div className="hidden sm:block">
            <div className="text-[14px] font-bold tracking-tight text-slate-100 leading-tight flex items-center gap-1.5">
              <span>NeoCare</span>
              <span className="text-[11px] font-mono text-cyan-400 font-semibold px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800">
                NICU
              </span>
            </div>
            <div className="text-[11px] font-mono text-cyan-400 font-medium">
              Continuous Vital Monitoring Command Center
            </div>
          </div>
        </Link>
      </div>

      {/* ── Right Controls: Clock, Simulator, Alerts, Theme, Profile ── */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Live Date & Time Indicator */}
        <div className="hidden xl:flex items-center gap-3 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
            <Clock size={13} className="text-teal-600 dark:text-teal-400" />
            <span>{formattedTime}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Calendar size={13} />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Live HiveMQ MQTT Status Pill */}
        <button
          onClick={() => setIsMqttModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
          title="HiveMQ MQTT Broker Connected (Click for live inspector & test publisher)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>HiveMQ: Online</span>
        </button>

        {/* Notification Bell with Active Count */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Active clinical notifications"
          >
            <Bell size={18} />
            {activeAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-mono font-bold flex items-center justify-center shadow-sm alert-pulse-red">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Quick Notifications Dropdown */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 p-3 rounded-2xl clinical-card z-50 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" />
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Active Clinical Alerts ({activeAlertsCount})
                  </span>
                </div>
                <Link
                  to="/alerts"
                  onClick={() => setIsAlertsOpen(false)}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
                >
                  View full log →
                </Link>
              </div>

              {activeAlertsList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto mb-1.5 text-teal-500 opacity-80" />
                  No unacknowledged alerts. All 6 beds normal.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activeAlertsList.map((alert) => (
                    <div
                      key={alert.alertId}
                      className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold font-mono text-red-600 dark:text-red-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                          {alert.bedId} · {alert.alertType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {alert.detectedAt.split(" ")[1]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        {alert.babyName} — Value:{" "}
                        <strong className="text-red-600 dark:text-red-400 font-mono">
                          {alert.readingValue}
                        </strong>{" "}
                        ({alert.threshold})
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          Assigned: {alert.assignedStaff}
                        </span>
                        <button
                          onClick={() => acknowledgeAlert(alert.alertId)}
                          className="px-2 py-0.5 text-[11px] font-medium bg-red-600 hover:bg-red-700 text-white rounded-md shadow-xs transition-colors"
                        >
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>


        {/* Signed-in Staff Profile with Switcher */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 pl-1.5 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-lg object-cover ring-1 ring-teal-500/40"
            />
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {currentUser.shortName}
              </div>
              <div className="text-[10px] font-mono text-teal-600 dark:text-teal-400 leading-none">
                {currentUser.role}
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 p-3 rounded-2xl clinical-card z-50 shadow-2xl border border-slate-200 dark:border-slate-800">
              {/* Current user info */}
              <div className="px-2 py-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src={currentUser?.avatar}
                    alt={currentUser?.name}
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-teal-500/30"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {currentUser?.name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield size={10} className="text-teal-600" />
                      <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-semibold">
                        {currentUser?.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role badge */}
              <div className="px-2 py-1.5 mb-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Permissions</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  {currentUser?.role === "Administrator" && "Full system access · All features"}
                  {currentUser?.role === "Doctor" && "Patient care · Alert resolution · Threshold changes"}
                  {currentUser?.role === "Nurse" && "Bedside care · Alert acknowledgement · Notes"}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate("/settings");
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 mb-1"
                >
                  System Settings →
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 font-semibold"
                >
                  <LogOut size={12} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ── Modal: HiveMQ MQTT Telemetry Inspector & Tester ── */}
      {isMqttModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Radio size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    HiveMQ MQTT Telemetry Inspector
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time broker connection status &amp; interactive ESP32 telemetry test tool
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMqttModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Connection Status Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 animate-pulse flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Connected to broker.hivemq.com (Port 1883)
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Backend subscriber is actively listening to wildcard topic:{" "}
                    <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 font-bold">
                      nicu/telemetry/#
                    </code>
                  </div>
                </div>
              </div>

              {/* Topic Directory */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned Beds &amp; HiveMQ Topics:
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {(beds || []).slice(0, 6).map((b) => (
                    <div key={b.bedId} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-600">{b.bedId}</span>
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[130px]">{b.babyName}</span>
                      </div>
                      <code className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 select-all">
                        nicu/telemetry/{b.deviceId || `ESP32-${b.bedId}`}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1-Click Interactive Test Publisher */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>1-Click Interactive HiveMQ Test Publisher:</span>
                  <span className="text-[10px] font-mono text-teal-600 font-normal">Simulate ESP32 Packet</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Target Bed:
                    </label>
                    <select
                      value={mqttTestBed}
                      onChange={(e) => {
                        setMqttTestBed(e.target.value);
                        const b = (beds || []).find((x) => x.bedId === e.target.value);
                        if (b?.deviceId) setMqttTestDevice(b.deviceId);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                    >
                      {(beds || []).map((b) => (
                        <option key={b.bedId} value={b.bedId}>
                          {b.bedId} ({b.babyName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Device ID:
                    </label>
                    <input
                      type="text"
                      value={mqttTestDevice}
                      onChange={(e) => setMqttTestDevice(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Sends live HR, SpO₂, and Temp via HiveMQ
                  </span>
                  <button
                    type="button"
                    onClick={handlePublishTestMqtt}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Publish Test Vitals</span>
                  </button>
                </div>

                {mqttTestStatus && (
                  <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    {mqttTestStatus}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMqttModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

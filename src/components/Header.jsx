// =============================================================
// Header.jsx — Clinical Command Center Top Header
// Modern Clinical White & Blue Design System
// Includes Unit Branding, Live Clock, Global Bed Search,
// Notification Bell with Alert Dropdown, Theme Toggle,
// and Clinical Role Switcher (Doctor, Nurse, Admin, Family Portal).
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
  Activity,
  HeartPulse,
  Stethoscope,
  Baby,
  Volume2,
  VolumeX,
  ClipboardList,
  Printer,
  Copy,
  Sparkles,
} from "lucide-react";
import { useApp, ROLES } from "../context/AppContext";
import { api } from "../services/api";

const PRESET_USERS = [
  {
    id: "DOC-01",
    name: "Dr. Meera Vasudevan",
    shortName: "Dr. Meera",
    role: "Doctor",
    username: "dr.meera",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "NUR-01",
    name: "Nurse Priya Thomas",
    shortName: "Nurse Priya",
    role: "Nurse",
    username: "nurse.priya",
    avatar: "https://images.unsplash.com/photo-1594824813576-96b610c144a1?w=150&auto=format&fit=crop&q=80",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "ADMIN-01",
    name: "System Administrator",
    shortName: "Admin",
    role: "Administrator",
    username: "admin",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

export default function Header() {
  const navigate = useNavigate();
  const {
    theme,
    toggleTheme,
    currentUser,
    setCurrentUser,
    logout,
    activeAlertsCount = 0,
    activeAlertsList = [],
    acknowledgeAlert,
    searchQuery,
    setSearchQuery,
    beds = [],
    patients = [],
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMqttModalOpen, setIsMqttModalOpen] = useState(false);
  const [isSbarOpen, setIsSbarOpen] = useState(false);
  const [sbarCopied, setSbarCopied] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState(0);

  const [mqttTestBed, setMqttTestBed] = useState("NICU-01");
  const [mqttTestDevice, setMqttTestDevice] = useState("ESP32-NICU-01");
  const [mqttTestStatus, setMqttTestStatus] = useState(null);

  // Soft Clinical Alarm Chime Synthesizer
  const playClinicalChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(1318.5, ctx.currentTime);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext locked or unsupported
    }
  };

  // 120s Clinical Alarm Silence Countdown
  useEffect(() => {
    if (silenceCountdown <= 0) return;
    const interval = setInterval(() => {
      setSilenceCountdown((prev) => {
        if (prev <= 1) {
          setIsAudioMuted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [silenceCountdown]);

  const toggleSilenceAlarms = () => {
    if (silenceCountdown > 0) {
      setSilenceCountdown(0);
      setIsAudioMuted(false);
    } else {
      setSilenceCountdown(120);
      setIsAudioMuted(true);
    }
  };

  const handlePublishTestMqtt = async () => {
    setMqttTestStatus("Broadcasting live telemetry to broker.hivemq.com:1883...");
    try {
      const res = await api.testPublishMqtt({
        deviceId: mqttTestDevice,
        bedId: mqttTestBed,
        heartRate: Math.floor(Math.random() * 20) + 135,
        spo2: Math.floor(Math.random() * 3) + 97,
        temperature: +(36.7 + Math.random() * 0.4).toFixed(1),
      });
      setMqttTestStatus("Success! Packet ingested over MQTT & Bed telemetry updated.");
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

  const handleSwitchUser = (user) => {
    sessionStorage.setItem("nicu_user", JSON.stringify(user));
    setCurrentUser(user);
    setIsProfileOpen(false);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-4 lg:px-6 transition-colors duration-200"
      style={{
        backgroundColor: "var(--header-bg)",
        borderBottom: "1px solid var(--header-border)",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* ── Left: Unit Branding & Name ── */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 text-decoration-none">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20">
            NC
          </div>
          <div className="hidden sm:block">
            <div className="text-[14px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1.5">
              <span>NeoCare</span>
              <span className="text-[10px] font-mono text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                LEVEL-III NICU
              </span>
            </div>
            <div className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
              Continuous Vital Monitoring Command Center
            </div>
          </div>
        </Link>
      </div>

      {/* ── Right Controls: Clock, HiveMQ status, Alerts, Theme, Profile ── */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Live Date & Time Indicator */}
        <div className="hidden xl:flex items-center gap-3 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
            <Clock size={13} className="text-blue-600" />
            <span>{formattedTime}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Calendar size={13} />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* SBAR Shift Handoff Trigger */}
        <button
          onClick={() => setIsSbarOpen(true)}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
          title="Open SBAR Clinical Shift Handoff Protocol"
        >
          <ClipboardList size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>SBAR Handoff</span>
        </button>

        {/* Live HiveMQ MQTT Status Pill */}
        <button
          onClick={() => setIsMqttModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
          title="HiveMQ MQTT Broker Connected (Click to inspect or send test telemetry)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>HiveMQ: Online</span>
        </button>

        {/* Clinical Alarm Audible Chime & Mute Controller (IEC 60601-1-8 Standard) */}
        <button
          onClick={toggleSilenceAlarms}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            isAudioMuted || silenceCountdown > 0
              ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
              : activeAlertsCount > 0
              ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
          }`}
          title={
            silenceCountdown > 0
              ? `Alarms silenced for ${silenceCountdown}s. Click to unmute.`
              : "Click to Silence / Pause audible alarms (120s IEC standard pause)"
          }
        >
          {isAudioMuted || silenceCountdown > 0 ? (
            <>
              <VolumeX size={15} className="text-amber-600" />
              <span className="text-[11px]">
                {silenceCountdown > 0 ? `${silenceCountdown}s` : "Muted"}
              </span>
            </>
          ) : (
            <>
              <Volume2
                size={15}
                className={activeAlertsCount > 0 ? "text-rose-600 animate-bounce" : "text-slate-500"}
              />
              <span className="hidden sm:inline text-[11px]">Audio</span>
            </>
          )}
        </button>

        {/* Notification Bell with Active Count */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Active clinical alarms"
          >
            <Bell size={18} />
            {activeAlertsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-mono font-bold flex items-center justify-center shadow-xs alert-pulse-red">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Quick Notifications Dropdown */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 p-3.5 rounded-2xl clinical-card z-50 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-rose-600" />
                  <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                    Active Alarms ({activeAlertsCount})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={playClinicalChime}
                    className="text-[11px] text-slate-500 hover:text-blue-600 font-semibold"
                    title="Test audible medical chime"
                  >
                    Test Chime
                  </button>
                  <Link
                    to="/alerts"
                    onClick={() => setIsAlertsOpen(false)}
                    className="text-xs text-blue-600 hover:underline font-bold"
                  >
                    View log →
                  </Link>
                </div>
              </div>

              {(activeAlertsList || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto mb-1.5 text-emerald-500 opacity-80" />
                  No active alarms. All stations nominal.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(activeAlertsList || []).map((alert) => (
                    <div
                      key={alert.alertId}
                      className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold font-mono text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                          {alert.bedId} · {alert.alertType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {alert.detectedAt.split(" ")[1] || alert.detectedAt}
                        </span>
                      </div>
                      <div className="text-xs text-slate-800 dark:text-slate-200">
                        {alert.babyName} — Value:{" "}
                        <strong className="text-rose-700 font-mono font-bold">
                          {alert.readingValue}
                        </strong>{" "}
                        ({alert.threshold})
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500">
                          Assigned: {alert.assignedStaff}
                        </span>
                        <button
                          onClick={() => acknowledgeAlert(alert.alertId)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
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

        {/* Theme Toggle (Light Modern White/Blue by Default vs Dark Mode) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${theme === "dark" ? "Modern Clinical Light (White & Blue)" : "Dark Shift Mode"}`}
        >
          {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
        </button>

        {/* Signed-in Staff Profile with One-Click Role Switcher */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 pl-1.5 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <img
              src={currentUser?.avatar}
              alt={currentUser?.name}
              className="w-7 h-7 rounded-lg object-cover ring-1 ring-blue-500/40"
            />
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {currentUser?.shortName}
              </div>
              <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold leading-none">
                {currentUser?.role}
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Profile & Role Switcher Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-72 p-3.5 rounded-2xl clinical-card z-50 shadow-2xl border border-slate-200 dark:border-slate-800">
              {/* Current user info */}
              <div className="px-2 py-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src={currentUser?.avatar}
                    alt={currentUser?.name}
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-blue-500/30"
                  />
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {currentUser?.name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield size={11} className="text-blue-600" />
                      <span className="text-[10.5px] font-mono text-blue-700 dark:text-blue-400 font-bold">
                        {currentUser?.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* One-Click Role Switcher Section */}
              <div className="mb-2">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 px-2">
                  Switch Active Role Flow:
                </span>
                <div className="space-y-1">
                  {PRESET_USERS.map((u) => {
                    const isActive = currentUser?.username === u.username;
                    return (
                      <button
                        key={u.username}
                        onClick={() => handleSwitchUser(u)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-700"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-md object-cover" />
                          <span className="truncate">{u.shortName}</span>
                        </div>
                        <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono ${u.badgeColor}`}>
                          {u.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate("/settings");
                  }}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Settings
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── HiveMQ MQTT Live Telemetry Inspector Modal ── */}
      {isMqttModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Radio size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    HiveMQ MQTT Public Telemetry Broker
                  </h3>
                  <p className="text-[11px] text-slate-500">Live ESP32 telemetry ingestion pipeline</p>
                </div>
              </div>
              <button
                onClick={() => setIsMqttModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Broker Address:</span>
                  <strong className="text-slate-900 dark:text-slate-100">broker.hivemq.com:1883</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subscribed Topic:</span>
                  <strong className="text-blue-600">nicu/telemetry/#</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">QoS Level:</span>
                  <span>QoS 0 (At most once, Real-time)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Broadcast Live Test Sensor Packet:
                </label>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <input
                    type="text"
                    value={mqttTestDevice}
                    onChange={(e) => setMqttTestDevice(e.target.value)}
                    placeholder="Device ID (ESP32-NICU-01)"
                    className="p-2 border border-slate-300 rounded-xl text-xs bg-slate-50 font-mono"
                  />
                  <select
                    value={mqttTestBed}
                    onChange={(e) => setMqttTestBed(e.target.value)}
                    className="p-2 border border-slate-300 rounded-xl text-xs bg-slate-50 font-mono"
                  >
                    {beds.map((b) => (
                      <option key={b.bedId} value={b.bedId}>{b.bedId}</option>
                    ))}
                  </select>
                </div>
              </div>

              {mqttTestStatus && (
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-mono font-semibold border border-blue-200">
                  {mqttTestStatus}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsMqttModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handlePublishTestMqtt}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={13} />
                <span>Publish Sensor Packet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clinical SBAR Shift Handoff Protocol Modal (New Clinical Feature) ── */}
      {isSbarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-xs">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Clinical SBAR Shift Handoff Report</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Standard IEC Protocol
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compiled for {currentUser?.name || "Staff"} · {formattedDate} {formattedTime}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSbarOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - SBAR Sections */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* S: Situation */}
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300 text-xs mb-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[11px] font-mono">
                    S
                  </span>
                  <span>Situation (Unit Status & Census)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900">
                    <div className="text-[10px] text-slate-500">Active Stations</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {beds.filter((b) => b.status === "Monitoring" || b.status === "Warning").length} / {beds.length}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900">
                    <div className="text-[10px] text-slate-500">Active Alarms</div>
                    <div className={`text-sm font-bold ${activeAlertsCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {activeAlertsCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900">
                    <div className="text-[10px] text-slate-500">Standby Bays</div>
                    <div className="text-sm font-bold text-blue-600">
                      {beds.filter((b) => b.status === "Standby").length}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900">
                    <div className="text-[10px] text-slate-500">Shift Lead</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {currentUser?.shortName || "Dr. Meera"}
                    </div>
                  </div>
                </div>
              </div>

              {/* B: Background */}
              <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-xs mb-2">
                  <span className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center text-[11px] font-mono">
                    B
                  </span>
                  <span>Background (Patient Clinical Registry)</span>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {beds.filter((b) => b.babyName && b.status !== "Standby").length === 0 ? (
                    <div className="text-slate-400 text-center py-2">No active neonatal patients assigned.</div>
                  ) : (
                    beds
                      .filter((b) => b.babyName && b.status !== "Standby")
                      .map((b) => (
                        <div
                          key={b.bedId}
                          className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-900 text-xs"
                        >
                          <div>
                            <strong className="text-slate-900 dark:text-slate-100">{b.babyName}</strong>
                            <span className="text-[11px] text-slate-500 ml-2">({b.bedId} · Mother: {b.motherName || "N/A"})</span>
                          </div>
                          <span className="font-mono text-[11px] text-amber-700 dark:text-amber-300 font-semibold truncate max-w-[200px]">
                            {b.diagnosis || "Prematurity"}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* A: Assessment */}
              <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 text-xs mb-2">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[11px] font-mono">
                    A
                  </span>
                  <span>Assessment (Physiological Vital Status)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {beds
                    .filter((b) => b.babyName && b.status !== "Standby")
                    .map((b) => (
                      <div
                        key={b.bedId}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{b.bedId}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className={b.hr && (b.hr < 100 || b.hr > 170) ? "text-rose-600 font-bold" : "text-slate-600 dark:text-slate-300"}>
                            HR: {b.hr || "--"} bpm
                          </span>
                          <span className={b.spo2 && b.spo2 < 90 ? "text-rose-600 font-bold" : "text-blue-600 font-bold"}>
                            SpO₂: {b.spo2 || "--"}%
                          </span>
                          <span className="text-amber-600 font-semibold">
                            {b.temperature ? `${b.temperature}°C` : "--"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* R: Recommendation */}
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20">
                <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300 text-xs mb-2">
                  <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center text-[11px] font-mono">
                    R
                  </span>
                  <span>Recommendation & Action Directives</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-xs">
                  <li>Maintain continuous arterial PPG pulse oximetry monitoring on all active neonates.</li>
                  <li>Verify terminal decontamination on any vacated bed slots prior to new admissions.</li>
                  <li>Audit ESP32 wireless sensor battery levels (keep above 25% threshold).</li>
                  <li>Perform scheduled 2-hour feeding and thermal incubator probe calibrations.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                IEC 62304 / ISO 13485 Clinical Handoff Form
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = `=== NICU CLINICAL SBAR SHIFT HANDOFF ===
Date: ${formattedDate} ${formattedTime}
Attending: ${currentUser?.name || "Staff"} (${currentUser?.role || "Nurse"})
Active Stations: ${beds.filter((b) => b.status === "Monitoring" || b.status === "Warning").length}/${beds.length}
Active Alarms: ${activeAlertsCount}
Standby Bays: ${beds.filter((b) => b.status === "Standby").length}

[PATIENTS]
${beds
  .filter((b) => b.babyName && b.status !== "Standby")
  .map((b) => `- ${b.bedId}: ${b.babyName} (GA: ${b.gestationalAge || "N/A"}, Dx: ${b.diagnosis || "N/A"}) | HR:${b.hr || "--"}, SpO2:${b.spo2 || "--"}%, Temp:${b.temperature || "--"}C`)
  .join("\n")}

[RECOMMENDATION]
- Ensure continuous telemetry on all bays
- Cleaned/Sanitized slots verified for new admissions`;
                    navigator.clipboard.writeText(text);
                    setSbarCopied(true);
                    setTimeout(() => setSbarCopied(false), 3000);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy size={13} />
                  <span>{sbarCopied ? "Copied to Clipboard!" : "Copy SBAR"}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print Shift Sheet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
